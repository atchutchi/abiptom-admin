import { AuthShell } from "@/components/auth/AuthShell";
import { SetupMfaForm } from "@/components/forms/SetupMfaForm";

export const metadata = { title: "Configurar MFA — ABIPTOM Admin" };

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
