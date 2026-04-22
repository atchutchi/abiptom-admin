import { listClients } from "@/lib/clients/actions";
import { listServices } from "@/lib/services/actions";
import InvoiceForm from "@/components/forms/InvoiceForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Nova Factura — ABIPTOM Admin" };

export default async function NewInvoicePage() {
  const [clientes, servicos] = await Promise.all([
    listClients(),
    listServices(),
  ]);

  return (
    <>
      <Header title="Nova Factura" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <Link
              href="/admin/invoices"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Facturas
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Nova Factura</h1>
          </div>
          <InvoiceForm clientes={clientes} servicos={servicos} />
        </div>
      </main>
    </>
  );
}
