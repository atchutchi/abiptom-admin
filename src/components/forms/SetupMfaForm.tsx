"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/brand";

// init   → a verificar factores existentes
// enroll → novo factor: mostra QR code
// verify → factor já existe: só pede código
// done   → sucesso
type Step = "init" | "enroll" | "verify" | "done";

async function resolvePostMfaRedirect() {
  const response = await fetch("/api/auth/post-login", {
    cache: "no-store",
  });

  if (!response.ok) {
    return "/staff/me/dashboard";
  }

  const body = (await response.json().catch(() => null)) as {
    redirectTo?: string;
  } | null;
  return body?.redirectTo ?? "/staff/me/dashboard";
}

export function SetupMfaForm() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("init");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      try {
        // 1. Verificar se já existe um factor TOTP verificado
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verified = factorsData?.totp?.find((f) => f.status === "verified");

        if (verified) {
          // Factor já existe — vai directamente para o passo de verificação
          setFactorId(verified.id);
          setStep("verify");
          return;
        }

        // 2. Nenhum factor verificado — inscrever novo
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: APP_NAME,
        });

        if (enrollError || !data) {
          setError("Erro ao gerar QR code. Tenta novamente.");
          return;
        }

        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setStep("enroll");
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const redirectTo = await resolvePostMfaRedirect();
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  // ── Renderização ──────────────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="text-center space-y-2">
        <p className="text-green-600 font-medium">MFA configurado com sucesso!</p>
        <p className="text-sm text-gray-500">A redirecionar...</p>
      </div>
    );
  }

  if (step === "init") {
    return (
      <p className="text-center text-sm text-gray-500">A carregar...</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Novo factor: instrução + QR code ── */}
      {step === "enroll" && qrCode && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            1. Abre a tua aplicação autenticadora (Google Authenticator, Authy, etc.)
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
        </div>
      )}

      {/* ── Factor existente: mensagem informativa ── */}
      {step === "verify" && (
        <p className="text-sm text-gray-700">
          MFA já configurado. Introduz o código da tua aplicação autenticadora
          para confirmar o acesso.
        </p>
      )}

      {/* ── Formulário de verificação (common a enroll e verify) ── */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">
            {step === "enroll"
              ? "3. Insere o código de 6 dígitos para confirmar"
              : "Código de 6 dígitos"}
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
  );
}
