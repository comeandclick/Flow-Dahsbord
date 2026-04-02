import { cookies } from "next/headers";
import { createSessionCookieValue, readOAuthStateToken, sessionCookieOptions } from "../../../../../lib/auth";
import { isAdminAccount } from "../../../../../lib/admin";
import { createEmptyDb } from "../../../../../lib/schema";
import { getAppBaseUrl, getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri, isGoogleAuthConfigured } from "../../../../../lib/google-auth";
import { readStore, withStoreLock, writeStore } from "../../../../../lib/remote-store";

export const runtime = "nodejs";

async function exchangeGoogleCode(request, code) {
  const body = new URLSearchParams();
  body.set("code", code);
  body.set("client_id", getGoogleClientId());
  body.set("client_secret", getGoogleClientSecret());
  body.set("redirect_uri", getGoogleRedirectUri(request));
  body.set("grant_type", "authorization_code");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || "Echange Google impossible");
  }
  return tokenPayload.access_token;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.email || !payload?.sub) {
    throw new Error(payload.error_description || payload.error || "Profil Google introuvable");
  }
  return payload;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "";
    const stateToken = url.searchParams.get("state") || "";
    const oauthError = url.searchParams.get("error") || "";

    if (!isGoogleAuthConfigured()) {
      return Response.redirect(new URL(`/`, request.url));
    }

    if (oauthError) {
      return Response.redirect(new URL(`/?authGoogle=cancelled`, request.url));
    }

    const state = readOAuthStateToken(stateToken);
    if (!state || state.provider !== "google") {
      return Response.redirect(new URL(`/?authGoogle=invalid-state`, request.url));
    }

    if (!code) {
      return Response.redirect(new URL(`/?authGoogle=missing-code`, request.url));
    }

    const accessToken = await exchangeGoogleCode(request, code);
    const profile = await fetchGoogleProfile(accessToken);

    const result = await withStoreLock(async () => {
      const store = await readStore();
      let account = store.users.find((entry) => `${entry.googleSub || ""}` === `${profile.sub}`);
      if (!account) {
        account = store.users.find((entry) => `${entry.email || ""}`.toLowerCase() === `${profile.email || ""}`.toLowerCase());
      }

      if (!account) {
        const now = new Date().toISOString();
        const db = createEmptyDb();
        db.profile = {
          ...db.profile,
          name: profile.name || profile.given_name || profile.email.split("@")[0],
          email: profile.email,
          fullName: profile.name || "",
          photoUrl: profile.picture || "",
        };
        account = {
          uid: crypto.randomUUID(),
          name: profile.name || profile.given_name || profile.email.split("@")[0],
          email: `${profile.email}`.toLowerCase(),
          hash: "",
          salt: "",
          passwordVersion: 0,
          status: "active",
          authProvider: "google",
          googleSub: profile.sub,
          loginCount: 1,
          createdAt: now,
          lastLoginAt: now,
          lastSeenAt: now,
          db,
        };
        store.users.push(account);
      } else {
        account.authProvider = account.authProvider || "google";
        account.googleSub = profile.sub;
        account.name = account.name || profile.name || profile.given_name || account.email;
        account.lastLoginAt = new Date().toISOString();
        account.lastSeenAt = account.lastLoginAt;
        account.loginCount = (Number(account.loginCount) || 0) + 1;
        account.db = {
          ...account.db,
          profile: {
            ...(account.db?.profile || {}),
            name: account.db?.profile?.name || account.name,
            email: account.email,
            fullName: account.db?.profile?.fullName || profile.name || "",
            photoUrl: account.db?.profile?.photoUrl || profile.picture || "",
          },
        };
      }

      await writeStore(store);
      return { user: { uid: account.uid, name: account.name, email: account.email }, admin: isAdminAccount(account, store) };
    });

    const cookieStore = await cookies();
    cookieStore.set("flow_session", createSessionCookieValue(result.user), sessionCookieOptions);

    const redirectUrl = new URL(state.returnTo || "/", getAppBaseUrl(request));
    redirectUrl.searchParams.set("authGoogle", "success");
    return Response.redirect(redirectUrl);
  } catch {
    return Response.redirect(new URL(`/?authGoogle=failed`, request.url));
  }
}
