import { canAccessRoute, getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

type InternalUserForAccess = {
  role: UserRole;
  activo: boolean;
};

type MfaLevel = string | null | undefined;

type ResolveProtectedRouteAccessInput = {
  hasUser: boolean;
  dbUser: InternalUserForAccess | null;
  pathname: string;
  currentMfaLevel?: MfaLevel;
  authMetadataRole?: unknown;
};

export type ProtectedRouteAccessDecision =
  | { action: "allow"; role: UserRole }
  | { action: "login" }
  | { action: "setup-mfa" }
  | { action: "redirect"; destination: string };

const MFA_REQUIRED_ROLES = new Set<UserRole>(["ca", "dg"]);

export function roleRequiresMfa(role: UserRole | null | undefined) {
  return role ? MFA_REQUIRED_ROLES.has(role) : false;
}

export function resolveProtectedRouteAccess({
  hasUser,
  dbUser,
  pathname,
  currentMfaLevel,
}: ResolveProtectedRouteAccessInput): ProtectedRouteAccessDecision {
  if (!hasUser || !dbUser || !dbUser.activo) {
    return { action: "login" };
  }

  const { role } = dbUser;

  if (
    roleRequiresMfa(role) &&
    currentMfaLevel !== "aal2" &&
    !pathname.startsWith("/setup-mfa")
  ) {
    return { action: "setup-mfa" };
  }

  if (!canAccessRoute(role, pathname)) {
    return { action: "redirect", destination: getDefaultRoute(role) };
  }

  return { action: "allow", role };
}
