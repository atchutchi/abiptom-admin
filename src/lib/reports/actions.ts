"use server";

import { dbAdmin, withAuthenticatedDb } from "@/lib/db";
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
import { toXofInteger } from "@/lib/utils/money";

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
  periodoTipo?: "mensal" | "trimestral";
  trimestre?: number;
  periodoLabel?: string;
  monthlyBreakdown?: ProfitLossMonthSummary[];
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
    saldoGlobal: number;
  };
}

export interface ProfitLossMonthSummary {
  ano: number;
  mes: number;
  label: string;
  facturado: number;
  recebido: number;
  despesas: number;
  folha: number;
  folhaLiquida: number;
  dividendosPagos: number;
  cashflow: number;
  saldoGlobal: number;
  saldoAcumulado: number;
}

const MES_LABELS = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

async function assertReportsAccess() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) throw new Error("Sem permissão");
  return { user, dbUser };
}

async function computeMonthlyProfitLoss(
  db: typeof dbAdmin,
  ano: number,
  mes: number
): Promise<ProfitLossReport> {
  const { start, end } = monthRange(ano, mes);

  // receitas: facturas emitidas no mês (definitivas/pagas) e pagamentos recebidos
  const facturasDoMes = await db
    .select({
      id: invoices.id,
      total: invoices.total,
      taxaCambio: invoices.taxaCambio,
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

  const facturado = facturasDoMes.reduce(
    (s, f) => s + toXofInteger(Number(f.total) * Number(f.taxaCambio ?? "1")),
    0,
  );

  const pagamentosDoMes = await db
    .select({
      valor: invoicePayments.valor,
      taxaCambio: invoicePayments.taxaCambio,
    })
    .from(invoicePayments)
    .where(and(gte(invoicePayments.data, start), lte(invoicePayments.data, end)));

  const recebido = pagamentosDoMes.reduce(
    (s, p) => s + toXofInteger(Number(p.valor) * Number(p.taxaCambio ?? "1")),
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
    .where(and(gte(expenses.data, start), lte(expenses.data, end)));

  const despesasValidas = despesasDoMes.filter((d) => d.estado !== "anulada");
  const totalDespesas = despesasValidas.reduce(
    (s, d) => s + toXofInteger(d.valorXof),
    0,
  );
  const porCategoria: Record<string, number> = {};
  for (const d of despesasValidas) {
    porCategoria[d.categoria] =
      (porCategoria[d.categoria] ?? 0) + toXofInteger(d.valorXof);
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
    totalFolha = toXofInteger(periodo.totalFolha ?? 0);
    totalLiquido = toXofInteger(periodo.totalLiquido ?? 0);
    totalBruto = toXofInteger(periodo.totalBruto ?? 0);
    estadoSalario = periodo.estado;

    if (totalFolha === 0) {
      const linhas = await db
        .select({
          totalBruto: salaryLines.totalBrutoFinal,
          totalLiquido: salaryLines.totalLiquidoFinal,
        })
        .from(salaryLines)
        .where(eq(salaryLines.periodId, periodo.id));
      totalBruto = linhas.reduce((s, l) => s + toXofInteger(l.totalBruto), 0);
      totalLiquido = linhas.reduce(
        (s, l) => s + toXofInteger(l.totalLiquido),
        0,
      );
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
    .innerJoin(dividendPeriods, eq(dividendLines.periodId, dividendPeriods.id))
    .where(
      and(
        eq(dividendLines.pago, true),
        gte(dividendLines.dataPagamento, start),
        lte(dividendLines.dataPagamento, end)
      )
    );

  const pagoNoMes = linhasDivPagas.reduce(
    (s, l) => s + toXofInteger(l.valorBruto),
    0,
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
    .reduce((s, p) => s + toXofInteger(p.totalDistribuido), 0);

  const margemBruta = facturado - totalDespesas;
  const margemLiquida = margemBruta - totalFolha;
  const cashflow = recebido - totalDespesas - totalLiquido - pagoNoMes;
  const saldoGlobal = cashflow;

  return {
    ano,
    mes,
    periodoTipo: "mensal",
    periodoLabel: `${String(mes).padStart(2, "0")}/${ano}`,
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
      saldoGlobal,
    },
  };
}

export async function getMonthlyProfitLoss(
  ano: number,
  mes: number
): Promise<ProfitLossReport> {
  const { user } = await assertReportsAccess();
  return withAuthenticatedDb(user, async (db) => computeMonthlyProfitLoss(db, ano, mes));
}

export async function getQuarterlyProfitLoss(
  ano: number,
  trimestre: number
): Promise<ProfitLossReport> {
  const { user } = await assertReportsAccess();
  return withAuthenticatedDb(user, async (db) =>
    getQuarterlyProfitLossForDb(db, ano, trimestre)
  );
}

export async function getMonthlyProfitLossSystem(
  ano: number,
  mes: number
): Promise<ProfitLossReport> {
  return computeMonthlyProfitLoss(dbAdmin, ano, mes);
}

async function getQuarterlyProfitLossForDb(
  db: typeof dbAdmin,
  ano: number,
  trimestre: number
): Promise<ProfitLossReport> {
  if (trimestre < 1 || trimestre > 4) {
    throw new Error("Trimestre inválido");
  }

  const mesInicial = (trimestre - 1) * 3 + 1;
  const meses = [mesInicial, mesInicial + 1, mesInicial + 2];
  const monthlyReports = await Promise.all(
    meses.map((mes) => computeMonthlyProfitLoss(db, ano, mes))
  );

  const porCategoria: Record<string, number> = {};
  for (const report of monthlyReports) {
    for (const [cat, value] of Object.entries(report.despesas.porCategoria)) {
      porCategoria[cat] = (porCategoria[cat] ?? 0) + value;
    }
  }

  const facturado = monthlyReports.reduce((s, r) => s + r.receitas.facturado, 0);
  const recebido = monthlyReports.reduce((s, r) => s + r.receitas.recebido, 0);
  const totalDespesas = monthlyReports.reduce((s, r) => s + r.despesas.total, 0);
  const totalFolha = monthlyReports.reduce((s, r) => s + r.salarios.totalFolha, 0);
  const totalLiquido = monthlyReports.reduce((s, r) => s + r.salarios.totalLiquido, 0);
  const totalBruto = monthlyReports.reduce((s, r) => s + r.salarios.totalBruto, 0);
  const totalDistribuido = monthlyReports.reduce(
    (s, r) => s + r.dividendos.totalDistribuido,
    0
  );
  const pagoNoMes = monthlyReports.reduce((s, r) => s + r.dividendos.pagoNoMes, 0);
  let saldoAcumulado = 0;
  const monthlyBreakdown: ProfitLossMonthSummary[] = monthlyReports.map((report) => {
    saldoAcumulado += report.resultado.saldoGlobal;

    return {
      ano: report.ano,
      mes: report.mes,
      label: MES_LABELS[report.mes],
      facturado: report.receitas.facturado,
      recebido: report.receitas.recebido,
      despesas: report.despesas.total,
      folha: report.salarios.totalFolha,
      folhaLiquida: report.salarios.totalLiquido,
      dividendosPagos: report.dividendos.pagoNoMes,
      cashflow: report.resultado.cashflow,
      saldoGlobal: report.resultado.saldoGlobal,
      saldoAcumulado,
    };
  });

  const margemBruta = facturado - totalDespesas;
  const margemLiquida = margemBruta - totalFolha;
  const cashflow = recebido - totalDespesas - totalLiquido - pagoNoMes;
  const saldoGlobal = cashflow;

  return {
    ano,
    mes: meses[2],
    trimestre,
    periodoTipo: "trimestral",
    periodoLabel: `T${trimestre} ${ano}`,
    monthlyBreakdown,
    receitas: {
      facturado,
      recebido,
      facturasCount: monthlyReports.reduce((s, r) => s + r.receitas.facturasCount, 0),
      pagamentosCount: monthlyReports.reduce(
        (s, r) => s + r.receitas.pagamentosCount,
        0
      ),
    },
    despesas: {
      total: totalDespesas,
      porCategoria,
      count: monthlyReports.reduce((s, r) => s + r.despesas.count, 0),
    },
    salarios: {
      totalFolha,
      totalLiquido,
      totalBruto,
      estado: "Consolidado trimestral",
    },
    dividendos: {
      totalDistribuido,
      pagoNoMes,
    },
    resultado: {
      margemBruta,
      margemLiquida,
      cashflow,
      saldoGlobal,
    },
  };
}

export async function getQuarterlyProfitLossSystem(
  ano: number,
  trimestre: number
): Promise<ProfitLossReport> {
  return getQuarterlyProfitLossForDb(dbAdmin, ano, trimestre);
}
