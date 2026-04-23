import { AuthShell } from "@/components/auth/AuthShell";
import { SetupMfaForm } from "@/components/forms/SetupMfaForm";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: `Configurar MFA — ${APP_NAME}` };

export default function SetupMfaPage() {
  return (
    <AuthShell
      title="Verificação em dois passos"
      description="A tua conta requer autenticação MFA. Configura agora."
    >
      <SetupMfaForm />
    </AuthShell>
  );
}
