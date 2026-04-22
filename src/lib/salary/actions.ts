"use server";

import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import {
  salaryPolicies,
  salaryPeriods,
  salaryLines,
  projectPayments as projectPaymentsTable,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/actions";
import { insertAuditLog } from "@/lib/db/audit";
import { calculateActual2024 } from "./engines/actual-2024";
import { calculateGuia2026Salary } from "./calculator";
import type {
  Actual2024PolicyConfig,
  Actual2024PolicyDefaults,
  CalculateActual2024Input,
  ExpenseForSalary,
  PolicyConfig,
  ProjectInput,
  ProjectWithAssignmentsInput,
  SalaryOverride,
  SalaryPeriodParticipantInput,
  StaffInput,
  UserForSalary,
} from "./types";

// ─── List active policies ────────────────────────────────────────────────────

export async function listSalaryPolicies() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return dbAdmin.query.salaryPolicies.findMany({
    where: eq(salaryPolicies.activo, true),
    orderBy: (p, { desc }) => [desc(p.dataInicio)],
  });
}

// ─── List all periods ─────────────────────────────────────────────────────────

export async function listSalaryPeriods() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return dbAdmin.query.salaryPeriods.findMany({
    with: { policy: { columns: { nome: true, versao: true } } },
    orderBy: (p, { desc }) => [desc(p.ano), desc(p.mes)],
  });
}

// ─── Get period detail with lines ─────────────────────────────────────────────

export async function getSalaryPeriod(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return dbAdmin.query.salaryPeriods.findFirst({
    where: eq(salaryPeriods.id, id),
    with: {
      policy: true,
      lines: {
        with: {
          user: {
            columns: { id: true, nomeCurto: true, nomeCompleto: true, role: true },
          },
        },
        orderBy: (l, { desc }) => [desc(l.totalLiquidoFinal)],
      },
      projectPayments: {
        with: {
          project: { columns: { id: true, titulo: true } },
          user: { columns: { id: true, nomeCurto: true } },
        },
        orderBy: (pp, { asc }) => [asc(pp.projectId)],
      },
    },
  });
}

// ─── Calculate & save period ──────────────────────────────────────────────────

const overrideSchema = z.object({
  userId: z.string().uuid(),
  outrosBeneficios: z.number().min(0).optional(),
  descontos: z.number().min(0).optional(),
  overrideMotivo: z.string().optional(),
});

const projectEntrySchema = z.object({
  projectId: z.string().uuid(),
  valorLiquido: z.number().positive("Valor líquido deve ser positivo"),
  pfPercentagemOverride: z.number().min(0).max(1).nullable().optional(),
  coordId: z.string().uuid().nullable().optional(),
});

const calculatePeriodSchema = z.object({
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  policyId: z.string().uuid(),
  projectEntries: z
    .array(projectEntrySchema)
    .min(1, "Pelo menos um projecto é necessário"),
  operationalExpenses: z.number().min(0).default(0),
  overrides: z.array(overrideSchema).default([]),
});

export type CalculatePeriodInput = z.infer<typeof calculatePeriodSchema>;

export type CalculateAndSavePeriodResult =
  | { success: true; periodId: string; warnings?: string[] }
  | { error: string };

function extractActual2024Defaults(
  policy: Actual2024PolicyConfig
): Actual2024PolicyDefaults {
  return {
    percentagem_pf: policy.percentagens.pf_0aux ?? 0.3,
    percentagem_aux_total: policy.percentagens.aux_1aux ?? 0.15,
    percentagem_rubrica_gestao: policy.percentagens.dg ?? 0.05,
    percentagem_subsidio: policy.subsidio.percentagem ?? 0.22,
  };
}

export async function calculateAndSavePeriod(
  input: CalculatePeriodInput
): Promise<CalculateAndSavePeriodResult> {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) return { error: "Sem permissão" };

  const parsed = calculatePeriodSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const {
    ano,
    mes,
    policyId,
    projectEntries,
    operationalExpenses,
    overrides,
  } = parsed.data;

  const existing = await dbAdmin.query.salaryPeriods.findFirst({
    where: and(
      eq(salaryPeriods.ano, ano),
      eq(salaryPeriods.mes, mes),
      eq(salaryPeriods.policyId, policyId)
    ),
  });
  if (existing)
    return {
      error: `Já existe um período para ${mes}/${ano} com esta política`,
    };

  const policy = await dbAdmin.query.salaryPolicies.findFirst({
    where: eq(salaryPolicies.id, policyId),
  });
  if (!policy) return { error: "Política salarial não encontrada" };
  const policyConfig = policy.configuracaoJson as PolicyConfig;

  if (policyConfig.tipo === "actual_2024") {
    return calculateActual2024AndSave({
      ano,
      mes,
      policyId,
      policyConfig,
      projectEntries,
      operationalExpenses,
      overrides,
      dbUserId: dbUser.id,
    });
  }

  return calculateGuia2026AndSave({
    ano,
    mes,
    policyId,
    policyConfig,
    projectEntries,
    overrides,
    dbUserId: dbUser.id,
  });
}

// ─── actual_2024 path ───────────────────────────────────────────────────────

type CalculateActualArgs = {
  ano: number;
  mes: number;
  policyId: string;
  policyConfig: Actual2024PolicyConfig;
  projectEntries: CalculatePeriodInput["projectEntries"];
  operationalExpenses: number;
  overrides: CalculatePeriodInput["overrides"];
  dbUserId: string;
};

async function calculateActual2024AndSave(
  args: CalculateActualArgs
): Promise<CalculateAndSavePeriodResult> {
  const {
    ano,
    mes,
    policyId,
    policyConfig,
    projectEntries,
    operationalExpenses,
    overrides,
    dbUserId,
  } = args;

  const activeUsers = await dbAdmin.query.users.findMany({
    where: eq(users.activo, true),
    columns: {
      id: true,
      nomeCurto: true,
      role: true,
      salarioBaseMensal: true,
      percentagemDescontoFolha: true,
      elegivelSubsidioDinamicoDefault: true,
    },
  });

  const usersInput: UserForSalary[] = activeUsers.map((u) => ({
    id: u.id,
    nomeCurto: u.nomeCurto,
    salarioBaseMensal: Number(u.salarioBaseMensal ?? 0),
    percentagemDescontoFolha: Number(u.percentagemDescontoFolha ?? 0),
    role: u.role,
  }));

  // Participantes sintéticos: todos os users activos com defaults. Passo 4
  // vai persistir em salary_period_participants, deixando os defaults
  // editáveis antes do cálculo.
  const dgUsers = activeUsers.filter((u) => u.role === "dg");
  const beneficiarioGestaoId = dgUsers.length === 1 ? dgUsers[0].id : null;

  const participantsInput: SalaryPeriodParticipantInput[] = activeUsers.map(
    (u) => ({
      userId: u.id,
      isElegivelSubsidio: u.elegivelSubsidioDinamicoDefault,
      recebeRubricaGestao: u.id === beneficiarioGestaoId,
      salarioBaseOverride: null,
    })
  );

  const projectIds = projectEntries.map((e) => e.projectId);
  const projectRows = await dbAdmin.query.projects.findMany({
    where: (p, { inArray }) => inArray(p.id, projectIds),
    with: {
      assistants: { columns: { userId: true, percentagemOverride: true } },
    },
    columns: {
      id: true,
      titulo: true,
      pontoFocalId: true,
      percentagemPf: true,
      percentagemAuxTotal: true,
      percentagemRubricaGestao: true,
    },
  });
  const projectMap = new Map(projectRows.map((p) => [p.id, p]));

  const projectsInput: ProjectWithAssignmentsInput[] = projectEntries.map(
    (entry) => {
      const proj = projectMap.get(entry.projectId);
      if (!proj)
        throw new Error(`Projecto ${entry.projectId} não encontrado`);
      return {
        id: proj.id,
        titulo: proj.titulo,
        valorLiquido: entry.valorLiquido,
        pontoFocalId: proj.pontoFocalId,
        percentagemPf:
          entry.pfPercentagemOverride ??
          (proj.percentagemPf !== null ? Number(proj.percentagemPf) : null),
        percentagemAuxTotal:
          proj.percentagemAuxTotal !== null
            ? Number(proj.percentagemAuxTotal)
            : null,
        percentagemRubricaGestao:
          proj.percentagemRubricaGestao !== null
            ? Number(proj.percentagemRubricaGestao)
            : null,
        assistants: proj.assistants.map((a) => ({
          userId: a.userId,
          percentagemOverride: a.percentagemOverride
            ? Number(a.percentagemOverride)
            : null,
        })),
      };
    }
  );

  // Converte o lump sum `operationalExpenses` numa despesa sintética sem
  // beneficiário. Os overrides antigos de `outrosBeneficios` passam a
  // despesas sintéticas com beneficiário (transição para o modelo novo;
  // Passo 4 substituirá isto pela leitura directa de `expenses`).
  const syntheticExpenses: ExpenseForSalary[] = [];
  if (operationalExpenses > 0) {
    syntheticExpenses.push({
      id: "synthetic-ops",
      valorXof: operationalExpenses,
      moeda: "XOF",
      beneficiarioUserId: null,
    });
  }
  for (const ov of overrides) {
    if (ov.outrosBeneficios && ov.outrosBeneficios > 0) {
      syntheticExpenses.push({
        id: `synthetic-outros-${ov.userId}`,
        valorXof: ov.outrosBeneficios,
        moeda: "XOF",
        beneficiarioUserId: ov.userId,
      });
    }
  }

  const policyDefaults = extractActual2024Defaults(policyConfig);

  const engineInput: CalculateActual2024Input = {
    period: { year: ano, month: mes },
    projects: projectsInput,
    participants: participantsInput,
    expenses: syntheticExpenses,
    users: usersInput,
    policyDefaults,
  };

  let result;
  try {
    result = calculateActual2024(engineInput);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro no cálculo salarial",
    };
  }

  try {
    const [period] = await dbAdmin
      .insert(salaryPeriods)
      .values({
        ano,
        mes,
        policyId,
        estado: "calculado",
        totalBruto: String(result.aggregates.totalFolhaBruto),
        totalLiquido: String(result.aggregates.totalFolhaLiquido),
        totalFolha: String(result.aggregates.totalFolhaBruto),
        criadoPor: dbUserId,
      })
      .returning();

    const nonZeroLines = result.salaryLines.filter(
      (l) => l.totalBrutoCalculado > 0
    );
    if (nonZeroLines.length > 0) {
      await dbAdmin.insert(salaryLines).values(
        nonZeroLines.map((l) => ({
          periodId: period.id,
          userId: l.userId,
          salarioBase: String(l.salarioBase),
          componenteDinamica: l.componenteDinamica,
          subsidios: l.subsidios,
          outrosBeneficios: String(l.outrosBeneficios),
          descontos: String(l.descontoValor),
          totalBrutoCalculado: String(l.totalBrutoCalculado),
          totalBrutoFinal: String(l.totalBrutoCalculado),
          totalLiquidoCalculado: String(l.totalLiquidoCalculado),
          totalLiquidoFinal: String(l.totalLiquidoCalculado),
          overrideMotivo:
            overrides.find((o) => o.userId === l.userId)?.overrideMotivo ??
            null,
        }))
      );
    }

    if (result.projectPayments.length > 0) {
      await dbAdmin.insert(projectPaymentsTable).values(
        result.projectPayments.map((p) => ({
          periodId: period.id,
          projectId: p.projectId,
          userId: p.userId,
          papel: p.papel,
          percentagemAplicada: String(p.percentagemAplicada),
          valorLiquidoProjecto: String(p.valorLiquidoProjecto),
          valorRecebido: String(p.valorRecebido),
        }))
      );
    }

    await insertAuditLog({
      userId: dbUserId,
      acao: "calculate",
      entidade: "salary_periods",
      entidadeId: period.id,
      dadosDepois: {
        ano,
        mes,
        policyId,
        aggregates: result.aggregates,
        warnings: result.warnings,
      },
    });

    revalidatePath("/admin/salary");
    return {
      success: true,
      periodId: period.id,
      warnings: result.warnings,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erro ao guardar período salarial",
    };
  }
}

// ─── guia_2026 path (legacy) ────────────────────────────────────────────────

type CalculateGuiaArgs = {
  ano: number;
  mes: number;
  policyId: string;
  policyConfig: import("./types").Guia2026PolicyConfig;
  projectEntries: CalculatePeriodInput["projectEntries"];
  overrides: CalculatePeriodInput["overrides"];
  dbUserId: string;
};

async function calculateGuia2026AndSave(
  args: CalculateGuiaArgs
): Promise<CalculateAndSavePeriodResult> {
  const { ano, mes, policyId, policyConfig, projectEntries, overrides, dbUserId } =
    args;

  const staffRows = await dbAdmin.query.users.findMany({
    where: eq(users.activo, true),
    columns: {
      id: true,
      nomeCurto: true,
      role: true,
      salarioBaseMensal: true,
    },
  });
  const staffInput: StaffInput[] = staffRows.map((u) => ({
    id: u.id,
    nomeCurto: u.nomeCurto,
    role: u.role,
    salarioBase: Number(u.salarioBaseMensal ?? 0),
  }));

  const projectIds = projectEntries.map((e) => e.projectId);
  const projectRows = await dbAdmin.query.projects.findMany({
    where: (p, { inArray }) => inArray(p.id, projectIds),
    with: {
      assistants: { columns: { userId: true, percentagemOverride: true } },
    },
    columns: { id: true, titulo: true, pontoFocalId: true },
  });
  const projectMap = new Map(projectRows.map((p) => [p.id, p]));

  const projectInputs: ProjectInput[] = projectEntries.map((entry) => {
    const proj = projectMap.get(entry.projectId);
    if (!proj) throw new Error(`Projecto ${entry.projectId} não encontrado`);
    return {
      id: proj.id,
      titulo: proj.titulo,
      valorLiquido: entry.valorLiquido,
      pontoFocalId: proj.pontoFocalId,
      pfPercentagemOverride: entry.pfPercentagemOverride ?? null,
      coordId: entry.coordId ?? null,
      assistants: proj.assistants.map((a) => ({
        userId: a.userId,
        percentagemOverride: a.percentagemOverride
          ? Number(a.percentagemOverride)
          : null,
      })),
    };
  });

  const salaryOverrides: SalaryOverride[] = overrides.map((o) => ({
    userId: o.userId,
    outrosBeneficios: o.outrosBeneficios,
    descontos: o.descontos,
    overrideMotivo: o.overrideMotivo,
  }));

  let result;
  try {
    result = calculateGuia2026Salary(
      policyConfig,
      projectInputs,
      staffInput,
      salaryOverrides
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro no cálculo salarial",
    };
  }

  const { lines, projectPayments: payments, summary } = result;

  try {
    const [period] = await dbAdmin
      .insert(salaryPeriods)
      .values({
        ano,
        mes,
        policyId,
        estado: "calculado",
        totalBruto: String(summary.totalBruto),
        totalLiquido: String(summary.totalLiquido),
        totalFolha: String(summary.totalFolha),
        criadoPor: dbUserId,
      })
      .returning();

    const nonZeroLines = lines.filter((l) => l.totalLiquido > 0);
    if (nonZeroLines.length > 0) {
      await dbAdmin.insert(salaryLines).values(
        nonZeroLines.map((l) => ({
          periodId: period.id,
          userId: l.userId,
          salarioBase: String(l.salarioBase),
          componenteDinamica: l.componenteDinamica,
          subsidios: l.subsidios,
          outrosBeneficios: String(l.outrosBeneficios),
          descontos: String(l.descontos),
          totalBrutoCalculado: String(l.totalBruto),
          totalBrutoFinal: String(l.totalBruto),
          totalLiquidoCalculado: String(l.totalLiquido),
          totalLiquidoFinal: String(l.totalLiquido),
          overrideMotivo:
            salaryOverrides.find((o) => o.userId === l.userId)
              ?.overrideMotivo ?? null,
        }))
      );
    }

    if (payments.length > 0) {
      await dbAdmin.insert(projectPaymentsTable).values(
        payments.map((p) => ({
          periodId: period.id,
          projectId: p.projectId,
          userId: p.userId,
          papel: p.papel,
          percentagemAplicada: String(p.percentagemAplicada),
          valorLiquidoProjecto: String(p.valorLiquidoProjecto),
          valorRecebido: String(p.valorRecebido),
        }))
      );
    }

    await insertAuditLog({
      userId: dbUserId,
      acao: "calculate",
      entidade: "salary_periods",
      entidadeId: period.id,
      dadosDepois: { ano, mes, policyId, summary },
    });

    revalidatePath("/admin/salary");
    return { success: true, periodId: period.id };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Erro ao guardar período salarial",
    };
  }
}

// ─── Confirm period ───────────────────────────────────────────────────────────

export async function confirmPeriod(periodId: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) return { error: "Sem permissão" };

  const period = await dbAdmin.query.salaryPeriods.findFirst({
    where: eq(salaryPeriods.id, periodId),
  });
  if (!period) return { error: "Período não encontrado" };
  if (period.estado !== "calculado")
    return {
      error: "Apenas períodos em estado 'calculado' podem ser confirmados",
    };

  await dbAdmin
    .update(salaryPeriods)
    .set({
      estado: "confirmado",
      confirmadoEm: new Date(),
      confirmadoPor: dbUser.id,
    })
    .where(eq(salaryPeriods.id, periodId));

  await insertAuditLog({
    userId: dbUser.id,
    acao: "confirm",
    entidade: "salary_periods",
    entidadeId: periodId,
  });

  revalidatePath(`/admin/salary/${periodId}`);
  revalidatePath("/admin/salary");
  return { success: true };
}

// ─── Mark salary line as paid ─────────────────────────────────────────────────

export async function markLinePaid(
  lineId: string,
  data: { dataPagamento: string; referenciaPagamento?: string }
) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role)) return { error: "Sem permissão" };

  await dbAdmin
    .update(salaryLines)
    .set({
      pago: true,
      dataPagamento: data.dataPagamento,
      referenciaPagamento: data.referenciaPagamento ?? null,
    })
    .where(eq(salaryLines.id, lineId));

  const line = await dbAdmin.query.salaryLines.findFirst({
    where: eq(salaryLines.id, lineId),
    columns: { periodId: true },
  });

  if (line) {
    const unpaid = await dbAdmin.query.salaryLines.findMany({
      where: and(
        eq(salaryLines.periodId, line.periodId),
        eq(salaryLines.pago, false)
      ),
      columns: { id: true },
    });

    if (unpaid.length === 0) {
      await dbAdmin
        .update(salaryPeriods)
        .set({ estado: "pago" })
        .where(eq(salaryPeriods.id, line.periodId));
      revalidatePath("/admin/salary");
    }

    revalidatePath(`/admin/salary/${line.periodId}`);
  }

  return { success: true };
}
