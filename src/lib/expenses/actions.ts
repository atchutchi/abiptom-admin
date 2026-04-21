"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/actions";
import { insertAuditLog } from "@/lib/db/audit";
import { headers } from "next/headers";
import type { ExpenseFilters } from "./labels";

const expenseSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  categoria: z.enum([
    "aluguer",
    "servicos_publicos",
    "material_escritorio",
    "deslocacoes",
    "marketing",
    "formacao",
    "software_licencas",
    "manutencao",
    "impostos_taxas",
    "outros",
  ]),
  descricao: z.string().min(2, "Descrição obrigatória"),
  fornecedor: z.string().optional(),
  nifFornecedor: z.string().optional(),
  valor: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
  moeda: z.enum(["XOF", "EUR", "USD"]).default("XOF"),
  taxaCambio: z.string().regex(/^\d+(\.\d{1,6})?$/, "Taxa inválida").default("1"),
  metodoPagamento: z.string().optional(),
  referencia: z.string().optional(),
  notas: z.string().optional(),
});

function parseForm(formData: FormData) {
  return expenseSchema.safeParse({
    data: formData.get("data"),
    categoria: formData.get("categoria"),
    descricao: formData.get("descricao"),
    fornecedor: formData.get("fornecedor") || undefined,
    nifFornecedor: formData.get("nifFornecedor") || undefined,
    valor: formData.get("valor"),
    moeda: formData.get("moeda") || "XOF",
    taxaCambio: formData.get("taxaCambio") || "1",
    metodoPagamento: formData.get("metodoPagamento") || undefined,
    referencia: formData.get("referencia") || undefined,
    notas: formData.get("notas") || undefined,
  });
}

export async function listExpenses(filters: ExpenseFilters = {}) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  const conditions = [];

  if (filters.mes && /^\d{4}-\d{2}$/.test(filters.mes)) {
    const [y, m] = filters.mes.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = new Date(y, m, 0);
    const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    conditions.push(gte(expenses.data, start));
    conditions.push(lte(expenses.data, end));
  }

  if (filters.categoria && filters.categoria !== "todas") {
    conditions.push(
      eq(
        expenses.categoria,
        filters.categoria as
          | "aluguer"
          | "servicos_publicos"
          | "material_escritorio"
          | "deslocacoes"
          | "marketing"
          | "formacao"
          | "software_licencas"
          | "manutencao"
          | "impostos_taxas"
          | "outros"
      )
    );
  }

  if (filters.estado && filters.estado !== "todos") {
    conditions.push(
      eq(
        expenses.estado,
        filters.estado as "rascunho" | "aprovada" | "paga" | "anulada"
      )
    );
  }

  return db.query.expenses.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(expenses.data), desc(expenses.createdAt)],
  });
}

export async function getExpense(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  return db.query.expenses.findFirst({ where: eq(expenses.id, id) });
}

export async function sumExpensesByMonth(mes: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  const rows = await listExpenses({ mes });
  return rows.reduce((sum, e) => sum + Number(e.valorXof), 0);
}

export async function createExpense(_: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) return { error: "Sem permissão" };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const valor = Number(parsed.data.valor);
  const taxaCambio = Number(parsed.data.taxaCambio);
  const valorXof = (valor * taxaCambio).toFixed(2);

  const [created] = await db
    .insert(expenses)
    .values({
      ...parsed.data,
      valorXof,
      criadoPor: dbUser.id,
    })
    .returning();

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "create",
    entidade: "expenses",
    entidadeId: created.id,
    dadosDepois: created,
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/expenses");
  return { success: true, id: created.id };
}

export async function updateExpense(id: string, _: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) return { error: "Sem permissão" };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const before = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  if (!before) return { error: "Despesa não encontrada" };
  if (before.estado === "paga" || before.estado === "anulada") {
    return { error: "Não é possível editar despesas pagas ou anuladas" };
  }

  const valor = Number(parsed.data.valor);
  const taxaCambio = Number(parsed.data.taxaCambio);
  const valorXof = (valor * taxaCambio).toFixed(2);

  const [updated] = await db
    .update(expenses)
    .set({ ...parsed.data, valorXof })
    .where(eq(expenses.id, id))
    .returning();

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "update",
    entidade: "expenses",
    entidadeId: id,
    dadosAntes: before,
    dadosDepois: updated,
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/expenses/${id}`);
  return { success: true };
}

export async function approveExpense(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  const before = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  if (!before) throw new Error("Despesa não encontrada");
  if (before.estado !== "rascunho") throw new Error("Apenas rascunhos podem ser aprovados");

  await db
    .update(expenses)
    .set({ estado: "aprovada", aprovadoPor: dbUser.id })
    .where(eq(expenses.id, id));

  await insertAuditLog({
    userId: dbUser.id,
    acao: "approve",
    entidade: "expenses",
    entidadeId: id,
  });

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/expenses/${id}`);
}

export async function markExpensePaid(id: string, dataPagamento: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  const before = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  if (!before) throw new Error("Despesa não encontrada");
  if (before.estado === "anulada") throw new Error("Despesa anulada");

  await db
    .update(expenses)
    .set({ estado: "paga", dataPagamento })
    .where(eq(expenses.id, id));

  await insertAuditLog({
    userId: dbUser.id,
    acao: "mark_paid",
    entidade: "expenses",
    entidadeId: id,
    dadosDepois: { dataPagamento },
  });

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/expenses/${id}`);
}

export async function cancelExpense(id: string, motivo: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  await db
    .update(expenses)
    .set({ estado: "anulada", notas: motivo })
    .where(eq(expenses.id, id));

  await insertAuditLog({
    userId: dbUser.id,
    acao: "cancel",
    entidade: "expenses",
    entidadeId: id,
    dadosDepois: { motivo },
  });

  revalidatePath("/admin/expenses");
  revalidatePath(`/admin/expenses/${id}`);
}

