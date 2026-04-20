import { LoginForm } from "@/components/forms/LoginForm";

export const metadata = { title: "Iniciar sessão — ABIPTOM Admin" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-sm border">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            ABIPTOM Admin
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Plataforma de gestão interna
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
