import { describe, it, expect } from "vitest";
import { calculateActual2024 } from "@/lib/salary/engines/actual-2024";
import type { Actual2024PolicyConfig, ProjectInput, StaffInput } from "@/lib/salary/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Designed to exactly reproduce SPEC acceptance values (ABIPTOM_ADMIN_CLAUDE_CODE_PROMPT.md):
//   Arianna PF = 210.500 XOF, subsídio = 5.456 XOF, outros = 50.000 XOF → total 265.956 XOF
//
// Math: 4 projects (2 with 1-aux, 2 with 2-aux)
//   S1 (1-aux nets: 250k+180k = 430k) → Arianna PF = 30% × 430k = 129.000
//   S2 (2-aux nets: 200k+126k = 326k) → Arianna PF = 25% × 326k =  81.500
//   Total Arianna PF = 210.500 ✓
//   Total Resto      = 50% × 756k  = 378.000 ✓
//   Saldo            = 378k - 179.600 = 198.400 ✓
//   Subsídio total   = 198.400 × 22% = 43.648 → 43.648 / 8 = 5.456 ✓

const ARIANNA = "arianna";
const ALISSON = "alisson";
const AMELISSA = "amelissa";
const EMERSON = "emerson";
const SWELINE = "sweline";
const VALBER = "valber";

const policy: Actual2024PolicyConfig = {
  tipo: "actual_2024",
  percentagens: {
    pf_0aux: 0.30,
    pf_1aux: 0.30,
    pf_2aux: 0.25,
    aux_1aux: 0.15,
    aux_2aux: 0.10,
    dg: 0.05,
    resto: 0.50,
  },
  subsidio: { percentagem: 0.22, numPessoas: 8 },
};

const staff: StaffInput[] = [
  { id: ARIANNA, nomeCurto: "Arianna", role: "staff", salarioBase: 0 },
  { id: ALISSON, nomeCurto: "Alisson", role: "staff", salarioBase: 0 },
  { id: AMELISSA, nomeCurto: "Amelissa", role: "staff", salarioBase: 0 },
  { id: EMERSON, nomeCurto: "Emerson", role: "dg", salarioBase: 37_500 },
  { id: SWELINE, nomeCurto: "Sweline", role: "coord", salarioBase: 0 },
  { id: VALBER, nomeCurto: "Valber", role: "staff", salarioBase: 0 },
  { id: "jose", nomeCurto: "José", role: "staff", salarioBase: 0 },
  { id: "carlos", nomeCurto: "Carlos", role: "staff", salarioBase: 0 },
];

const projects: ProjectInput[] = [
  { id: "p1", titulo: "Proj 1", valorLiquido: 250_000, pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }] },
  { id: "p2", titulo: "Proj 2", valorLiquido: 180_000, pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }] },
  { id: "p3", titulo: "Proj 3", valorLiquido: 200_000, pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }, { userId: AMELISSA }] },
  { id: "p4", titulo: "Proj 4", valorLiquido: 126_000, pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }, { userId: AMELISSA }] },
];

const OPS = 179_600;
const overrides = [{ userId: ARIANNA, outrosBeneficios: 50_000, overrideMotivo: "Benefício mensal" }];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("actual_2024 — percentagens por projecto", () => {
  it("1 aux → PF 30%, Aux 15%, Resto 50%", () => {
    const p: ProjectInput[] = [{
      id: "t", titulo: "T", valorLiquido: 100_000,
      pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }],
    }];
    const r = calculateActual2024(policy, p, staff, 0);
    const pf = r.lines.find((l) => l.userId === ARIANNA)!.componenteDinamica[0];
    const ax = r.lines.find((l) => l.userId === ALISSON)!.componenteDinamica[0];
    expect(pf.valorRecebido).toBe(30_000);
    expect(ax.valorRecebido).toBe(15_000);
    expect(r.summary.entradas_brutas_abiptom).toBe(50_000);
  });

  it("2 aux → PF 25%, Aux1 10%, Aux2 10%, Resto 50%", () => {
    const p: ProjectInput[] = [{
      id: "t", titulo: "T", valorLiquido: 100_000,
      pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }, { userId: AMELISSA }],
    }];
    const r = calculateActual2024(policy, p, staff, 0);
    const pf = r.lines.find((l) => l.userId === ARIANNA)!.componenteDinamica[0];
    const ax1 = r.lines.find((l) => l.userId === ALISSON)!.componenteDinamica[0];
    const ax2 = r.lines.find((l) => l.userId === AMELISSA)!.componenteDinamica[0];
    expect(pf.valorRecebido).toBe(25_000);
    expect(ax1.valorRecebido).toBe(10_000);
    expect(ax2.valorRecebido).toBe(10_000);
    expect(r.summary.entradas_brutas_abiptom).toBe(50_000);
  });

  it("DG recebe 5% por projecto automaticamente", () => {
    const p: ProjectInput[] = [{
      id: "t", titulo: "T", valorLiquido: 100_000,
      pontoFocalId: ARIANNA, assistants: [{ userId: ALISSON }],
    }];
    const r = calculateActual2024(policy, p, staff, 0);
    const dg = r.lines.find((l) => l.userId === EMERSON)!.componenteDinamica[0];
    expect(dg.papel).toBe("dg");
    expect(dg.valorRecebido).toBe(5_000);
  });

  it("percentagemOverride substitui o padrão", () => {
    const p: ProjectInput[] = [{
      id: "t", titulo: "T", valorLiquido: 100_000,
      pontoFocalId: ARIANNA, pfPercentagemOverride: 0.40,
      assistants: [{ userId: ALISSON, percentagemOverride: 0.20 }],
    }];
    const r = calculateActual2024(policy, p, staff, 0);
    const pf = r.lines.find((l) => l.userId === ARIANNA)!.componenteDinamica[0];
    const ax = r.lines.find((l) => l.userId === ALISSON)!.componenteDinamica[0];
    expect(pf.valorRecebido).toBe(40_000);
    expect(ax.valorRecebido).toBe(20_000);
  });
});

describe("actual_2024 — subsídio mensal", () => {
  it("calcula entradas brutas ABIPTOM correctamente", () => {
    const r = calculateActual2024(policy, projects, staff, OPS);
    expect(r.summary.entradas_brutas_abiptom).toBe(378_000);
  });

  it("calcula saldo correctamente (378.000 - 179.600)", () => {
    const r = calculateActual2024(policy, projects, staff, OPS);
    expect(r.summary.saldo).toBe(198_400);
  });

  it("calcula subsídio por pessoa correctamente (198.400 × 22% / 8)", () => {
    const r = calculateActual2024(policy, projects, staff, OPS);
    expect(r.summary.subsidioPerPerson).toBe(5_456);
  });
});

describe("actual_2024 — cenário Março 2026 (SPEC acceptance)", () => {
  it("Arianna PF total = 210.500 XOF", () => {
    const r = calculateActual2024(policy, projects, staff, OPS, overrides);
    const line = r.lines.find((l) => l.userId === ARIANNA)!;
    const pfTotal = line.componenteDinamica
      .filter((c) => c.papel === "pf")
      .reduce((s, c) => s + c.valorRecebido, 0);
    expect(pfTotal).toBe(210_500);
  });

  it("Arianna total líquido = 265.956 XOF", () => {
    const r = calculateActual2024(policy, projects, staff, OPS, overrides);
    const line = r.lines.find((l) => l.userId === ARIANNA)!;
    expect(line.subsidios.dinamico).toBe(5_456);
    expect(line.outrosBeneficios).toBe(50_000);
    expect(line.totalLiquido).toBe(265_956);
  });
});
