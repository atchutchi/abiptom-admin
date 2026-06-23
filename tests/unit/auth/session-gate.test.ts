import { describe, expect, it } from "vitest";
import { resolveProtectedRouteAccess } from "@/lib/auth/session-gate";

describe("resolveProtectedRouteAccess", () => {
  it("redirecciona quando a sessão autenticada não tem utilizador interno", () => {
    const decision = resolveProtectedRouteAccess({
      hasUser: true,
      dbUser: null,
      pathname: "/admin/users",
      currentMfaLevel: "aal2",
    });

    expect(decision).toEqual({ action: "login" });
  });

  it("usa apenas o papel interno e ignora qualquer papel vindo dos metadados Auth", () => {
    const decision = resolveProtectedRouteAccess({
      hasUser: true,
      dbUser: { role: "staff", activo: true },
      pathname: "/admin/users",
      currentMfaLevel: "aal2",
      authMetadataRole: "ca",
    });

    expect(decision).toEqual({
      action: "redirect",
      destination: "/staff/me/dashboard",
    });
  });

  it("exige sessão aal2 para ca e dg em rotas protegidas", () => {
    const decision = resolveProtectedRouteAccess({
      hasUser: true,
      dbUser: { role: "ca", activo: true },
      pathname: "/admin/dashboard",
      currentMfaLevel: "aal1",
    });

    expect(decision).toEqual({ action: "setup-mfa" });
  });
});
