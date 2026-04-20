"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  invoices,
  invoiceItems,
  invoicePayments,
  type InvoiceState,
} from "@/lib/db/schema";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/actions";
import { insertAuditLog } from "@/lib/db/audit";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { canTransition } from "./state";

// ─── Schemas ────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  ordem: z.coerce.number().int().default(1),
  descricao: z.string().min(1, "Descrição obrigatória"),
  unidade: z.string().optional(),
  quantidade: z.coerce.number().positive("Quantidade inválida"),
  precoUnitario: z.coerce.number().nonnegative("Preço inválido"),
});

const invoiceSchema = z.object({
  clientId: z.string().uuid("Cliente obrigatório"),
  dataEmissao: z.string().min(1, "Data de emissão obrigatória"),
  dataVencimento: z.string().optional(),
  moeda: z.enum(["XOF", "EUR", "USD"]).default("XOF"),
  taxaCambio: z.coerce.number().positive().default(1),
  igvPercentagem: z.coerce.number().min(0).max(100).default(0),
  formaPagamento: z.string().optional(),
  contaBancaria: z.string().optional(),
  observacoes: z.string().optional(),
  items: z.array(itemSchema).min(1, "Pelo menos um item obrigatório"),
});

const paymentSchema = z.object({
  data: z.string().min(1, "Data obrigatória"),
  valor: z.coerce.number().positive("Valor inválido"),
  moeda: z.enum(["XOF", "EUR", "USD"]),
  taxaCambio: z.coerce.number().positive().default(1),
  referencia: z.string().optional(),
  metodo: z.string().optional(),
  notas: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcTotals(
  items: { quantidade: number; precoUnitario: number }[],
  igvPct: number
) {
  const subtotal = items.reduce(
    (s, i) => s + i.quantidade * i.precoUnitario,
    0
  );
  const igvValor = Math.round(subtotal * (igvPct / 100) * 100) / 100;
  const total = subtotal + igvValor;
  return { subtotal, igvValor, total };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function listInvoices(filters?: {
  estado?: InvoiceState[];
  clientId?: string;
  mesInicio?: string;
  mesFim?: string;
}) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  const conditions = [];
  if (filters?.estado?.length)
    conditions.push(inArray(invoices.estado, filters.estado));
  if (filters?.clientId)
    conditions.push(eq(invoices.clientId, filters.clientId));
  if (filters?.mesInicio)
    conditions.push(gte(invoices.dataEmissao, filters.mesInicio));
  if (filters?.mesFim)
    conditions.push(lte(invoices.dataEmissao, filters.mesFim));

  return db.query.invoices.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      client: true,
      createdBy: { columns: { nomeCurto: true } },
    },
    orderBy: [desc(invoices.createdAt)],
  });
}

export async function getInvoice(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      client: { with: { contacts: { where: eq(invoiceItems.invoiceId, id) } } },
      items: { orderBy: (i, { asc }) => [asc(i.ordem)] },
      payments: { orderBy: (p, { desc }) => [desc(p.data)] },
      createdBy: { columns: { nomeCurto: true, nomeCompleto: true } },
    },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createInvoice(data: z.infer<typeof invoiceSchema>) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const parsed = invoiceSchema.safeParse(data);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { items, igvPercentagem, ...invoiceData } = parsed.data;
  const { subtotal, igvValor, total } = calcTotals(items, igvPercentagem);

  const [created] = await db
    .insert(invoices)
    .values({
      ...invoiceData,
      igvPercentagem: String(igvPercentagem),
      igvValor: String(igvValor),
      subtotal: String(subtotal),
      total: String(total),
      taxaCambio: String(invoiceData.taxaCambio),
      createdBy: dbUser.id,
    })
    .returning();

  await db.insert(invoiceItems).values(
    items.map((item, i) => ({
      invoiceId: created.id,
      ordem: i + 1,
      descricao: item.descricao,
      unidade: item.unidade ?? "serviço",
      quantidade: String(item.quantidade),
      precoUnitario: String(item.precoUnitario),
      total: String(item.quantidade * item.precoUnitario),
    }))
  );

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "create",
    entidade: "invoices",
    entidadeId: created.id,
    dadosDepois: created,
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/invoices");
  return { success: true, id: created.id };
}

// ─── Update items ─────────────────────────────────────────────────────────────

export async function updateInvoiceItems(
  invoiceId: string,
  items: z.infer<typeof itemSchema>[],
  igvPercentagem: number
) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  if (!invoice) return { error: "Factura não encontrada" };
  if (invoice.estado !== "rascunho")
    return { error: "Só é possível editar rascunhos" };

  const { subtotal, igvValor, total } = calcTotals(items, igvPercentagem);

  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  await db.insert(invoiceItems).values(
    items.map((item, i) => ({
      invoiceId,
      ordem: i + 1,
      descricao: item.descricao,
      unidade: item.unidade ?? "serviço",
      quantidade: String(item.quantidade),
      precoUnitario: String(item.precoUnitario),
      total: String(item.quantidade * item.precoUnitario),
    }))
  );

  await db
    .update(invoices)
    .set({
      igvPercentagem: String(igvPercentagem),
      igvValor: String(igvValor),
      subtotal: String(subtotal),
      total: String(total),
    })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true };
}

// ─── State transition ─────────────────────────────────────────────────────────

export async function transitionInvoice(
  invoiceId: string,
  to: InvoiceState,
  tipo?: "proforma" | "definitiva"
) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  if (!invoice) return { error: "Factura não encontrada" };
  if (!canTransition(invoice.estado, to))
    return { error: `Transição ${invoice.estado} → ${to} não permitida` };

  const updates: Partial<typeof invoices.$inferInsert> = { estado: to };

  // Atribui número ao sair do rascunho
  if (
    invoice.estado === "rascunho" &&
    (to === "proforma" || to === "definitiva")
  ) {
    const [{ nextval }] = await db.execute<{ nextval: string }>(
      sql`SELECT nextval('invoice_number_seq')`
    );
    updates.numero = Number(nextval);
    updates.tipo = tipo ?? (to === "proforma" ? "proforma" : "definitiva");
  }

  if (to === "definitiva" && invoice.tipo === "proforma") {
    updates.tipo = "definitiva";
  }

  const [updated] = await db
    .update(invoices)
    .set(updates)
    .where(eq(invoices.id, invoiceId))
    .returning();

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: `transition_${to}`,
    entidade: "invoices",
    entidadeId: invoiceId,
    dadosAntes: { estado: invoice.estado },
    dadosDepois: { estado: to, numero: updated.numero },
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true, invoice: updated };
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function registerPayment(
  invoiceId: string,
  data: z.infer<typeof paymentSchema>
) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const parsed = paymentSchema.safeParse(data);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { payments: true },
  });
  if (!invoice) return { error: "Factura não encontrada" };
  if (!["definitiva", "paga_parcial"].includes(invoice.estado))
    return { error: "Factura não está em estado pagável" };

  await db.insert(invoicePayments).values({
    invoiceId,
    data: parsed.data.data,
    valor: String(parsed.data.valor),
    moeda: parsed.data.moeda,
    taxaCambio: String(parsed.data.taxaCambio),
    referencia: parsed.data.referencia,
    metodo: parsed.data.metodo,
    notas: parsed.data.notas,
    registadoPor: dbUser.id,
  });

  // Determina novo estado
  const totalPago =
    (invoice.payments ?? []).reduce(
      (s, p) => s + Number(p.valor),
      0
    ) + parsed.data.valor;
  const newState: InvoiceState =
    totalPago >= Number(invoice.total) ? "paga" : "paga_parcial";

  await db
    .update(invoices)
    .set({ estado: newState })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
  return { success: true };
}

// ─── Delete draft ─────────────────────────────────────────────────────────────

export async function deleteInvoiceDraft(invoiceId: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  if (!invoice) return { error: "Factura não encontrada" };
  if (invoice.estado !== "rascunho")
    return { error: "Só rascunhos podem ser eliminados" };

  await db.delete(invoices).where(eq(invoices.id, invoiceId));
  revalidatePath("/admin/invoices");
  return { success: true };
}
