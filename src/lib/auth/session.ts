import { createClient } from "@/lib/supabase/server";
import { repairInternalUserFromAuth } from "@/lib/users/auth-link";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, dbUser: null };

  const dbUser = await repairInternalUserFromAuth({
    authUserId: user.id,
    email: user.email,
  });

  return { user, dbUser: dbUser?.activo ? dbUser : null };
}
