import { createOAuthStateToken } from "../../../../../lib/auth";
import { buildGoogleAuthUrl, isGoogleAuthConfigured } from "../../../../../lib/google-auth";

export const runtime = "nodejs";

export async function GET(request) {
  const returnTo = new URL(request.url).searchParams.get("returnTo") || "/";

  if (!isGoogleAuthConfigured()) {
    return Response.redirect(new URL(returnTo, request.url));
  }

  const state = createOAuthStateToken("google", returnTo);
  return Response.redirect(buildGoogleAuthUrl(request, state));
}
