"use server";

import { z } from "zod";
import { db } from "@/lib/db";
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
import { calculateSalary } from "./calculator";
import type { PolicyConfig, ProjectInput, StaffInput, SalaryOverride } from "./types";

// ─── List active policies ────────────────────────────────────────────────────

export async function listSalaryPolicies() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return db.query.salaryPolicies.findMany({
    where: eq(salaryPolicies.activo, true),
    orderBy: (p, { desc }) => [desc(p.dataInicio)],
  });
}

// ─── List all periods ─────────────────────────────────────────────────────────

export async function listSalaryPeriods() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return db.query.salaryPeriods.findMany({
    with: { policy: { columns: { nome: true, versao: true } } },
    orderBy: (p, { desc }) => [desc(p.ano), desc(p.mes)],
  });
}

// ─── Get period detail with lines ─────────────────────────────────────────────

export async function getSalaryPeriod(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return db.query.salaryPeriods.findFirst({
    where: eq(salaryPeriods.id, id),
    with: {
      policy: true,
      lines: {
        with: {
          user: {
            columns: { id: true, nomeCurto: true, nomeCompleto: true, role: true },
          },
        },
        orderBy: (l, { desc }) => [desc(l.totalLiquido)],
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

export async function calculateAndSavePeriod(input: CalculatePeriodInput) {
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

  // Duplicate check
  const existing = await db.query.salaryPeriods.findFirst({
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

  // Load policy config
  const policy = await db.query.salaryPolicies.findFirst({
    where: eq(salaryPolicies.id, policyId),
  });
  if (!policy) return { error: "Política salarial não encontrada" };
  const policyConfig = policy.configuracaoJson as PolicyConfig;

  // Load active staff
  const staffRows = await db.query.users.findMany({
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

  // Load projects with assistants
  const projectIds = projectEntries.map((e) => e.projectId);
  const projectRows = await db.query.projects.findMany({
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

  // Run engine
  let result;
  try {
    result = calculateSalary(
      policyConfig,
      projectInputs,
      staffInput,
      operationalExpenses,
      salaryOverrides
    );
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Erro no cálculo salarial",
    };
  }

  const { lines, projectPayments: payments, summary } = result;

  // Save to DB
  try {
    const [period] = await db
      .insert(salaryPeriods)
      .values({
        ano,
        mes,
        policyId,
        estado: "calculado",
        totalBruto: String(summary.totalBruto),
        totalLiquido: String(summary.totalLiquido),
        totalFolha: String(summary.totalFolha),
        criadoPor: dbUser.id,
      })
      .returning();

    const nonZeroLines = lines.filter((l) => l.totalLiquido > 0);
    if (nonZeroLines.length > 0) {
      await db.insert(salaryLines).values(
        nonZeroLines.map((l) => ({
          periodId: period.id,
          userId: l.userId,
          salarioBase: String(l.salarioBase),
          componenteDinamica: l.componenteDinamica,
          subsidios: l.subsidios,
          outrosBeneficios: String(l.outrosBeneficios),
          descontos: String(l.descontos),
          totalBruto: String(l.totalBruto),
          totalLiquido: String(l.totalLiquido),
          overrideMotivo:
            salaryOverrides.find((o) => o.userId === l.userId)
              ?.overrideMotivo ?? null,
        }))
      );
    }

    if (payments.length > 0) {
      await db.insert(projectPaymentsTable).values(
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
      userId: dbUser.id,
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

  const period = await db.query.salaryPeriods.findFirst({
    where: eq(salaryPeriods.id, periodId),
  });
  if (!period) return { error: "Período não encontrado" };
  if (period.estado !== "calculado")
    return {
      error: "Apenas períodos em estado 'calculado' podem ser confirmados",
    };

  await db
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

  await db
    .update(salaryLines)
    .set({
      pago: true,
      dataPagamento: data.dataPagamento,
      referenciaPagamento: data.referenciaPagamento ?? null,
    })
    .where(eq(salaryLines.id, lineId));

  // Fetch the period id to check if all lines are now paid
  const line = await db.query.salaryLines.findFirst({
    where: eq(salaryLines.id, lineId),
    columns: { periodId: true },
  });

  if (line) {
    const unpaid = await db.query.salaryLines.findMany({
      where: and(
        eq(salaryLines.periodId, line.periodId),
        eq(salaryLines.pago, false)
      ),
      columns: { id: true },
    });

    if (unpaid.length === 0) {
      await db
        .update(salaryPeriods)
        .set({ estado: "pago" })
        .where(eq(salaryPeriods.id, line.periodId));
      revalidatePath("/admin/salary");
    }

    revalidatePath(`/admin/salary/${line.periodId}`);
  }

  return { success: true };
}
