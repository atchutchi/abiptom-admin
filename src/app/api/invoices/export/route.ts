import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { withAuthenticatedDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/actions";
import { invoices, invoicePayments } from "@/lib/db/schema";
import {
  buildInvoiceExportRows,
  createInvoiceExportWorkbook,
} from "@/lib/invoices/export";
import { normalizeInvoiceFilters } from "@/lib/invoices/filters";

export async function GET(req: NextRequest) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) return new NextResponse("Não autorizado", { status: 401 });
  if (!["ca", "dg"].includes(dbUser.role)) {
    return new NextResponse("Sem permissão", { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const mes = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  const filters = normalizeInvoiceFilters({
    estado: searchParams.get("estado") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    numero: searchParams.get("numero") ?? undefined,
    tipo: searchParams.get("tipo") ?? undefined,
    moeda: searchParams.get("moeda") ?? undefined,
    mes,
    dataInicio: searchParams.get("dataInicio") ?? undefined,
    dataFim: searchParams.get("dataFim") ?? undefined,
    vencidas: searchParams.get("vencidas") ?? undefined,
    pagoNoMes: searchParams.get("pagoNoMes") ?? undefined,
  });

  const rows = await withAuthenticatedDb(user, async (db) => {
    const conditions: SQL[] = [];

    if (filters.estado?.length) conditions.push(inArray(invoices.estado, filters.estado));
    if (filters.clientId) conditions.push(eq(invoices.clientId, filters.clientId));
    if (filters.projectId) conditions.push(eq(invoices.projectId, filters.projectId));
    if (filters.numero) conditions.push(eq(invoices.numero, filters.numero));
    if (filters.tipo) conditions.push(eq(invoices.tipo, filters.tipo));
    if (filters.moeda) conditions.push(eq(invoices.moeda, filters.moeda));
    if (filters.mesInicio) conditions.push(gte(invoices.dataEmissao, filters.mesInicio));
    if (filters.mesFim) conditions.push(lte(invoices.dataEmissao, filters.mesFim));
    if (filters.dataInicio) conditions.push(gte(invoices.dataEmissao, filters.dataInicio));
    if (filters.dataFim) conditions.push(lte(invoices.dataEmissao, filters.dataFim));
    if (filters.vencidas) {
      const hoje = new Date().toISOString().split("T")[0];
      conditions.push(
        inArray(invoices.estado, ["definitiva", "paga_parcial"]),
        lte(invoices.dataVencimento, hoje),
      );
    }
    if (filters.pagoInicio || filters.pagoFim) {
      const paymentConditions: SQL[] = [];
      if (filters.pagoInicio) {
        paymentConditions.push(gte(invoicePayments.data, filters.pagoInicio));
      }
      if (filters.pagoFim) {
        paymentConditions.push(lte(invoicePayments.data, filters.pagoFim));
      }

      const paidRows = await db.query.invoicePayments.findMany({
        where: paymentConditions.length ? and(...paymentConditions) : undefined,
        columns: { invoiceId: true },
      });
      const invoiceIds = [...new Set(paidRows.map((row) => row.invoiceId))];
      if (invoiceIds.length === 0) return [];
      conditions.push(inArray(invoices.id, invoiceIds));
    }

    return db.query.invoices.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { client: true },
      orderBy: (invoice, { asc }) => [asc(invoice.dataEmissao)],
    });
  });

  const buf = await createInvoiceExportWorkbook(buildInvoiceExportRows(rows), mes);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="facturas-${mes}.xlsx"`,
    },
  });
}
