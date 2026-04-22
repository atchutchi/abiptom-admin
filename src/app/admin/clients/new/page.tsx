import ClientForm from "@/components/forms/ClientForm";
import { createClient } from "@/lib/clients/actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Novo Cliente — ABIPTOM Admin" };

export default function NewClientPage() {
  return (
    <>
      <Header title="Novo Cliente" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
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
      </main>
    </>
  );
}
