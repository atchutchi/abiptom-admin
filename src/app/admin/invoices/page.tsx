import { listInvoices } from "@/lib/invoices/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import {
  formatDate,
  formatCurrency,
  invoiceNumber,
  INVOICE_STATE_LABELS,
  INVOICE_STATE_COLORS,
} from "@/lib/utils/format";
import type { InvoiceState } from "@/lib/db/schema";
import InvoiceExportButton from "@/components/forms/InvoiceExportButton";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Facturas — ABIPTOM Core" };

const STATES: InvoiceState[] = [
  "rascunho",
  "proforma",
  "definitiva",
  "paga_parcial",
  "paga",
  "anulada",
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; mes?: string; vencidas?: string }>;
}) {
  const { estado, mes, vencidas } = await searchParams;
  const isVencidas = vencidas === "1";

  const estadoFilter = isVencidas
    ? undefined
    : estado
      ? ([estado] as InvoiceState[])
      : (["proforma", "definitiva", "paga_parcial", "paga"] as InvoiceState[]);

  const mesInicio = mes ? `${mes}-01` : undefined;
  const mesFim = mes ? `${mes}-31` : undefined;

  const facturas = await listInvoices({
    estado: estadoFilter,
    mesInicio,
    mesFim,
    vencidas: isVencidas,
  });

  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <>
      <Header title={isVencidas ? "Facturas vencidas" : "Facturas"} />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{facturas.length} resultado(s)</p>
            <div className="flex gap-2">
              <InvoiceExportButton mes={mes ?? mesAtual} />
              <Button asChild>
                <Link href="/admin/invoices/new">
                  <Plus className="size-4" />
                  Nova Factura
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <form className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <select
                name="estado"
                defaultValue={estado ?? ""}
                disabled={isVencidas}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none disabled:opacity-50"
              >
                <option value="">Todos activos</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{INVOICE_STATE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <input
                name="mes"
                type="month"
                defaultValue={mes ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground pb-2 cursor-pointer">
              <input
                type="checkbox"
                name="vencidas"
                value="1"
                defaultChecked={isVencidas}
                className="rounded border-border"
              />
              Só vencidas
            </label>
            <Button type="submit" variant="secondary">Filtrar</Button>
            {isVencidas && (
              <Link
                href="/admin/invoices"
                className="text-xs text-muted-foreground hover:underline pb-2"
              >
                Limpar
              </Link>
            )}
          </form>

          {facturas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma factura encontrada.</p>
              <Button asChild variant="secondary">
                <Link href="/admin/invoices/new">Criar factura</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nº</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">
                        {invoiceNumber(f.numero)}
                      </td>
                      <td className="px-4 py-3">{f.client?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(f.dataEmissao)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATE_COLORS[f.estado]}`}
                        >
                          {INVOICE_STATE_LABELS[f.estado]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatCurrency(f.total, f.moeda)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/invoices/${f.id}`}
                          className="text-primary hover:underline text-xs"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
