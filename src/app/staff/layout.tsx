import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/layout/Sidebar";
import type { UserRole } from "@/lib/db/schema";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser) redirect("/login");

  const role = dbUser.role as UserRole;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userName={dbUser.nomeCurto} />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
