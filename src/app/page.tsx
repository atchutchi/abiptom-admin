import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

export default async function RootPage() {
  const { user, dbUser } = await getCurrentUser();
  if (!user) redirect("/login");

  const role = (dbUser?.role ?? "staff") as UserRole;
  redirect(getDefaultRoute(role));
}
