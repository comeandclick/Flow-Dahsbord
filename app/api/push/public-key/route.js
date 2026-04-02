import { getPublicPushKey, isPushConfigured } from "../../../../lib/push";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    enabled: isPushConfigured(),
    publicKey: isPushConfigured() ? getPublicPushKey() : "",
  });
}
