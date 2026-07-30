"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const INITIAL_STATE: AuthActionState = { error: "", success: "" };

function getQueryErrorMessage(errorCode: string | null) {
  if (errorCode === "invalid-link") {
    return "O link de recuperação é inválido ou já expirou. Pede um novo email.";
  }

  return "";
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );

  const queryError = getQueryErrorMessage(searchParams?.get("error") ?? null);

  return (
    <form action={formAction} className="space-y-4">
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

      {queryError ? <p className="text-sm text-red-600">{queryError}</p> : null}
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "A enviar..." : "Enviar link de recuperação"}
      </Button>

      <div className="text-center text-sm text-gray-500">
        <Link href="/login" className="hover:underline">
          Voltar ao login
        </Link>
      </div>
    </form>
  );
}
