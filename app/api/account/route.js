import { cookies } from "next/headers";
import {
  createSessionCookieValue,
  hashPassword,
  readSessionCookieValue,
  sessionCookieOptions,
  verifyPassword,
} from "../../../lib/auth";
import { isAccountBlocked, isAdminAccount } from "../../../lib/admin";
import { normalizeDb } from "../../../lib/schema";
import { readStore, withStoreLock, writeStore } from "../../../lib/remote-store";

export const runtime = "nodejs";

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function trim(value, max = 180) {
  return `${value || ""}`.trim().slice(0, max);
}

function normalizeUsername(value) {
  return trim(value, 40).replace(/\s+/g, "").toLowerCase();
}

function isValidUsername(value) {
  return !value || /^[a-z0-9._-]{3,20}$/.test(value);
}

function normalizePhone(value) {
  const raw = trim(value, 30);
  if (!raw) return "";

  const normalized = raw.startsWith("+")
    ? `+${raw.slice(1).replace(/\D/g, "")}`
    : raw.replace(/\D/g, "");

  if (normalized.startsWith("00")) {
    return `+${normalized.slice(2)}`.slice(0, 20);
  }

  return normalized.slice(0, 20);
}

function isValidPhone(value) {
  return !value || /^\+?\d{6,15}$/.test(value);
}

function normalizePhotoUrl(value) {
  const raw = trim(value, 4_000_000);
  if (!raw) return "";
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionCookieValue(cookieStore.get("flow_session")?.value);

    if (!session) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { user, db } = await withStoreLock(async () => {
      const store = await readStore();
      const account = store.users.find((entry) => entry.uid === session.uid);

      if (!account) {
        const error = new Error("Compte introuvable");
        error.status = 404;
        throw error;
      }

      if (isAccountBlocked(account)) {
        const error = new Error("Compte bloqué");
        error.status = 423;
        throw error;
      }

      const nextName = trim(body?.name, 120) || account.name;
      const nextEmail = trim(body?.email, 180).toLowerCase() || account.email;
      const currentPassword = `${body?.currentPassword || ""}`;
      const newPassword = `${body?.newPassword || ""}`;
      const profilePatch = body?.profile && typeof body.profile === "object" ? body.profile : {};
      const nextUsername = normalizeUsername(profilePatch.username);
      const nextFullName = trim(profilePatch.fullName, 140);
      const nextPhone = normalizePhone(profilePatch.phone);
      const nextPhoneVisible = Boolean(profilePatch.phoneVisible);
      const nextPhotoUrl = normalizePhotoUrl(profilePatch.photoUrl);
      const currentProfile = account.db?.profile || {};
      const currentUsername = normalizeUsername(currentProfile.username);
      const currentFullName = trim(currentProfile.fullName, 140);
      const currentPhone = normalizePhone(currentProfile.phone);
      const currentPhoneVisible = Boolean(currentProfile.phoneVisible);
      const currentPhotoUrl = trim(currentProfile.photoUrl, 4_000_000);
      const sensitiveChange = nextEmail !== account.email || Boolean(newPassword);
      const changes = [];

      if (!nextName) {
        const error = new Error("Nom requis");
        error.status = 400;
        throw error;
      }

      if (!isEmail(nextEmail)) {
        const error = new Error("Email invalide");
        error.status = 400;
        throw error;
      }

      if (nextEmail !== account.email && store.users.some((entry) => entry.uid !== account.uid && entry.email === nextEmail)) {
        const error = new Error("Cet email est déjà utilisé");
        error.status = 409;
        throw error;
      }

      if (!isValidUsername(nextUsername)) {
        const error = new Error("Identifiant invalide : 3 à 20 caractères, lettres/chiffres/._-");
        error.status = 400;
        throw error;
      }

      if (nextUsername && store.users.some((entry) => entry.uid !== account.uid && normalizeUsername(entry.db?.profile?.username) === nextUsername)) {
        const error = new Error("Cet identifiant est déjà utilisé");
        error.status = 409;
        throw error;
      }

      if (!isValidPhone(nextPhone)) {
        const error = new Error("Numéro invalide : utilisez 6 à 15 chiffres, avec + optionnel");
        error.status = 400;
        throw error;
      }

      if (nextPhotoUrl === null) {
        const error = new Error("Photo invalide : utilisez une URL http/https ou une image locale");
        error.status = 400;
        throw error;
      }

      if (sensitiveChange) {
        const version = account.passwordVersion || 1;
        if (!currentPassword) {
          const error = new Error("Mot de passe actuel requis");
          error.status = 400;
          throw error;
        }
        if (!verifyPassword(currentPassword, account.salt, account.hash, version)) {
          const error = new Error("Mot de passe actuel incorrect");
          error.status = 401;
          throw error;
        }
      }

      if (newPassword && newPassword.length < 8) {
        const error = new Error("Nouveau mot de passe : 8 caractères minimum");
        error.status = 400;
        throw error;
      }

      account.name = nextName;
      account.email = nextEmail;
      if (nextName !== session.name) changes.push("profil");
      if (nextEmail !== session.email) changes.push("email");
      if (nextUsername !== currentUsername) changes.push("identifiant");
      if (nextFullName !== currentFullName) changes.push("nom complet");
      if (nextPhone !== currentPhone) changes.push("téléphone");
      if (nextPhoneVisible !== currentPhoneVisible) changes.push(nextPhoneVisible ? "téléphone visible" : "téléphone privé");
      if (nextPhotoUrl !== currentPhotoUrl) changes.push("photo");

      if (newPassword) {
        const upgraded = hashPassword(newPassword);
        account.hash = upgraded.hash;
        account.salt = upgraded.salt;
        account.passwordVersion = upgraded.passwordVersion;
        changes.push("mot de passe");
      }

      account.db = normalizeDb({
        ...account.db,
        profile: {
          ...(account.db?.profile || {}),
          ...profilePatch,
          username: nextUsername,
          fullName: nextFullName,
          phone: nextPhone,
          phoneVisible: nextPhoneVisible,
          photoUrl: nextPhotoUrl || "",
          name: nextName,
          email: nextEmail,
        },
      }, account);
      account.db.activity = [
        {
          id: crypto.randomUUID(),
          type: "account",
          title: changes.length ? `Compte mis à jour : ${changes.join(", ")}` : "Compte mis à jour",
          detail: `Profil synchronisé${nextUsername ? ` · @${nextUsername}` : ""}${nextPhoneVisible && nextPhone ? " · téléphone visible" : ""}.`,
          createdAt: new Date().toISOString(),
        },
        ...(Array.isArray(account.db.activity) ? account.db.activity : []),
      ].slice(0, 120);
      account.lastSeenAt = new Date().toISOString();

      await writeStore(store);
      return {
        user: { uid: account.uid, name: account.name, email: account.email },
        db: account.db,
        admin: isAdminAccount(account, store),
      };
    });

    cookieStore.set("flow_session", createSessionCookieValue(user), sessionCookieOptions);

    return Response.json({ ok: true, user, db, admin });
  } catch (error) {
    return Response.json({ error: error.message || "Mise à jour impossible" }, { status: error.status || 500 });
  }
}
