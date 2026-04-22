import type {
  Actual2024Aggregates,
  Actual2024ProjectBreakdown,
  CalculateActual2024Input,
  CalculateActual2024Output,
  ProjectPaymentRecord,
  SalaryLineCalculated,
} from "../types";
import {
  AssistantSplitError,
  CalculationIntegrityError,
  MultipleRubricaGestaoBeneficiariosError,
} from "../types";

const INTEGRITY_TOLERANCE_XOF = 1;

/**
 * Motor de cálculo para a política actual_2024.
 *
 * Fluxo:
 *   A. Para cada projecto: calcula pagamentoPf, pagamentoAuxTotal (distribuído
 *      pelos auxiliares), pagamentoGestao e restoAbiptom.
 *      Regra de absorção: se um projecto não tem PF, a parcela respectiva
 *      fica naturalmente no restoAbiptom (o motor apenas não gera o pagamento).
 *      O mesmo vale para auxiliares e rubrica de gestão.
 *   B. Agregação mensal: saldo = Σ resto − Σ despesas; bolo = saldo × %subsídio;
 *      subsidio_por_pessoa = bolo / nº elegíveis (0 se ninguém).
 *      TODAS as despesas (com ou sem beneficiário) reduzem o saldo base.
 *   C. Por participante: soma componentes próprias, subsídio se elegível, base
 *      (override ou do user), outros benefícios (despesas destinadas a si).
 *      Desconto percentual aplicado sobre o total bruto para obter o líquido.
 *   D. Validação de integridade: Σ componentes distribuídos = Σ brutos das
 *      linhas, com tolerância de 1 XOF.
 *
 * Nomes do enum `papel` em ProjectPaymentRecord:
 *   "dg" é mantido por compatibilidade com `project_role_enum` na DB; no UI
 *   deve ser apresentado como "Rubrica de Gestão".
 */
export function calculateActual2024(
  input: CalculateActual2024Input
): CalculateActual2024Output {
  const { projects, participants, expenses, users, policyDefaults } = input;
  const warnings: string[] = [];

  // ── Validação prévia ────────────────────────────────────────────────────
  const beneficiariosGestao = participants.filter((p) => p.recebeRubricaGestao);
  if (beneficiariosGestao.length > 1) {
    throw new MultipleRubricaGestaoBeneficiariosError(
      beneficiariosGestao.length
    );
  }
  const beneficiarioGestaoUserId =
    beneficiariosGestao[0]?.userId ?? null;

  const userById = new Map(users.map((u) => [u.id, u]));
  const participantByUserId = new Map(
    participants.map((p) => [p.userId, p])
  );

  // ── Fase A: por projecto ────────────────────────────────────────────────
  const projectBreakdowns: Actual2024ProjectBreakdown[] = [];
  const projectPayments: ProjectPaymentRecord[] = [];
  /** pagamentos_projectos por userId (apenas PF + Aux, não inclui gestão). */
  const pagamentosProjectosPorUser = new Map<string, number>();

  for (const project of projects) {
    const net = project.valorLiquido;
    const pctPf = project.percentagemPf ?? policyDefaults.percentagem_pf;
    const pctAuxTotal =
      project.percentagemAuxTotal ?? policyDefaults.percentagem_aux_total;
    const pctGestao =
      project.percentagemRubricaGestao ??
      policyDefaults.percentagem_rubrica_gestao;

    const hasPf = project.pontoFocalId !== null;
    const hasAux = project.assistants.length > 0;

    const pagamentoPf = hasPf ? Math.round(net * pctPf) : 0;
    const pagamentoAuxTotal = hasAux ? Math.round(net * pctAuxTotal) : 0;
    const pagamentoGestao = Math.round(net * pctGestao);
    const restoAbiptom =
      net - pagamentoPf - pagamentoAuxTotal - pagamentoGestao;

    // PF
    if (hasPf && pagamentoPf > 0) {
      const record: ProjectPaymentRecord = {
        projectId: project.id,
        userId: project.pontoFocalId!,
        papel: "pf",
        percentagemAplicada: pctPf,
        valorLiquidoProjecto: net,
        valorRecebido: pagamentoPf,
      };
      projectPayments.push(record);
      pagamentosProjectosPorUser.set(
        project.pontoFocalId!,
        (pagamentosProjectosPorUser.get(project.pontoFocalId!) ?? 0) +
          pagamentoPf
      );
    }

    // Auxiliares: distribuir pagamentoAuxTotal. Se todos os overrides são
    // null, divisão igualitária. Se algum está definido, todos têm de estar
    // e a soma tem de ser 1.0.
    if (hasAux && pagamentoAuxTotal > 0) {
      const auxCount = project.assistants.length;
      const hasAnyOverride = project.assistants.some(
        (a) => a.percentagemOverride !== null && a.percentagemOverride !== undefined
      );

      let percentagens: number[];
      if (hasAnyOverride) {
        percentagens = project.assistants.map((a) => a.percentagemOverride ?? 0);
        const sum = percentagens.reduce((s, p) => s + p, 0);
        if (Math.abs(sum - 1) > 0.0001) {
          throw new AssistantSplitError(project.id, sum);
        }
      } else {
        percentagens = project.assistants.map(() => 1 / auxCount);
      }

      // Distribuição com arredondamento; último auxiliar absorve o
      // residuo para garantir que a soma fecha.
      let distribuido = 0;
      project.assistants.forEach((aux, idx) => {
        const isLast = idx === project.assistants.length - 1;
        const valor = isLast
          ? pagamentoAuxTotal - distribuido
          : Math.round(pagamentoAuxTotal * percentagens[idx]);
        distribuido += valor;

        const record: ProjectPaymentRecord = {
          projectId: project.id,
          userId: aux.userId,
          papel: "aux",
          percentagemAplicada: pctAuxTotal * percentagens[idx],
          valorLiquidoProjecto: net,
          valorRecebido: valor,
        };
        projectPayments.push(record);
        pagamentosProjectosPorUser.set(
          aux.userId,
          (pagamentosProjectosPorUser.get(aux.userId) ?? 0) + valor
        );
      });
    }

    // Rubrica de Gestão: só gera registo atribuído se houver beneficiário.
    // O agregado total_pagamento_gestao acumula o valor em qualquer caso.
    if (beneficiarioGestaoUserId && pagamentoGestao > 0) {
      const record: ProjectPaymentRecord = {
        projectId: project.id,
        userId: beneficiarioGestaoUserId,
        papel: "dg",
        percentagemAplicada: pctGestao,
        valorLiquidoProjecto: net,
        valorRecebido: pagamentoGestao,
      };
      projectPayments.push(record);
    }

    projectBreakdowns.push({
      projectId: project.id,
      titulo: project.titulo,
      valorLiquido: net,
      pagamentoPf,
      pagamentoAuxTotal,
      pagamentoGestao,
      restoAbiptom,
      percentagemPfAplicada: pctPf,
      percentagemAuxTotalAplicada: pctAuxTotal,
      percentagemRubricaGestaoAplicada: pctGestao,
    });
  }

  // ── Fase B: agregação mensal ────────────────────────────────────────────
  const totalRestoAbiptom = projectBreakdowns.reduce(
    (s, p) => s + p.restoAbiptom,
    0
  );
  const totalPagamentoGestao = projectBreakdowns.reduce(
    (s, p) => s + p.pagamentoGestao,
    0
  );

  // Todas as despesas reduzem o saldo. Despesas com moeda ≠ XOF emitem
  // warning e são ignoradas (conversão manual fora de âmbito).
  let totalDespesasOperacionais = 0;
  const expensesXof: typeof expenses = [];
  for (const exp of expenses) {
    if (exp.moeda !== "XOF") {
      warnings.push(
        `Despesa ${exp.id} em moeda ${exp.moeda} foi ignorada no cálculo do saldo.`
      );
      continue;
    }
    totalDespesasOperacionais += exp.valorXof;
    expensesXof.push(exp);
  }

  const saldoBaseSubsidios = totalRestoAbiptom - totalDespesasOperacionais;
  const boloSubsidios = Math.round(
    saldoBaseSubsidios * policyDefaults.percentagem_subsidio
  );

  const elegiveis = participants.filter((p) => p.isElegivelSubsidio);
  const numeroElegiveis = elegiveis.length;
  const subsidioPorPessoa =
    numeroElegiveis > 0 ? Math.round(boloSubsidios / numeroElegiveis) : 0;

  // Outros benefícios por pessoa = Σ despesas com beneficiarioUserId = userId
  const outrosBeneficiosPorUser = new Map<string, number>();
  for (const exp of expensesXof) {
    if (exp.beneficiarioUserId) {
      outrosBeneficiosPorUser.set(
        exp.beneficiarioUserId,
        (outrosBeneficiosPorUser.get(exp.beneficiarioUserId) ?? 0) +
          exp.valorXof
      );
    }
  }

  // ── Fase C: por participante ────────────────────────────────────────────
  const salaryLines: SalaryLineCalculated[] = participants.map((part) => {
    const user = userById.get(part.userId);
    if (!user) {
      throw new Error(
        `Utilizador ${part.userId} em participants não foi encontrado em users`
      );
    }

    const pagamentosProjectos =
      pagamentosProjectosPorUser.get(part.userId) ?? 0;
    const pagamentoGestaoPessoa =
      part.recebeRubricaGestao ? totalPagamentoGestao : 0;
    const subsidioDinamico = part.isElegivelSubsidio ? subsidioPorPessoa : 0;
    const salarioBase =
      part.salarioBaseOverride !== null && part.salarioBaseOverride !== undefined
        ? part.salarioBaseOverride
        : user.salarioBaseMensal;
    const outrosBeneficios = outrosBeneficiosPorUser.get(part.userId) ?? 0;

    const componentesDoUser = projectPayments.filter(
      (r) => r.userId === part.userId
    );

    const totalBrutoCalculado =
      pagamentosProjectos +
      pagamentoGestaoPessoa +
      subsidioDinamico +
      salarioBase +
      outrosBeneficios;

    const descontoPercentagem = user.percentagemDescontoFolha;
    const descontoValor = Math.round(totalBrutoCalculado * descontoPercentagem);
    const totalLiquidoCalculado = totalBrutoCalculado - descontoValor;

    return {
      userId: part.userId,
      salarioBase,
      componenteDinamica: componentesDoUser,
      subsidios: {
        dinamico: subsidioDinamico,
        rubrica_gestao: pagamentoGestaoPessoa,
      },
      outrosBeneficios,
      pagamentosProjectos,
      pagamentoGestaoPessoa,
      subsidioDinamico,
      descontoPercentagem,
      descontoValor,
      totalBrutoCalculado,
      totalLiquidoCalculado,
    };
  });

  const totalFolhaBruto = salaryLines.reduce(
    (s, l) => s + l.totalBrutoCalculado,
    0
  );
  const totalFolhaLiquido = salaryLines.reduce(
    (s, l) => s + l.totalLiquidoCalculado,
    0
  );

  const aggregates: Actual2024Aggregates = {
    totalRestoAbiptom,
    totalPagamentoGestao,
    totalDespesasOperacionais,
    saldoBaseSubsidios,
    boloSubsidios,
    subsidioPorPessoa,
    numeroElegiveis,
    totalFolhaBruto,
    totalFolhaLiquido,
  };

  // ── Fase D: validação de integridade ───────────────────────────────────
  const somaPagamentosProjectos = Array.from(
    pagamentosProjectosPorUser.values()
  ).reduce((s, v) => s + v, 0);
  const somaSalariosBase = salaryLines.reduce((s, l) => s + l.salarioBase, 0);
  const somaOutrosBeneficios = salaryLines.reduce(
    (s, l) => s + l.outrosBeneficios,
    0
  );

  // Gestão: só entra na soma esperada se há beneficiário (senão fica acumulada,
  // não é atribuída a ninguém). Subsídios: só entram se há elegíveis.
  const gestaoAtribuida = beneficiarioGestaoUserId ? totalPagamentoGestao : 0;
  const subsidiosAtribuidos = subsidioPorPessoa * numeroElegiveis;

  const somaBrutaEsperada =
    somaPagamentosProjectos +
    gestaoAtribuida +
    subsidiosAtribuidos +
    somaSalariosBase +
    somaOutrosBeneficios;
  const somaBrutaReal = totalFolhaBruto;
  const diff = Math.abs(somaBrutaEsperada - somaBrutaReal);
  if (diff > INTEGRITY_TOLERANCE_XOF) {
    throw new CalculationIntegrityError({
      expected: somaBrutaEsperada,
      actual: somaBrutaReal,
      diff,
      tolerance: INTEGRITY_TOLERANCE_XOF,
    });
  }

  // Identifica participantes sem user carregado (prevenção de bugs silenciosos)
  for (const part of participants) {
    if (!participantByUserId.has(part.userId)) {
      warnings.push(`Participante duplicado no input: ${part.userId}`);
    }
  }

  return {
    projectBreakdowns,
    projectPayments,
    salaryLines,
    aggregates,
    warnings,
  };
}
