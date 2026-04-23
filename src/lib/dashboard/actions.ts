"use server";

import { dbAdmin } from "@/lib/db";
import {
  invoices,
  invoicePayments,
  projects,
  expenses,
  salaryPeriods,
  clients,
} from "@/lib/db/schema";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/actions";
import { toXofInteger } from "@/lib/utils/money";

export interface DashboardStats {
  facturasAbertas: {
    count: number;
    totalXof: number;
  };
  facturasVencidas: {
    count: number;
    totalXof: number;
  };
  projectosActivos: number;
  clientesActivos: number;
  folhaMes: {
    ano: number;
    mes: number;
    totalLiquido: number;
    estado: string | null;
  };
  recebidoMes: number;
  despesasMes: number;
  facturadoMes: number;
  ultimasFacturas: Array<{
    id: string;
    numero: number | null;
    clientNome: string;
    total: string;
    estado: string;
    dataEmissao: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const hoje = now.toISOString().split("T")[0];

  const [abertasRow] = await dbAdmin
    .select({
      count: count(),
      total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(inArray(invoices.estado, ["definitiva", "paga_parcial"]));

  const [vencidasRow] = await dbAdmin
    .select({
      count: count(),
      total: sql<string>`coalesce(sum(${invoices.total}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        inArray(invoices.estado, ["definitiva", "paga_parcial"]),
        lte(invoices.dataVencimento, hoje)
      )
    );

  const [projRow] = await dbAdmin
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.estado, "activo"));

  const [cliRow] = await dbAdmin
    .select({ count: count() })
    .from(clients)
    .where(eq(clients.activo, true));

  const folha = await dbAdmin.query.salaryPeriods.findFirst({
    where: and(eq(salaryPeriods.ano, ano), eq(salaryPeriods.mes, mes)),
  });

  const pagamentos = await dbAdmin
    .select({
      valor: invoicePayments.valor,
      taxaCambio: invoicePayments.taxaCambio,
    })
    .from(invoicePayments)
    .where(
      and(gte(invoicePayments.data, start), lte(invoicePayments.data, end))
    );

  const recebidoMes = pagamentos.reduce(
    (s, p) => s + toXofInteger(Number(p.valor) * Number(p.taxaCambio ?? "1")),
    0
  );

  const despesasDoMes = await dbAdmin
    .select({
      valorXof: expenses.valorXof,
      estado: expenses.estado,
    })
    .from(expenses)
    .where(and(gte(expenses.data, start), lte(expenses.data, end)));

  const despesasMes = despesasDoMes
    .filter((d) => d.estado !== "anulada")
    .reduce((s, d) => s + toXofInteger(d.valorXof), 0);

  const facturasMes = await dbAdmin
    .select({ total: invoices.total })
    .from(invoices)
    .where(
      and(
        gte(invoices.dataEmissao, start),
        lte(invoices.dataEmissao, end),
        inArray(invoices.estado, ["definitiva", "paga_parcial", "paga"])
      )
    );
  const facturadoMes = facturasMes.reduce((s, f) => s + toXofInteger(f.total), 0);

  const ultimas = await dbAdmin
    .select({
      id: invoices.id,
      numero: invoices.numero,
      clientNome: clients.nome,
      total: invoices.total,
      estado: invoices.estado,
      dataEmissao: invoices.dataEmissao,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(sql`${invoices.createdAt} desc`)
    .limit(5);

  return {
    facturasAbertas: {
      count: Number(abertasRow?.count ?? 0),
      totalXof: toXofInteger(abertasRow?.total ?? 0),
    },
    facturasVencidas: {
      count: Number(vencidasRow?.count ?? 0),
      totalXof: toXofInteger(vencidasRow?.total ?? 0),
    },
    projectosActivos: Number(projRow?.count ?? 0),
    clientesActivos: Number(cliRow?.count ?? 0),
    folhaMes: {
      ano,
      mes,
      totalLiquido: toXofInteger(folha?.totalLiquido ?? 0),
      estado: folha?.estado ?? null,
    },
    recebidoMes,
    despesasMes,
    facturadoMes,
    ultimasFacturas: ultimas,
  };
}
