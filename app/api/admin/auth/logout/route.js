import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE_NAME } from "../../../../../lib/admin";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
  return Response.json({ ok: true });
}
