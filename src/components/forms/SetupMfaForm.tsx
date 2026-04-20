"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDefaultRoute } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";

type Step = "enroll" | "verify" | "done";

export function SetupMfaForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("enroll");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function enroll() {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: "ABIPTOM Admin",
        });

        if (error || !data) {
          setError("Erro ao gerar QR code. Tenta novamente.");
          return;
        }

        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      } finally {
        setLoading(false);
      }
    }

    enroll();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError || !challenge) {
        setError("Erro ao iniciar verificação.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.replace(/\s/g, ""),
      });

      if (verifyError) {
        setError("Código inválido. Verifica a tua aplicação autenticadora.");
        return;
      }

      setStep("done");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = (user?.user_metadata?.role ?? "staff") as UserRole;

      setTimeout(() => router.push(getDefaultRoute(role)), 1500);
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="text-center space-y-2">
        <p className="text-green-600 font-medium">MFA configurado com sucesso!</p>
        <p className="text-sm text-gray-500">A redirecionar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading && !qrCode && (
        <p className="text-center text-sm text-gray-500">A gerar QR code...</p>
      )}

      {qrCode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            1. Abre a tua aplicação autenticadora (Google Authenticator, Authy,
            etc.)
          </p>
          <p className="text-sm text-gray-700">
            2. Digitaliza o QR code ou insere o código manualmente:
          </p>

          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code MFA" width={200} height={200} />
          </div>

          <div className="bg-gray-50 rounded p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Código manual:</p>
            <code className="text-sm font-mono break-all">{secret}</code>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                3. Insere o código de 6 dígitos para confirmar
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                placeholder="000 000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "A verificar..." : "Confirmar e activar MFA"}
            </Button>
          </form>
        </div>
      )}

      {error && !qrCode && (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
