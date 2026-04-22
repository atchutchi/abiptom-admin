import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata = { title: "Iniciar sessão — ABIPTOM Admin" };

export default function LoginPage() {
  return (
    <AuthShell
      title="ABIPTOM Admin"
      description="Plataforma de gestão interna"
    >
      <LoginForm />
    </AuthShell>
  );
}
