import ClientForm from "@/components/forms/ClientForm";
import { createClient } from "@/lib/clients/actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Novo Cliente — ABIPTOM Admin" };

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo Cliente</h1>
      </div>
      <ClientForm action={createClient} submitLabel="Criar Cliente" />
    </div>
  );
}
