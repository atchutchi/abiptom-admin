import { createClient } from "@/lib/supabase/server";
import { repairInternalUserFromAuth } from "@/lib/users/auth-link";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.warn("auth.session.unavailable", {
      reason: error ? "auth_error" : "missing_auth_user",
      code: error?.code,
      status: error?.status,
    });
    return { user: null, dbUser: null };
  }

  const dbUser = await repairInternalUserFromAuth({
    authUserId: user.id,
    email: user.email,
  });

  if (!dbUser?.activo) {
    console.warn("auth.session.unavailable", {
      reason: dbUser ? "inactive_profile" : "missing_profile",
    });
  }

  return { user, dbUser: dbUser?.activo ? dbUser : null };
}
