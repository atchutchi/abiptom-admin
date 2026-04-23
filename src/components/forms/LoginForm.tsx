"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginRedirectPath } from "@/lib/auth/redirects";
import type { UserRole } from "@/lib/db/schema";

type Step = "credentials" | "mfa";

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

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath = searchParams?.get("next") ?? null;
  const noticeMessage = getNoticeMessage(searchParams?.get("notice") ?? null);
  const queryErrorMessage = getQueryErrorMessage(
    searchParams?.get("error") ?? null
  );

  async function resolvePostLoginRedirect(fallbackRole: UserRole) {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    const response = await fetch(`/api/auth/post-login${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(
        body?.error ??
          "Sessão iniciada, mas a conta não está ligada à aplicação."
      );
    }

    const body = (await response.json()) as { redirectTo?: string };
    return body.redirectTo ?? getPostLoginRedirectPath(fallbackRole, nextPath);
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
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

      // Verificar se tem MFA activo
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f) => f.status === "verified");

      if (totpFactor) {
        // Iniciar challenge MFA
        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

        if (challengeError || !challenge) {
          setError("Erro ao iniciar verificação MFA.");
          return;
        }

        setFactorId(totpFactor.id);
        setChallengeId(challenge.id);
        setStep("mfa");
      } else {
        // Sem MFA — verificar papel e redirecionar
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const role = (user?.user_metadata?.role ?? "staff") as UserRole;
        router.push(await resolvePostLoginRedirect(role));
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o início de sessão."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: mfaCode.replace(/\s/g, ""),
      });

      if (verifyError) {
        setError("Código inválido ou expirado.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = (user?.user_metadata?.role ?? "staff") as UserRole;
      router.push(await resolvePostLoginRedirect(role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir o início de sessão."
      );
    } finally {
      setLoading(false);
    }
  }

  if (step === "mfa") {
    return (
      <form onSubmit={handleMfa} className="space-y-4">
        <div className="text-center space-y-1">
          <p className="font-medium text-gray-900">Verificação em dois passos</p>
          <p className="text-sm text-gray-500">
            Insere o código da tua aplicação autenticadora.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfaCode">Código de 6 dígitos</Label>
          <Input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9 ]*"
            maxLength={7}
            placeholder="000 000"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A verificar..." : "Verificar"}
        </Button>

        <button
          type="button"
          onClick={() => { setStep("credentials"); setError(""); }}
          className="w-full text-sm text-gray-500 hover:underline"
        >
          Voltar
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentials} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          onChange={(e) => setPassword(e.target.value)}
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
      {error && <p className="text-sm text-red-600">{error}</p>}

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
