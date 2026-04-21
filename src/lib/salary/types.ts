export type PolicyType = "actual_2024" | "guia_2026";

// ─── Policy Configs ───────────────────────────────────────────────────────────

export interface Actual2024PolicyConfig {
  tipo: "actual_2024";
  percentagens: {
    pf_0aux: number;  // PF % when no aux  (default 0.30)
    pf_1aux: number;  // PF % when 1 aux   (default 0.30)
    pf_2aux: number;  // PF % when 2+ aux  (default 0.25)
    aux_1aux: number; // Aux % when 1 aux  (default 0.15)
    aux_2aux: number; // Each aux % when 2 (default 0.10)
    dg: number;       // DG %             (default 0.05)
    resto: number;    // Resto ABIPTOM %   (default 0.50)
  };
  subsidio: {
    percentagem: number; // % of saldo for subsídio (default 0.22)
    numPessoas: number;  // people sharing subsídio  (default 8)
  };
}

export interface Guia2026PolicyConfig {
  tipo: "guia_2026";
  percentagens: {
    reserva: number;  // 0.10
    fundo: number;    // 0.05
    pf_1aux: number;  // 0.25
    pf_2aux: number;  // 0.20
    aux_1aux: number; // 0.10
    aux_2aux: number; // 0.075 (each)
    coord: number;    // 0.05
    custos: number;   // 0.20
    margem: number;   // 0.25
  };
}

export type PolicyConfig = Actual2024PolicyConfig | Guia2026PolicyConfig;

// ─── Input Types ─────────────────────────────────────────────────────────────

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
  coordId?: string | null; // guia_2026 coordinator
  assistants: AssistantInput[];
}

export interface SalaryOverride {
  userId: string;
  outrosBeneficios?: number;
  descontos?: number;
  overrideMotivo?: string;
}

// ─── Output Types ────────────────────────────────────────────────────────────

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
  // actual_2024
  entradas_brutas_abiptom?: number;
  saldo?: number;
  subsidioTotal?: number;
  subsidioPerPerson?: number;
  // guia_2026
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
