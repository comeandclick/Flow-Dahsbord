import { getRequestContext, getAdminSpec, sanitizeAdminUser } from "../../../../lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { account, store } = await getRequestContext({ requireAdmin: true });
    return Response.json({
      authenticated: true,
      user: sanitizeAdminUser(account, store),
      permissions: getAdminSpec(account, store).permissions,
    });
  } catch {
    return Response.json({
      authenticated: false,
      user: null,
      permissions: [],
    });
  }
}
