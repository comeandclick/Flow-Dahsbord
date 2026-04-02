import { isEmailConfigured } from "../../../../lib/email";
import { isGoogleAuthConfigured } from "../../../../lib/google-auth";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    google: isGoogleAuthConfigured(),
    email: isEmailConfigured(),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
