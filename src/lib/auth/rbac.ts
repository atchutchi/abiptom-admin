import type { UserRole } from "@/lib/db/schema";

// Rotas acessíveis por papel
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  ca: ["/admin", "/staff"],
  dg: ["/admin", "/staff"],
  coord: ["/admin/projects", "/admin/clients", "/admin/stock", "/admin/tasks", "/staff"],
  staff: ["/staff"],
};

// Rotas admin restritas a ca e dg
export const ADMIN_ONLY_ROUTES = [
  "/admin/users",
  "/admin/salary",
  "/admin/dividends",
  "/admin/settings",
  "/admin/reports",
  "/admin/expenses",
];

// Rotas restritas a ca
export const CA_ONLY_ROUTES = ["/admin/settings/policies"];

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role === "ca") return true;
  if (role === "dg") return !CA_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r))) return false;

  if (role === "coord") {
    return (
      pathname.startsWith("/admin/projects") ||
      pathname.startsWith("/admin/clients") ||
      pathname.startsWith("/admin/stock") ||
      pathname.startsWith("/admin/tasks") ||
      pathname.startsWith("/admin/invoices") ||
      pathname.startsWith("/staff")
    );
  }

  // staff: só /staff/*
  return pathname.startsWith("/staff");
}

export function getDefaultRoute(role: UserRole): string {
  if (role === "ca" || role === "dg") return "/admin/dashboard";
  if (role === "coord") return "/admin/projects";
  return "/staff/me/dashboard";
}
