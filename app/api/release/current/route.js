import { RELEASE } from "../../../../lib/release";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    version: RELEASE.version,
    deployedAt: RELEASE.deployedAt,
    summary: RELEASE.summary,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
