import { cookies } from "next/headers";
import { readSessionCookieValue } from "../../../lib/auth";
import { isAccountBlocked } from "../../../lib/admin";
import { pushNotification } from "../../../lib/conversations";
import { flushPendingPushNotifications, getAccountsWithPendingPushes } from "../../../lib/push";
import { normalizeDb } from "../../../lib/schema";
import { readStore, withStoreLock, writeStore } from "../../../lib/remote-store";

export const runtime = "nodejs";

function clampText(value, max = 4000) {
  return `${value || ""}`.trim().slice(0, max);
}

function addActivity(account, entry) {
  const db = normalizeDb(account.db, account);
  db.activity = [
    {
      id: crypto.randomUUID(),
      type: `${entry?.type || "event"}`.slice(0, 40),
      title: `${entry?.title || "Événement"}`.slice(0, 140),
      detail: `${entry?.detail || ""}`.slice(0, 240),
      createdAt: new Date().toISOString(),
    },
    ...(Array.isArray(db.activity) ? db.activity : []),
  ].slice(0, 120);
  account.db = db;
}

function buildAttendee(account, status = "pending") {
  const db = normalizeDb(account.db, account);
  return {
    uid: account.uid,
    name: account.name,
    email: account.email,
    username: db.profile?.username || "",
    phone: db.profile?.phoneVisible ? db.profile?.phone || "" : "",
    photoUrl: db.profile?.photoUrl || "",
    status,
  };
}

function createEventRecord({
  id,
  ownerUid,
  title,
  desc,
  date,
  time,
  endTime,
  color,
  participantIds,
  attendees,
  links,
}) {
  return {
    id,
    sharedEventId: id,
    createdBy: ownerUid,
    title,
    desc,
    date,
    time,
    endTime,
    color,
    createdAt: new Date().toISOString(),
    participantIds,
    attendees,
    links: links && typeof links === "object" ? links : { contacts: [], conversations: [], events: [], bookmarks: [], notes: [] },
  };
}

function getEventIdentity(event, fallback = "") {
  return `${event?.sharedEventId || event?.id || fallback || ""}`.trim();
}

function findEventIndex(events, eventId) {
  return events.findIndex((event) => getEventIdentity(event) === eventId);
}

function sanitizeLinks(input) {
  return input && typeof input === "object"
    ? input
    : { contacts: [], conversations: [], events: [], bookmarks: [], notes: [] };
}

function buildAttendeesFromAccounts(accounts, attendeeStatus = new Map(), ownerUid = "") {
  return accounts.map((entry) => {
    const status = entry.uid === ownerUid
      ? "confirmed"
      : attendeeStatus.get(entry.uid) || "pending";
    return buildAttendee(entry, status);
  });
}

function updateEventRecord(event, values) {
  return {
    ...event,
    ...values,
    links: sanitizeLinks(values?.links ?? event?.links),
  };
}

function formatResponseLabel(status) {
  if (status === "confirmed") return "accepté";
  if (status === "maybe") return "répondu peut-être à";
  return "refusé";
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);
    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = `${body?.action || ""}`;
    if (!["create-event", "update-event", "delete-event", "respond-event"].includes(action)) {
      return Response.json({ error: "Action inconnue" }, { status: 400 });
    }

    return await withStoreLock(async () => {
    const store = await readStore();
    const account = store.users.find((entry) => entry.uid === session.uid);
    const flushPendingPushes = async () => flushPendingPushNotifications(getAccountsWithPendingPushes(store));
      if (!account) {
        return Response.json({ error: "Compte introuvable" }, { status: 404 });
      }
      if (isAccountBlocked(account)) {
        return Response.json({ error: "Compte bloqué" }, { status: 423 });
      }
      account.lastSeenAt = new Date().toISOString();

      if (action === "create-event") {
        const title = clampText(body?.title, 180);
        const desc = clampText(body?.desc, 4000);
        const date = clampText(body?.date, 20);
        const time = clampText(body?.time, 20) || "09:00";
        const endTime = clampText(body?.endTime, 20) || time;
        const color = clampText(body?.color, 32) || "#c8a96e";
        const links = body?.links && typeof body.links === "object" ? body.links : undefined;
        const inviteeIds = Array.isArray(body?.participantIds) ? body.participantIds.map((item) => `${item}`) : [];

        if (!title || !date) {
          return Response.json({ error: "Titre et date requis" }, { status: 400 });
        }

        const requestedParticipantIds = [...new Set([session.uid, ...inviteeIds])].filter(Boolean).slice(0, 12);
        const accounts = requestedParticipantIds
          .map((uid) => store.users.find((entry) => entry.uid === uid))
          .filter(Boolean);
        const participantIds = accounts.map((entry) => entry.uid);
        const attendeeStatus = new Map(accounts.map((entry) => [entry.uid, entry.uid === session.uid ? "confirmed" : "pending"]));
        const attendees = buildAttendeesFromAccounts(accounts, attendeeStatus, session.uid);
        const eventId = crypto.randomUUID();

        accounts.forEach((target) => {
          const targetDb = normalizeDb(target.db, target);
          targetDb.events = [
            createEventRecord({
              id: eventId,
              ownerUid: session.uid,
              title,
              desc,
              date,
              time,
              endTime,
              color,
              participantIds,
              attendees,
              links,
            }),
            ...targetDb.events.filter((event) => event.id !== eventId),
          ];
          target.db = targetDb;
        });

        addActivity(account, {
          type: "event",
          title: "Événement créé",
          detail: inviteeIds.length ? `${title} · ${inviteeIds.length} invité(s)` : `${title} · ${date}`,
        });

        accounts.forEach((target) => {
          if (target.uid === session.uid) return;
          addActivity(target, {
            type: "event",
            title: "Invitation calendrier",
            detail: `${account.name} vous a invité à ${title}.`,
          });
          pushNotification(target, {
            type: "event",
            title,
            detail: `${account.name} vous a invité à ${title}.`,
            href: "calendar",
            entityId: eventId,
          });
        });

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({
          db: normalizeDb(account.db, account),
          eventId,
          invitedCount: Math.max(0, participantIds.length - 1),
        });
      }

      const requestedEventId = clampText(body?.eventId, 80);
      if (!requestedEventId) {
        return Response.json({ error: "Événement introuvable" }, { status: 400 });
      }

      const currentDb = normalizeDb(account.db, account);
      const currentEvent = currentDb.events.find((event) => getEventIdentity(event) === requestedEventId);
      if (!currentEvent) {
        return Response.json({ error: "Événement introuvable" }, { status: 404 });
      }

      const sharedEventId = getEventIdentity(currentEvent, requestedEventId);
      const ownerUid = currentEvent.createdBy || session.uid;
      const participantIds = [...new Set((currentEvent.participantIds || []).filter(Boolean))];
      const effectiveParticipantIds = participantIds.length ? participantIds : [ownerUid];
      const accounts = effectiveParticipantIds
        .map((uid) => store.users.find((entry) => entry.uid === uid))
        .filter(Boolean);
      const eventOwner = store.users.find((entry) => entry.uid === ownerUid) || account;

      if (action === "update-event") {
        if (ownerUid !== session.uid) {
          return Response.json({ error: "Seul le créateur peut modifier cet événement" }, { status: 403 });
        }

        const title = clampText(body?.title, 180);
        const desc = clampText(body?.desc, 4000);
        const date = clampText(body?.date, 20);
        const time = clampText(body?.time, 20) || "09:00";
        const endTime = clampText(body?.endTime, 20) || time;
        const color = clampText(body?.color, 32) || "#c8a96e";
        const links = body?.links && typeof body.links === "object" ? body.links : currentEvent.links;

        if (!title || !date) {
          return Response.json({ error: "Titre et date requis" }, { status: 400 });
        }

        const attendeeStatus = new Map((currentEvent.attendees || []).map((entry) => [entry.uid, entry.status || "pending"]));
        const attendees = buildAttendeesFromAccounts(accounts, attendeeStatus, session.uid);

        accounts.forEach((target) => {
          const targetDb = normalizeDb(target.db, target);
          const index = findEventIndex(targetDb.events, sharedEventId);
          if (index < 0) return;
          targetDb.events[index] = updateEventRecord(targetDb.events[index], {
            title,
            desc,
            date,
            time,
            endTime,
            color,
            participantIds: effectiveParticipantIds,
            attendees,
            links,
          });
          target.db = targetDb;
        });

        addActivity(account, {
          type: "event",
          title: "Événement modifié",
          detail: `${title} · ${date}`,
        });

        accounts.forEach((target) => {
          if (target.uid === session.uid) return;
          addActivity(target, {
            type: "event",
            title: "Invitation mise à jour",
            detail: `${account.name} a mis à jour ${title}.`,
          });
          pushNotification(target, {
            type: "event",
            title,
            detail: `${account.name} a mis à jour cet événement.`,
            href: "calendar",
            entityId: sharedEventId,
          });
        });

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ db: normalizeDb(account.db, account), eventId: sharedEventId });
      }

      if (action === "delete-event") {
        if (ownerUid !== session.uid) {
          return Response.json({ error: "Seul le créateur peut supprimer cet événement" }, { status: 403 });
        }

        accounts.forEach((target) => {
          const targetDb = normalizeDb(target.db, target);
          targetDb.events = targetDb.events.filter((event) => getEventIdentity(event) !== sharedEventId);
          target.db = targetDb;
        });

        addActivity(account, {
          type: "event",
          title: "Événement supprimé",
          detail: currentEvent.title || "Événement partagé",
        });

        accounts.forEach((target) => {
          if (target.uid === session.uid) return;
          addActivity(target, {
            type: "event",
            title: "Événement annulé",
            detail: `${account.name} a annulé ${currentEvent.title}.`,
          });
          pushNotification(target, {
            type: "event",
            title: currentEvent.title,
            detail: `${account.name} a annulé cet événement.`,
            href: "calendar",
            entityId: sharedEventId,
          });
        });

        await writeStore(store);
        await flushPendingPushes();
        return Response.json({ db: normalizeDb(account.db, account), eventId: sharedEventId });
      }

      const nextStatus = clampText(body?.status, 20).toLowerCase();
      if (!["confirmed", "maybe", "declined"].includes(nextStatus)) {
        return Response.json({ error: "Réponse invalide" }, { status: 400 });
      }

      accounts.forEach((target) => {
        const targetDb = normalizeDb(target.db, target);
        const index = findEventIndex(targetDb.events, sharedEventId);
        if (index < 0) return;
        targetDb.events[index] = updateEventRecord(targetDb.events[index], {
          attendees: (targetDb.events[index].attendees || []).map((entry) => (
            entry.uid === session.uid ? { ...entry, status: nextStatus } : entry
          )),
        });
        target.db = targetDb;
      });

      addActivity(account, {
        type: "event",
        title: "Réponse invitation",
        detail: `${currentEvent.title} · ${nextStatus === "confirmed" ? "accepté" : nextStatus === "maybe" ? "peut-être" : "refusé"}`,
      });

      if (eventOwner.uid !== session.uid) {
        addActivity(eventOwner, {
          type: "event",
          title: "Réponse invitation",
          detail: `${account.name} a ${formatResponseLabel(nextStatus)} ${currentEvent.title}.`,
        });
        pushNotification(eventOwner, {
          type: "event",
          title: currentEvent.title,
          detail: `${account.name} a ${formatResponseLabel(nextStatus)} l'invitation.`,
          href: "calendar",
          entityId: sharedEventId,
        });
      }

      await writeStore(store);
      await flushPendingPushes();
      return Response.json({ db: normalizeDb(account.db, account), eventId: sharedEventId, status: nextStatus });
    });
  } catch (error) {
    return Response.json({ error: error.message || "Action calendrier impossible" }, { status: 500 });
  }
}
