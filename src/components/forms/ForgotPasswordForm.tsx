"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

function getQueryErrorMessage(errorCode: string | null) {
  if (errorCode === "invalid-link") {
    return "O link de recuperação é inválido ou já expirou. Pede um novo email.";
  }

  return "";
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const queryError = getQueryErrorMessage(searchParams?.get("error") ?? null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: buildAppUrl("/auth/confirm?next=/update-password"),
        }
      );

      if (resetError) {
        setError(
          "Não foi possível enviar o link de recuperação. Confirma a configuração do Supabase Auth e tenta novamente."
        );
        return;
      }

      setSuccess(
        "Se existir uma conta com esse email, enviámos um link para redefinir a palavra-passe."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {queryError ? <p className="text-sm text-red-600">{queryError}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "A enviar..." : "Enviar link de recuperação"}
      </Button>

      <div className="text-center text-sm text-gray-500">
        <Link href="/login" className="hover:underline">
          Voltar ao login
        </Link>
      </div>
    </form>
  );
}
