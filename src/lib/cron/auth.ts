import type { NextRequest } from "next/server";

export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Em desenvolvimento permitimos invocação sem segredo para facilitar testes locais.
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  return token === secret;
}
