import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withAuthenticatedDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await withAuthenticatedDb(user, async (db) =>
    db.query.users.findFirst({
      where: eq(users.authUserId, user.id),
    })
  );

  const role = (dbUser?.role ?? "staff") as UserRole;
  redirect(getDefaultRoute(role));
}
