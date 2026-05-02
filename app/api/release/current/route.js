import { RELEASE } from "../../../../lib/release";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    version: RELEASE.version,
    deployedAt: new Date().toISOString(),
    summary: RELEASE.summary,
    changes: RELEASE.changes,
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
