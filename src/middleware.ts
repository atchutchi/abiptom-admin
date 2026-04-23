import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { canAccessRoute, getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

const PUBLIC_ROUTES = [
  "/login",
  "/setup-mfa",
  "/forgot-password",
  "/update-password",
  "/auth/confirm",
];
const AUTH_REQUIRED_PREFIXES = ["/admin", "/staff"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas passam sempre
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return await (await import("@/lib/supabase/middleware")).updateSession(request).then(({ supabaseResponse }) => supabaseResponse);
  }

  const { supabaseResponse, supabase, user } = await updateSession(request);

  const isProtected = AUTH_REQUIRED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  if (!isProtected) return supabaseResponse;

  // Não autenticado → login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("role, activo, mfa_enabled")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const role = ((dbUser?.role as UserRole | undefined) ??
    user.user_metadata?.role ??
    "staff") as UserRole;
  const isActive = dbUser?.activo ?? (user.user_metadata?.active !== false);
  const mfaEnabled =
    dbUser?.mfa_enabled === true || user.user_metadata?.mfa_enabled === true;

  // Sem papel → login
  if (!role || !isActive) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // MFA obrigatório para ca e dg
  // Verifica user_metadata.mfa_enabled (marcado após verificação TOTP bem-sucedida)
  if (
    (role === "ca" || role === "dg") &&
    !mfaEnabled &&
    !pathname.startsWith("/setup-mfa")
  ) {
    return NextResponse.redirect(new URL("/setup-mfa", request.url));
  }

  // RBAC
  if (!canAccessRoute(role, pathname)) {
    const defaultRoute = getDefaultRoute(role);
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
