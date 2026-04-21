"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateAndSavePeriod } from "@/lib/salary/actions";
import type { CalculatePeriodInput } from "@/lib/salary/actions";
import { ChevronDown, ChevronUp } from "lucide-react";

// ─── Prop Types ───────────────────────────────────────────────────────────────

interface PolicyOption {
  id: string;
  nome: string;
  versao: string;
  tipo: string;
}

interface ProjectOption {
  id: string;
  titulo: string;
  clienteNome: string;
  pontoFocalId: string | null;
  pontoFocalNome: string | null;
  assistants: Array<{ userId: string; nomeCurto: string }>;
}

interface StaffOption {
  id: string;
  nomeCurto: string;
  nomeCompleto: string;
  salarioBase: number;
}

interface SalaryNewPeriodFormProps {
  policies: PolicyOption[];
  projects: ProjectOption[];
  staffUsers: StaffOption[];
}

// ─── Internal State ───────────────────────────────────────────────────────────

interface ProjectEntry {
  projectId: string;
  included: boolean;
  valorLiquido: string; // string for controlled input
}

interface StaffOverride {
  userId: string;
  outrosBeneficios: string;
  descontos: string;
  motivo: string;
}

const MES_OPTIONS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 + i);

export function SalaryNewPeriodForm({
  policies,
  projects,
  staffUsers,
}: SalaryNewPeriodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showOverrides, setShowOverrides] = useState(false);

  // Period metadata
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const [operationalExpenses, setOperationalExpenses] = useState("0");

  // Project entries
  const [entries, setEntries] = useState<ProjectEntry[]>(
    projects.map((p) => ({
      projectId: p.id,
      included: false,
      valorLiquido: "",
    }))
  );

  // Staff overrides
  const [overrides, setOverrides] = useState<StaffOverride[]>(
    staffUsers.map((u) => ({
      userId: u.id,
      outrosBeneficios: "0",
      descontos: "0",
      motivo: "",
    }))
  );

  const selectedPolicy = policies.find((p) => p.id === policyId);
  const isActual2024 = selectedPolicy?.tipo === "actual_2024";
  const includedEntries = entries.filter((e) => e.included);

  function toggleProject(projectId: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.projectId === projectId ? { ...e, included: !e.included } : e
      )
    );
  }

  function setValorLiquido(projectId: string, value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.projectId === projectId ? { ...e, valorLiquido: value } : e
      )
    );
  }

  function setOverrideField(
    userId: string,
    field: keyof Omit<StaffOverride, "userId">,
    value: string
  ) {
    setOverrides((prev) =>
      prev.map((o) => (o.userId === userId ? { ...o, [field]: value } : o))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!policyId) {
      setError("Selecciona uma política salarial.");
      return;
    }

    if (includedEntries.length === 0) {
      setError("Selecciona pelo menos um projecto.");
      return;
    }

    for (const entry of includedEntries) {
      const v = Number(entry.valorLiquido);
      if (!entry.valorLiquido || isNaN(v) || v <= 0) {
        const proj = projects.find((p) => p.id === entry.projectId);
        setError(
          `Introduz o valor líquido para o projecto "${proj?.titulo ?? entry.projectId}".`
        );
        return;
      }
    }

    const input: CalculatePeriodInput = {
      ano: Number(ano),
      mes: Number(mes),
      policyId,
      projectEntries: includedEntries.map((e) => ({
        projectId: e.projectId,
        valorLiquido: Number(e.valorLiquido),
      })),
      operationalExpenses: Number(operationalExpenses) || 0,
      overrides: overrides
        .filter(
          (o) =>
            Number(o.outrosBeneficios) > 0 ||
            Number(o.descontos) > 0 ||
            o.motivo.trim() !== ""
        )
        .map((o) => ({
          userId: o.userId,
          outrosBeneficios: Number(o.outrosBeneficios) || undefined,
          descontos: Number(o.descontos) || undefined,
          overrideMotivo: o.motivo || undefined,
        })),
    };

    startTransition(async () => {
      const result = await calculateAndSavePeriod(input);
      if (result?.error) {
        setError(result.error);
      } else if (result?.periodId) {
        router.push(`/admin/salary/${result.periodId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Section 1: Period metadata ── */}
      <section className="rounded-lg border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">1. Período e Política</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Mês *</Label>
            <Select value={mes} onValueChange={(v) => v && setMes(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MES_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Ano *</Label>
            <Select value={ano} onValueChange={(v) => v && setAno(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Política *</Label>
            <Select value={policyId} onValueChange={(v) => v && setPolicyId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar política" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} v{p.versao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Operational expenses — actual_2024 only */}
        {isActual2024 && (
          <div className="space-y-1 max-w-xs">
            <Label htmlFor="opex">Despesas operacionais (XOF)</Label>
            <Input
              id="opex"
              type="number"
              min="0"
              step="1"
              value={operationalExpenses}
              onChange={(e) => setOperationalExpenses(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              Subtrai ao saldo antes de calcular o subsídio.
            </p>
          </div>
        )}
      </section>

      {/* ── Section 2: Projects ── */}
      <section className="rounded-lg border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">2. Projectos do período</h2>
          <span className="text-sm text-gray-500">
            {includedEntries.length} seleccionado(s)
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum projecto activo encontrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.map((proj) => {
              const entry = entries.find((e) => e.projectId === proj.id)!;
              return (
                <div
                  key={proj.id}
                  className="flex items-center gap-4 py-3"
                >
                  <input
                    type="checkbox"
                    id={`proj-${proj.id}`}
                    checked={entry.included}
                    onChange={() => toggleProject(proj.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 flex-shrink-0"
                  />
                  <label
                    htmlFor={`proj-${proj.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {proj.titulo}
                    </p>
                    <p className="text-xs text-gray-400">
                      {proj.clienteNome}
                      {proj.pontoFocalNome
                        ? ` · PF: ${proj.pontoFocalNome}`
                        : ""}
                      {proj.assistants.length > 0
                        ? ` · Aux: ${proj.assistants.map((a) => a.nomeCurto).join(", ")}`
                        : ""}
                    </p>
                  </label>

                  {entry.included && (
                    <div className="w-44 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Valor líquido XOF"
                        value={entry.valorLiquido}
                        onChange={(e) =>
                          setValorLiquido(proj.id, e.target.value)
                        }
                        className="text-right"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 3: Staff overrides (collapsible) ── */}
      <section className="rounded-lg border bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOverrides((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <h2 className="font-semibold text-gray-800">
            3. Outros benefícios e descontos{" "}
            <span className="text-gray-400 font-normal text-sm">(opcional)</span>
          </h2>
          {showOverrides ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {showOverrides && (
          <div className="px-5 pb-5 space-y-3 border-t">
            <div className="grid grid-cols-4 gap-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span>Colaborador</span>
              <span>Outros benefícios (XOF)</span>
              <span>Descontos (XOF)</span>
              <span>Motivo</span>
            </div>
            {staffUsers.map((u) => {
              const ov = overrides.find((o) => o.userId === u.id)!;
              return (
                <div key={u.id} className="grid grid-cols-4 gap-3 items-center">
                  <span className="text-sm text-gray-700">{u.nomeCurto}</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={ov.outrosBeneficios}
                    onChange={(e) =>
                      setOverrideField(u.id, "outrosBeneficios", e.target.value)
                    }
                    className="text-right"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={ov.descontos}
                    onChange={(e) =>
                      setOverrideField(u.id, "descontos", e.target.value)
                    }
                    className="text-right"
                  />
                  <Input
                    type="text"
                    placeholder="opcional"
                    value={ov.motivo}
                    onChange={(e) =>
                      setOverrideField(u.id, "motivo", e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "A calcular..." : "Calcular e guardar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/salary")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
