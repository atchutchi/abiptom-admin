import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { UserRole } from "@/lib/db/schema";
import { getAvatarUrl } from "@/lib/users/avatar";
import { getCurrentUser } from "@/lib/auth/actions";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, dbUser } = await getCurrentUser();
  if (!user) redirect("/login");

  if (!dbUser) redirect("/login");

  const role = dbUser.role as UserRole;
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
