import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveProtectedRouteAccess } from "@/lib/auth/session-gate";

const PUBLIC_ROUTES = [
  "/login",
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
    .select("role, activo")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const access = resolveProtectedRouteAccess({
    hasUser: true,
    dbUser: dbUser ?? null,
    pathname,
  });

  if (access.action === "login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (access.action === "redirect") {
    return NextResponse.redirect(new URL(access.destination, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
