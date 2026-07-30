"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const INITIAL_STATE: AuthActionState = { error: "", success: "" };

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
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  const nextPath = searchParams?.get("next") ?? null;
  const noticeMessage = getNoticeMessage(searchParams?.get("notice") ?? null);
  const queryErrorMessage = getQueryErrorMessage(
    searchParams?.get("error") ?? null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="utilizador@abiptom.gw"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Palavra-passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {noticeMessage ? (
        <p className="text-sm text-emerald-700">{noticeMessage}</p>
      ) : null}
      {!state.error && queryErrorMessage ? (
        <p className="text-sm text-red-600">{queryErrorMessage}</p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A iniciar sessão..." : "Iniciar sessão"}
      </Button>

      <div className="text-right text-sm text-gray-500">
        <Link href="/forgot-password" className="hover:underline">
          Esqueceste-te da palavra-passe?
        </Link>
      </div>
    </form>
  );
}
