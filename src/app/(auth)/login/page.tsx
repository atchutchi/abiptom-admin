import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/forms/LoginForm";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/brand";

export const metadata = { title: `Iniciar sessão — ${APP_NAME}` };

export default function LoginPage() {
  return (
    <AuthShell
      title="Iniciar sessão"
      description={APP_DESCRIPTION}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
