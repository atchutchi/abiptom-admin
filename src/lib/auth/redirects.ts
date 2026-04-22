import { getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback: string
) {
  if (!path) {
    return fallback;
  }

  const candidate = path.trim();
  return isSafeInternalPath(candidate) ? candidate : fallback;
}

export function getPostLoginRedirectPath(
  role: UserRole,
  nextPath: string | null | undefined
) {
  return getSafeRedirectPath(nextPath, getDefaultRoute(role));
}
