import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export const metadata = { title: "Recuperar acesso — ABIPTOM Admin" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar acesso"
      description="Recebe um link seguro para redefinir a tua palavra-passe."
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
