import { redirect } from "next/navigation";
import { getRequestContext } from "../../../lib/admin";
import AdminLogin from "./AdminLogin";

export const metadata = {
  title: "Connexion Admin Flow",
  description: "Connexion sécurisée au dashboard administrateur Flow",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  try {
    await getRequestContext({ requireAdmin: true });
    redirect("/admin");
  } catch {}

  return <AdminLogin />;
}
