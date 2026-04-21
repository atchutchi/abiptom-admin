import type {
  Actual2024PolicyConfig,
  ProjectInput,
  StaffInput,
  SalaryOverride,
  ProjectPaymentRecord,
  SalaryLineResult,
  SalaryCalculationResult,
} from "../types";

export function calculateActual2024(
  policy: Actual2024PolicyConfig,
  projects: ProjectInput[],
  staff: StaffInput[],
  operationalExpenses: number,
  overrides: SalaryOverride[] = []
): SalaryCalculationResult {
  const cfg = policy.percentagens;

  const projectPayments: ProjectPaymentRecord[] = [];
  const userComponents = new Map<string, ProjectPaymentRecord[]>(
    staff.map((s) => [s.id, []])
  );

  let entradas_brutas = 0;
  const dgUser = staff.find((s) => s.role === "dg");

  for (const project of projects) {
    const net = project.valorLiquido;
    const numAux = project.assistants.length;

    const pfPct =
      project.pfPercentagemOverride ??
      (numAux >= 2 ? cfg.pf_2aux : numAux === 1 ? cfg.pf_1aux : cfg.pf_0aux);
    const auxPctEach = numAux >= 2 ? cfg.aux_2aux : cfg.aux_1aux;

    if (project.pontoFocalId) {
      const record: ProjectPaymentRecord = {
        projectId: project.id,
        userId: project.pontoFocalId,
        papel: "pf",
        percentagemAplicada: pfPct,
        valorLiquidoProjecto: net,
        valorRecebido: Math.round(net * pfPct),
      };
      projectPayments.push(record);
      userComponents.get(project.pontoFocalId)?.push(record);
    }

    for (const aux of project.assistants) {
      const pct = aux.percentagemOverride ?? auxPctEach;
      const record: ProjectPaymentRecord = {
        projectId: project.id,
        userId: aux.userId,
        papel: "aux",
        percentagemAplicada: pct,
        valorLiquidoProjecto: net,
        valorRecebido: Math.round(net * pct),
      };
      projectPayments.push(record);
      userComponents.get(aux.userId)?.push(record);
    }

    if (dgUser) {
      const record: ProjectPaymentRecord = {
        projectId: project.id,
        userId: dgUser.id,
        papel: "dg",
        percentagemAplicada: cfg.dg,
        valorLiquidoProjecto: net,
        valorRecebido: Math.round(net * cfg.dg),
      };
      projectPayments.push(record);
      userComponents.get(dgUser.id)?.push(record);
    }

    entradas_brutas += Math.round(net * cfg.resto);
  }

  const saldo = entradas_brutas - operationalExpenses;
  const subsidioTotal = Math.round(saldo * policy.subsidio.percentagem);
  const subsidioPerPerson = Math.round(
    subsidioTotal / policy.subsidio.numPessoas
  );

  const lines: SalaryLineResult[] = staff.map((member) => {
    const components = userComponents.get(member.id) ?? [];
    const override = overrides.find((o) => o.userId === member.id);

    const componentSum = components.reduce(
      (sum, c) => sum + c.valorRecebido,
      0
    );
    const outrosBeneficios = override?.outrosBeneficios ?? 0;
    const descontos = override?.descontos ?? 0;

    const totalBruto =
      member.salarioBase +
      componentSum +
      subsidioPerPerson +
      outrosBeneficios -
      descontos;

    return {
      userId: member.id,
      salarioBase: member.salarioBase,
      componenteDinamica: components,
      subsidios: { dinamico: subsidioPerPerson },
      outrosBeneficios,
      descontos,
      totalBruto,
      totalLiquido: totalBruto,
    };
  });

  const totalBruto = lines.reduce((sum, l) => sum + l.totalBruto, 0);

  return {
    lines,
    projectPayments,
    summary: {
      totalBruto,
      totalLiquido: totalBruto,
      totalFolha: totalBruto,
      entradas_brutas_abiptom: entradas_brutas,
      saldo,
      subsidioTotal,
      subsidioPerPerson,
    },
  };
}
