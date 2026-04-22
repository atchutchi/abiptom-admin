export type PolicyType = "actual_2024" | "guia_2026";

// ─── Policy Configs (shape in salary_policies.configuracao_json) ─────────────

export interface Actual2024PolicyConfig {
  tipo: "actual_2024";
  percentagens: {
    pf_0aux: number;
    pf_1aux: number;
    pf_2aux: number;
    aux_1aux: number;
    aux_2aux: number;
    dg: number;
    resto: number;
  };
  subsidio: {
    percentagem: number;
    numPessoas: number;
  };
}

export interface Guia2026PolicyConfig {
  tipo: "guia_2026";
  percentagens: {
    reserva: number;
    fundo: number;
    pf_1aux: number;
    pf_2aux: number;
    aux_1aux: number;
    aux_2aux: number;
    coord: number;
    custos: number;
    margem: number;
  };
}

export type PolicyConfig = Actual2024PolicyConfig | Guia2026PolicyConfig;

// ─── Legacy input/output types (used by guia-2026 engine) ────────────────────

export interface StaffInput {
  id: string;
  nomeCurto: string;
  role: "ca" | "dg" | "coord" | "staff";
  salarioBase: number;
}

export interface AssistantInput {
  userId: string;
  percentagemOverride?: number | null;
}

export interface ProjectInput {
  id: string;
  titulo: string;
  valorLiquido: number;
  pontoFocalId: string | null;
  pfPercentagemOverride?: number | null;
  coordId?: string | null;
  assistants: AssistantInput[];
}

export interface SalaryOverride {
  userId: string;
  outrosBeneficios?: number;
  descontos?: number;
  overrideMotivo?: string;
}

export interface ProjectPaymentRecord {
  projectId: string;
  userId: string;
  papel: "pf" | "aux" | "dg" | "coord";
  percentagemAplicada: number;
  valorLiquidoProjecto: number;
  valorRecebido: number;
}

export interface SalaryLineResult {
  userId: string;
  salarioBase: number;
  componenteDinamica: ProjectPaymentRecord[];
  subsidios: Record<string, number>;
  outrosBeneficios: number;
  descontos: number;
  totalBruto: number;
  totalLiquido: number;
}

export interface SalaryCalculationSummary {
  totalBruto: number;
  totalLiquido: number;
  totalFolha: number;
  entradas_brutas_abiptom?: number;
  saldo?: number;
  subsidioTotal?: number;
  subsidioPerPerson?: number;
  reservaEstrategica?: number;
  fundoInvestimento?: number;
  custos?: number;
  margemEmpresa?: number;
}

export interface SalaryCalculationResult {
  lines: SalaryLineResult[];
  projectPayments: ProjectPaymentRecord[];
  summary: SalaryCalculationSummary;
}

// ─── actual_2024 V2 — input / output ────────────────────────────────────────

/**
 * Defaults extraídos da salary_policies.configuracao_json. O motor usa estes
 * valores apenas quando o projecto correspondente NÃO tem o campo preenchido.
 */
export interface Actual2024PolicyDefaults {
  percentagem_pf: number;
  percentagem_aux_total: number;
  percentagem_rubrica_gestao: number;
  percentagem_subsidio: number;
}

export interface ProjectWithAssignmentsInput {
  id: string;
  titulo: string;
  /** valor_facturado − despesas_directas (já resolvido pelo caller). */
  valorLiquido: number;
  pontoFocalId: string | null;
  assistants: AssistantInput[];
  /** Quando null, o motor usa o default da policy. */
  percentagemPf: number | null;
  percentagemAuxTotal: number | null;
  percentagemRubricaGestao: number | null;
}

export interface SalaryPeriodParticipantInput {
  userId: string;
  isElegivelSubsidio: boolean;
  recebeRubricaGestao: boolean;
  salarioBaseOverride: number | null;
}

export interface UserForSalary {
  id: string;
  nomeCurto: string;
  salarioBaseMensal: number;
  percentagemDescontoFolha: number;
  role: "ca" | "dg" | "coord" | "staff";
}

export interface ExpenseForSalary {
  id: string;
  valorXof: number;
  moeda: "XOF" | "EUR" | "USD";
  beneficiarioUserId: string | null;
}

export interface CalculateActual2024Input {
  period: { year: number; month: number };
  projects: ProjectWithAssignmentsInput[];
  participants: SalaryPeriodParticipantInput[];
  expenses: ExpenseForSalary[];
  users: UserForSalary[];
  policyDefaults: Actual2024PolicyDefaults;
}

/** Repartição de um projecto: quanto foi para PF, Aux, Rubrica de Gestão, Resto. */
export interface Actual2024ProjectBreakdown {
  projectId: string;
  titulo: string;
  valorLiquido: number;
  pagamentoPf: number;
  pagamentoAuxTotal: number;
  pagamentoGestao: number;
  restoAbiptom: number;
  percentagemPfAplicada: number;
  percentagemAuxTotalAplicada: number;
  percentagemRubricaGestaoAplicada: number;
}

export interface SalaryLineCalculated {
  userId: string;
  salarioBase: number;
  componenteDinamica: ProjectPaymentRecord[];
  subsidios: { dinamico: number; rubrica_gestao: number };
  outrosBeneficios: number;
  pagamentosProjectos: number;
  pagamentoGestaoPessoa: number;
  subsidioDinamico: number;
  descontoPercentagem: number;
  descontoValor: number;
  totalBrutoCalculado: number;
  totalLiquidoCalculado: number;
}

export interface Actual2024Aggregates {
  totalRestoAbiptom: number;
  totalPagamentoGestao: number;
  totalDespesasOperacionais: number;
  saldoBaseSubsidios: number;
  boloSubsidios: number;
  subsidioPorPessoa: number;
  numeroElegiveis: number;
  totalFolhaBruto: number;
  totalFolhaLiquido: number;
}

export interface CalculateActual2024Output {
  projectBreakdowns: Actual2024ProjectBreakdown[];
  projectPayments: ProjectPaymentRecord[];
  salaryLines: SalaryLineCalculated[];
  aggregates: Actual2024Aggregates;
  warnings: string[];
}

/** Erro lançado quando a soma das partes não bate com os totais brutos (tolerância 1 XOF). */
export class CalculationIntegrityError extends Error {
  public readonly details: {
    expected: number;
    actual: number;
    diff: number;
    tolerance: number;
  };

  constructor(details: {
    expected: number;
    actual: number;
    diff: number;
    tolerance: number;
  }) {
    super(
      `Integridade do cálculo: esperado ${details.expected}, obtido ${details.actual}, diferença ${details.diff} (tolerância ${details.tolerance})`
    );
    this.name = "CalculationIntegrityError";
    this.details = details;
  }
}

/** Erro lançado quando os overrides de percentagem dos auxiliares não somam 1.0. */
export class AssistantSplitError extends Error {
  constructor(projectId: string, actualSum: number) {
    super(
      `Projecto ${projectId}: soma das percentagens dos auxiliares é ${actualSum}, deve ser 1.0`
    );
    this.name = "AssistantSplitError";
  }
}

/** Erro lançado quando há mais do que um beneficiário da rubrica de gestão no período. */
export class MultipleRubricaGestaoBeneficiariosError extends Error {
  constructor(count: number) {
    super(
      `Período tem ${count} beneficiários marcados para a rubrica de gestão; apenas é permitido zero ou um`
    );
    this.name = "MultipleRubricaGestaoBeneficiariosError";
  }
}
