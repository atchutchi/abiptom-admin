import ServiceForm from "@/components/forms/ServiceForm";
import { createService } from "@/lib/services/actions";

export const metadata = { title: "Novo Serviço — ABIPTOM Admin" };

export default function NewServicePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Novo Serviço</h1>
        <p className="text-sm text-muted-foreground">
          Adicionar um serviço ao catálogo.
        </p>
      </div>
      <ServiceForm action={createService} submitLabel="Criar serviço" />
    </div>
  );
}
