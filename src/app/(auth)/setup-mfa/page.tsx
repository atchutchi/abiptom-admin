import { SetupMfaForm } from "@/components/forms/SetupMfaForm";

export const metadata = { title: "Configurar MFA — ABIPTOM Admin" };

export default function SetupMfaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-sm border">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Verificação em dois passos
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            A tua conta requer autenticação MFA. Configura agora.
          </p>
        </div>
        <SetupMfaForm />
      </div>
    </div>
  );
}
