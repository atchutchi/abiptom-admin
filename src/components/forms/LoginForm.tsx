"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginRedirectPath } from "@/lib/auth/redirects";

function getNoticeMessage(code: string | null) {
  if (code === "password-reset-success") {
    return "Palavra-passe actualizada. Inicia sessão com as novas credenciais.";
  }

  return "";
}

function getQueryErrorMessage(code: string | null) {
  if (code === "auth-confirm") {
    return "Não foi possível validar o link de autenticação. Pede um novo email.";
  }

  return "";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams?.get("next") ?? null;
  const noticeMessage = getNoticeMessage(searchParams?.get("notice") ?? null);
  const queryErrorMessage = getQueryErrorMessage(
    searchParams?.get("error") ?? null,
  );

  async function resolvePostLoginRedirect() {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    const response = await fetch(`/api/auth/post-login${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        body?.error ??
          "Sessão iniciada, mas a conta não está ligada à aplicação.",
      );
    }

    const body = (await response.json()) as { redirectTo?: string };
    return body.redirectTo ?? getPostLoginRedirectPath("staff", nextPath);
  }

  async function handleCredentials(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError("Email ou palavra-passe incorrectos.");
        return;
      }

      router.push(await resolvePostLoginRedirect());
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o início de sessão.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCredentials} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="utilizador@abiptom.gw"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Palavra-passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {noticeMessage ? (
        <p className="text-sm text-emerald-700">{noticeMessage}</p>
      ) : null}
      {!error && queryErrorMessage ? (
        <p className="text-sm text-red-600">{queryErrorMessage}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "A iniciar sessão..." : "Iniciar sessão"}
      </Button>

      <div className="text-right text-sm text-gray-500">
        <Link href="/forgot-password" className="hover:underline">
          Esqueceste-te da palavra-passe?
        </Link>
      </div>
    </form>
  );
}
