import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User as InternalUser, UserRole } from "@/lib/db/schema";

type AuthUserLike = Pick<SupabaseUser, "id">;
type InternalUserLike = Pick<InternalUser, "id" | "role" | "activo">;

export type AuthorizationResult<
  AuthUser extends AuthUserLike = SupabaseUser,
  DbUser extends InternalUserLike = InternalUser,
> =
  | { success: true; user: AuthUser; dbUser: DbUser }
  | { success: false; error: "Não autenticado" | "Não autorizado" };

export function isRoleAllowed(
  role: UserRole,
  allowedRoles: readonly UserRole[],
): boolean {
  return allowedRoles.includes(role);
}

export function resolveAuthorization<
  AuthUser extends AuthUserLike,
  DbUser extends InternalUserLike,
>(
  context: { user: AuthUser | null; dbUser: DbUser | null },
  allowedRoles: readonly UserRole[],
): AuthorizationResult<AuthUser, DbUser> {
  const { user, dbUser } = context;

  if (!user || !dbUser || !dbUser.activo) {
    return { success: false, error: "Não autenticado" };
  }

  if (!isRoleAllowed(dbUser.role, allowedRoles)) {
    return { success: false, error: "Não autorizado" };
  }

  return { success: true, user, dbUser };
}

export async function authorizeRoles(
  allowedRoles: readonly UserRole[],
): Promise<AuthorizationResult> {
  const { getCurrentUser } = await import("@/lib/auth/session");
  const context = await getCurrentUser();

  return resolveAuthorization(context, allowedRoles);
}
