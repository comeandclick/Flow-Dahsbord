import { redirect } from "next/navigation";
import AdminDashboard from "./AdminDashboard";
import { getRequestContext } from "../../lib/admin";

export const metadata = {
  title: "Flow Admin Dashboard",
  description: "Pilotage complet de Flow",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    await getRequestContext({ requireAdmin: true });
    return <AdminDashboard />;
  } catch {
    redirect("/admin/login");
  }
}
