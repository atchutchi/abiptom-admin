"use server";

import { db } from "@/lib/db";
import {
  invoices,
  invoicePayments,
  expenses,
  salaryPeriods,
  salaryLines,
  dividendPeriods,
  dividendLines,
} from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/actions";

interface MonthRange {
  start: string;
  end: string;
}

function monthRange(ano: number, mes: number): MonthRange {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const endDate = new Date(ano, mes, 0);
  const end = `${ano}-${String(mes).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

export interface ProfitLossReport {
  ano: number;
  mes: number;
  receitas: {
    facturado: number;
    recebido: number;
    facturasCount: number;
    pagamentosCount: number;
  };
  despesas: {
    total: number;
    porCategoria: Record<string, number>;
    count: number;
  };
  salarios: {
    totalFolha: number;
    totalLiquido: number;
    totalBruto: number;
    estado: string | null;
  };
  dividendos: {
    totalDistribuido: number;
    pagoNoMes: number;
  };
  resultado: {
    margemBruta: number;
    margemLiquida: number;
    cashflow: number;
  };
}

export async function getMonthlyProfitLoss(
  ano: number,
  mes: number
): Promise<ProfitLossReport> {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");

  const { start, end } = monthRange(ano, mes);

  // receitas: facturas emitidas no mês (definitivas/pagas) e pagamentos recebidos
  const facturasDoMes = await db
    .select({
      id: invoices.id,
      total: invoices.total,
      estado: invoices.estado,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.dataEmissao, start),
        lte(invoices.dataEmissao, end),
        inArray(invoices.estado, ["definitiva", "paga_parcial", "paga"])
      )
    );

  const facturado = facturasDoMes.reduce((s, f) => s + Number(f.total), 0);

  const pagamentosDoMes = await db
    .select({
      valor: invoicePayments.valor,
      taxaCambio: invoicePayments.taxaCambio,
    })
    .from(invoicePayments)
    .where(
      and(gte(invoicePayments.data, start), lte(invoicePayments.data, end))
    );

  const recebido = pagamentosDoMes.reduce(
    (s, p) => s + Number(p.valor) * Number(p.taxaCambio ?? "1"),
    0
  );

  // despesas: todas as despesas com data no mês (excepto anuladas)
  const despesasDoMes = await db
    .select({
      categoria: expenses.categoria,
      valorXof: expenses.valorXof,
      estado: expenses.estado,
    })
    .from(expenses)
    .where(
      and(
        gte(expenses.data, start),
        lte(expenses.data, end)
      )
    );

  const despesasValidas = despesasDoMes.filter((d) => d.estado !== "anulada");
  const totalDespesas = despesasValidas.reduce(
    (s, d) => s + Number(d.valorXof),
    0
  );
  const porCategoria: Record<string, number> = {};
  for (const d of despesasValidas) {
    porCategoria[d.categoria] =
      (porCategoria[d.categoria] ?? 0) + Number(d.valorXof);
  }

  // salários: período ano/mes
  const periodo = await db.query.salaryPeriods.findFirst({
    where: and(eq(salaryPeriods.ano, ano), eq(salaryPeriods.mes, mes)),
  });

  let totalFolha = 0;
  let totalLiquido = 0;
  let totalBruto = 0;
  let estadoSalario: string | null = null;

  if (periodo) {
    totalFolha = Number(periodo.totalFolha ?? 0);
    totalLiquido = Number(periodo.totalLiquido ?? 0);
    totalBruto = Number(periodo.totalBruto ?? 0);
    estadoSalario = periodo.estado;

    if (totalFolha === 0) {
      const linhas = await db
        .select({
          totalBruto: salaryLines.totalBruto,
          totalLiquido: salaryLines.totalLiquido,
        })
        .from(salaryLines)
        .where(eq(salaryLines.periodId, periodo.id));
      totalBruto = linhas.reduce((s, l) => s + Number(l.totalBruto), 0);
      totalLiquido = linhas.reduce((s, l) => s + Number(l.totalLiquido), 0);
      totalFolha = totalBruto;
    }
  }

  // dividendos pagos no mês
  const linhasDivPagas = await db
    .select({
      valorBruto: dividendLines.valorBruto,
      estado: dividendPeriods.estado,
    })
    .from(dividendLines)
    .innerJoin(
      dividendPeriods,
      eq(dividendLines.periodId, dividendPeriods.id)
    )
    .where(
      and(
        eq(dividendLines.pago, true),
        gte(dividendLines.dataPagamento, start),
        lte(dividendLines.dataPagamento, end)
      )
    );

  const pagoNoMes = linhasDivPagas.reduce(
    (s, l) => s + Number(l.valorBruto),
    0
  );

  // totalDistribuido de periodos com ano/mes correspondente (se aplicável ao trimestre)
  const periodosAno = await db
    .select({
      totalDistribuido: dividendPeriods.totalDistribuido,
      trimestre: dividendPeriods.trimestre,
    })
    .from(dividendPeriods)
    .where(eq(dividendPeriods.ano, ano));

  const totalDistribuido = periodosAno
    .filter((p) => {
      if (!p.trimestre) return false;
      const tMes = [0, 3, 6, 9, 12];
      return p.trimestre >= 1 && p.trimestre <= 4 && tMes[p.trimestre] === mes;
    })
    .reduce((s, p) => s + Number(p.totalDistribuido), 0);

  const margemBruta = facturado - totalDespesas;
  const margemLiquida = margemBruta - totalFolha;
  const cashflow = recebido - totalDespesas - totalLiquido - pagoNoMes;

  return {
    ano,
    mes,
    receitas: {
      facturado,
      recebido,
      facturasCount: facturasDoMes.length,
      pagamentosCount: pagamentosDoMes.length,
    },
    despesas: {
      total: totalDespesas,
      porCategoria,
      count: despesasValidas.length,
    },
    salarios: {
      totalFolha,
      totalLiquido,
      totalBruto,
      estado: estadoSalario,
    },
    dividendos: {
      totalDistribuido,
      pagoNoMes,
    },
    resultado: {
      margemBruta,
      margemLiquida,
      cashflow,
    },
  };
}
