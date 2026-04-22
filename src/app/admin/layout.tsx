import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import type { UserRole } from "@/lib/db/schema";
import { getAvatarUrl } from "@/lib/users/avatar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await dbAdmin.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser) redirect("/login");

  const role = dbUser.role as UserRole;

  // staff não entra na área admin
  if (role === "staff") redirect("/staff/me/dashboard");

  const avatarUrl = await getAvatarUrl(dbUser.fotografiaUrl);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={dbUser.nomeCurto} userAvatarUrl={avatarUrl} />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
