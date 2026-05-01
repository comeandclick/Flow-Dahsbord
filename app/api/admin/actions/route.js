import {
  appendAdminNotification,
  assertAdminPermission,
  buildAdminSpec,
  getRequestContext,
  sanitizeAdminUser,
} from "../../../../lib/admin";
import { hashPassword } from "../../../../lib/auth";
import { normalizeConversation } from "../../../../lib/conversations";
import { flushPendingPushNotifications, getAccountsWithPendingPushes } from "../../../../lib/push";
import { createEmptyDb, normalizeDb } from "../../../../lib/schema";
import { withStoreLock, writeStore } from "../../../../lib/remote-store";

export const runtime = "nodejs";

function buildTempPassword() {
  return `Flow-${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}!`;
}

function cleanupConversations(store, targetUid) {
  const next = [];

  for (const rawConversation of Array.isArray(store.conversations) ? store.conversations : []) {
    const conversation = normalizeConversation(rawConversation);
    if (!conversation.participantIds.includes(targetUid)) {
      next.push(conversation);
      continue;
    }

    const participantIds = conversation.participantIds.filter((uid) => uid !== targetUid);
    if (participantIds.length < 2) continue;

    next.push({
      ...conversation,
      participantIds,
      messages: conversation.messages.filter((message) => `${message?.senderId || ""}` !== targetUid),
      readState: Object.fromEntries(
        Object.entries(conversation.readState || {}).filter(([uid]) => uid !== targetUid),
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  store.conversations = next;
}

function cleanupEvents(users, targetUid) {
  users.forEach((entry) => {
    const db = normalizeDb(entry.db, entry);
    db.events = db.events
      .filter((event) => `${event?.createdBy || ""}` !== targetUid)
      .map((event) => ({
        ...event,
        participantIds: (event.participantIds || []).filter((uid) => uid !== targetUid),
        attendees: (event.attendees || []).filter((item) => `${item?.uid || ""}` !== targetUid),
      }))
      .filter((event) => (event.participantIds || []).length > 0);
    entry.db = db;
  });
}

function addAdminAudit(account, title, detail) {
  const db = normalizeDb(account.db, account);
  db.activity = [
    {
      id: crypto.randomUUID(),
      type: "admin",
      title: `${title || "Action admin"}`.slice(0, 140),
      detail: `${detail || ""}`.slice(0, 240),
      createdAt: new Date().toISOString(),
    },
    ...(Array.isArray(db.activity) ? db.activity : []),
  ].slice(0, 120);
  account.db = db;
}

function normalizePermissionInput(list) {
  return Array.isArray(list) ? list.map((item) => `${item}`).filter(Boolean) : [];
}

function resolveRecipients(store, account, target, body) {
  const recipientMode = `${body?.recipientMode || "single"}`;
  const users = Array.isArray(store.users) ? store.users : [];

  if (recipientMode === "single") {
    return target ? [target] : [];
  }

  if (recipientMode === "all") {
    return users.filter((entry) => entry.uid !== account.uid);
  }

  if (recipientMode === "active") {
    return users.filter((entry) => entry.uid !== account.uid && `${entry?.status || "active"}` === "active");
  }

  if (recipientMode === "blocked") {
    return users.filter((entry) => entry.uid !== account.uid && `${entry?.status || "active"}` === "blocked");
  }

  if (recipientMode === "admins") {
    return users.filter((entry) => entry.uid !== account.uid && entry?.admin?.enabled);
  }

  if (recipientMode.startsWith("plan:")) {
    const plan = recipientMode.split(":")[1] || "";
    return users.filter((entry) => (
      entry.uid !== account.uid
      && normalizeDb(entry.db, entry).subscription?.plan === plan
    ));
  }

  return [];
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = `${body?.action || ""}`;

    return await withStoreLock(async () => {
      const { account, store } = await getRequestContext({ requireAdmin: true });
      const flushPendingPushes = async () => flushPendingPushNotifications(getAccountsWithPendingPushes(store));
      const targetUid = `${body?.uid || ""}`;
      const target = store.users.find((entry) => entry.uid === targetUid);

      if (action === "notify") {
        assertAdminPermission(account, store, "messages.send");
        const title = `${body?.title || ""}`.trim().slice(0, 160);
        const detail = `${body?.detail || ""}`.trim().slice(0, 240);
        const type = `${body?.type || "admin"}`.trim().slice(0, 40) || "admin";
        const recipientMode = `${body?.recipientMode || "single"}`;
        const recipients = resolveRecipients(store, account, target, body);

        if (!title || !detail) {
          return Response.json({ error: "Titre et message requis" }, { status: 400 });
        }

        if (!recipients.length) {
          return Response.json({ error: "Destinataire introuvable" }, { status: 404 });
        }

        recipients.forEach((entry) => {
          appendAdminNotification(entry, {
            type,
            title,
            detail,
            href: "settings",
            activityTitle: "Message de l'administration",
            activityDetail: `${account.name} a envoyé: ${title}`,
          });
        });

        addAdminAudit(
          account,
          "Notification admin envoyée",
          `Audience: ${recipientMode} · ${recipients.length} destinataire(s) · ${title}`,
        );

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({
          ok: true,
          delivered: recipients.length,
        });
      }

      if (action === "create-admin") {
        assertAdminPermission(account, store, "admins.create");
        const name = `${body?.name || ""}`.trim().slice(0, 120);
        const email = `${body?.email || ""}`.trim().toLowerCase();
        const password = `${body?.password || ""}`.trim();
        const role = `${body?.role || "admin"}`;
        const permissions = normalizePermissionInput(body?.permissions);

        if (!name || !email || !password) {
          return Response.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
        }
        if (password.length < 8) {
          return Response.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
        }

        let created = store.users.find((entry) => entry.email === email);
        if (created) {
          created.admin = buildAdminSpec({ role, permissions, grantedBy: account.uid });
        } else {
          const upgraded = hashPassword(password);
          const user = {
            uid: crypto.randomUUID(),
            name,
            email,
            hash: upgraded.hash,
            salt: upgraded.salt,
            passwordVersion: upgraded.passwordVersion,
            status: "active",
            loginCount: 0,
            createdAt: new Date().toISOString(),
            lastLoginAt: "",
            lastSeenAt: "",
          };
          const db = createEmptyDb();
          db.profile = {
            ...db.profile,
            name,
            email,
            fullName: name,
          };
          created = { ...user, db, admin: buildAdminSpec({ role, permissions, grantedBy: account.uid }) };
          store.users.push(created);
        }

        addAdminAudit(account, "Administrateur créé", `${created.name} · ${created.email}`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, user: sanitizeAdminUser(created, store) });
      }

      if (action === "update-admin-permissions") {
        assertAdminPermission(account, store, "admins.manage");
        if (!target) {
          return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }
        const role = `${body?.role || "admin"}`;
        const permissions = normalizePermissionInput(body?.permissions);
        target.admin = buildAdminSpec({ role, permissions, grantedBy: account.uid });
        addAdminAudit(account, "Permissions admin mises à jour", `${target.name} · ${target.email} · rôle ${role}`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, user: sanitizeAdminUser(target, store) });
      }

      if (action === "update-report-status") {
        assertAdminPermission(account, store, "users.manage");
        const reportId = `${body?.reportId || ""}`;
        const nextStatus = `${body?.status || ""}` === "dismissed" ? "dismissed" : "resolved";
        const resolutionNote = `${body?.resolutionNote || ""}`.trim().slice(0, 240);
        const reports = Array.isArray(store.reports) ? store.reports : [];
        const report = reports.find((entry) => `${entry?.id || ""}` === reportId);

        if (!report) {
          return Response.json({ error: "Signalement introuvable" }, { status: 404 });
        }

        report.status = nextStatus;
        report.resolutionNote = resolutionNote;
        report.resolvedAt = new Date().toISOString();
        report.resolvedBy = account.uid;

        if (report.reporterId) {
          const reporter = store.users.find((entry) => entry.uid === report.reporterId);
          if (reporter) {
            appendAdminNotification(reporter, {
              type: "report",
              title: nextStatus === "dismissed" ? "Signalement classé sans suite" : "Signalement pris en compte",
              detail: resolutionNote || (nextStatus === "dismissed"
                ? "L'équipe Flow a classé votre signalement."
                : "L'équipe Flow a traité votre signalement."),
              href: "settings",
              activityTitle: "Retour sur signalement",
              activityDetail: report.reason || "Signalement Flow",
            });
          }
        }

        addAdminAudit(
          account,
          nextStatus === "dismissed" ? "Signalement classé" : "Signalement résolu",
          `${report.type || "report"} · ${report.reason || "sans motif"}${resolutionNote ? ` · ${resolutionNote}` : ""}`,
        );

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, reportId, status: nextStatus });
      }

      if (action === "toggle-fake-info") {
        const enabled = !Boolean(store.fakeInfoMode);
        store.fakeInfoMode = enabled;

        if (enabled) {
          const users = Array.isArray(store.users) ? store.users : [];
          users.forEach((accountEntry) => {
            appendAdminNotification(accountEntry, {
              type: "fake-info",
              title: "Mode fausse info activé",
              detail: "Les messages de test sont activés. Cliquez à nouveau pour désactiver.",
              href: "settings",
              activityTitle: "Mode fausse info activé",
              activityDetail: "Fausse info de test envoyée.",
            });
          });
          addAdminAudit(account, "Mode fausse info activé", `Mode activé pour ${users.length} comptes`);
        } else {
          const users = Array.isArray(store.users) ? store.users : [];
          users.forEach((accountEntry) => {
            const db = normalizeDb(accountEntry.db, accountEntry);
            db.notifications = (db.notifications || []).filter((item) => `${item?.type || ""}` !== "fake-info");
            accountEntry.db = db;
          });
          addAdminAudit(account, "Mode fausse info désactivé", "Fausse info retirée de tous les comptes");
        }

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, fakeInfoMode: store.fakeInfoMode });
      }

      if (!target) {
        return Response.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }

      if (action === "block") {
        assertAdminPermission(account, store, "accounts.block");
        target.status = "blocked";
        target.blockedAt = new Date().toISOString();
        target.blockedReason = `${body?.reason || ""}`.trim().slice(0, 180);
        appendAdminNotification(target, {
          type: "security",
          title: "Compte temporairement bloqué",
          detail: target.blockedReason || "Contactez l'administration pour plus d'informations.",
          href: "settings",
        });
        addAdminAudit(account, "Compte bloqué", `${target.name} · ${target.email} · ${target.blockedReason || "sans motif"}`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, user: sanitizeAdminUser(target, store) });
      }

      if (action === "unblock") {
        assertAdminPermission(account, store, "accounts.block");
        target.status = "active";
        target.blockedAt = "";
        target.blockedReason = "";
        appendAdminNotification(target, {
          type: "security",
          title: "Compte débloqué",
          detail: "Votre accès Flow a été réactivé.",
          href: "settings",
        });
        addAdminAudit(account, "Compte débloqué", `${target.name} · ${target.email}`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, user: sanitizeAdminUser(target, store) });
      }

      if (action === "reset-password") {
        assertAdminPermission(account, store, "accounts.reset_password");
        const nextPassword = `${body?.nextPassword || ""}`.trim() || buildTempPassword();
        if (nextPassword.length < 8) {
          return Response.json({ error: "Mot de passe trop court" }, { status: 400 });
        }

        const upgraded = hashPassword(nextPassword);
        target.hash = upgraded.hash;
        target.salt = upgraded.salt;
        target.passwordVersion = upgraded.passwordVersion;
        target.mustChangePassword = true;

        appendAdminNotification(target, {
          type: "security",
          title: "Mot de passe réinitialisé",
          detail: "Votre mot de passe a été réinitialisé par l'administration.",
          href: "settings",
        });
        addAdminAudit(account, "Mot de passe réinitialisé", `${target.name} · ${target.email} · rotation forcée`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, user: sanitizeAdminUser(target, store), temporaryPassword: nextPassword });
      }

      if (action === "delete-user") {
        assertAdminPermission(account, store, "accounts.delete");
        if (target.uid === account.uid) {
          return Response.json({ error: "Impossible de supprimer votre propre compte admin" }, { status: 400 });
        }

        target.status = "blocked";
        target.blockedAt = new Date().toISOString();
        target.blockedReason = "archived_by_admin";
        target.archivedAt = target.blockedAt;
        target.archivedBy = account.uid;
        appendAdminNotification(target, {
          type: "security",
          title: "Compte archivé",
          detail: "Votre compte a été archivé par l'administration. Contactez le support Flow pour réactivation.",
          href: "settings",
        });
        addAdminAudit(account, "Compte archivé", `${target.name} · ${target.email}`);
        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ ok: true, archivedUid: target.uid, user: sanitizeAdminUser(target, store) });
      }

      return Response.json({ error: "Action inconnue" }, { status: 400 });
    });
  } catch (error) {
    return Response.json({ error: error.message || "Action admin impossible" }, { status: error.status || 500 });
  }
}
