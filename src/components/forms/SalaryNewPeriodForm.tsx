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
import { createPeriod } from "@/lib/salary/actions";
import type { CreatePeriodInput } from "@/lib/salary/actions";

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

interface SalaryNewPeriodFormProps {
  policies: PolicyOption[];
  projects: ProjectOption[];
}

interface ProjectEntry {
  projectId: string;
  included: boolean;
  valorLiquido: string;
}

const MES_OPTIONS = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Marco" },
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
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => CURRENT_YEAR - 1 + index);

export function SalaryNewPeriodForm({
  policies,
  projects,
}: SalaryNewPeriodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ano, setAno] = useState(String(CURRENT_YEAR));
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? "");
  const [entries, setEntries] = useState<ProjectEntry[]>(
    projects.map((project) => ({
      projectId: project.id,
      included: false,
      valorLiquido: "",
    })),
  );

  const selectedPolicy = policies.find((policy) => policy.id === policyId);
  const selectedMonth = MES_OPTIONS.find((option) => option.value === mes);
  const includedEntries = entries.filter((entry) => entry.included);

  function toggleProject(projectId: string) {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.projectId === projectId
          ? { ...entry, included: !entry.included }
          : entry,
      ),
    );
  }

  function setValorLiquido(projectId: string, value: string) {
    setEntries((previous) =>
      previous.map((entry) =>
        entry.projectId === projectId ? { ...entry, valorLiquido: value } : entry,
      ),
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!policyId) {
      setError("Selecciona uma politica salarial.");
      return;
    }

    if (includedEntries.length === 0) {
      setError("Selecciona pelo menos um projecto.");
      return;
    }

    for (const entry of includedEntries) {
      const valor = Number(entry.valorLiquido);
      if (!entry.valorLiquido || Number.isNaN(valor) || valor <= 0) {
        const project = projects.find((item) => item.id === entry.projectId);
        setError(
          `Introduz o valor liquido para o projecto "${project?.titulo ?? entry.projectId}".`,
        );
        return;
      }
    }

    const input: CreatePeriodInput = {
      ano: Number(ano),
      mes: Number(mes),
      policyId,
      projectEntries: includedEntries.map((entry) => ({
        projectId: entry.projectId,
        valorLiquido: Number(entry.valorLiquido),
      })),
    };

    startTransition(async () => {
      const result = await createPeriod(input);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(`/admin/salary/${result.periodId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800">1. Periodo e Politica</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Mes *</Label>
            <Select value={mes} onValueChange={(value) => value && setMes(value)}>
              <SelectTrigger>
                <SelectValue>{selectedMonth?.label ?? "Seleccionar mes"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MES_OPTIONS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Ano *</Label>
            <Select value={ano} onValueChange={(value) => value && setAno(value)}>
              <SelectTrigger>
                <SelectValue>{ano}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Politica *</Label>
            <Select value={policyId} onValueChange={(value) => value && setPolicyId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar politica">
                  {selectedPolicy
                    ? `${selectedPolicy.nome} v${selectedPolicy.versao}`
                    : "Seleccionar politica"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.nome} v{policy.versao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          O periodo e criado em estado aberto. Depois ajustas participantes e so entao corres o calculo.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-800">2. Projectos do periodo</h2>
          <span className="text-sm text-gray-500">
            {includedEntries.length} seleccionado(s)
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum projecto activo encontrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.map((project) => {
              const entry = entries.find((item) => item.projectId === project.id)!;
              return (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 py-3 md:flex-row md:items-center"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      id={`proj-${project.id}`}
                      checked={entry.included}
                      onChange={() => toggleProject(project.id)}
                      className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor={`proj-${project.id}`} className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium text-gray-800">{project.titulo}</p>
                      <p className="text-xs text-gray-400">
                        {project.clienteNome}
                        {project.pontoFocalNome ? ` · PF: ${project.pontoFocalNome}` : ""}
                        {project.assistants.length > 0
                          ? ` · Aux: ${project.assistants
                              .map((assistant) => assistant.nomeCurto)
                              .join(", ")}`
                          : ""}
                      </p>
                    </label>
                  </div>

                  {entry.included && (
                    <div className="w-full md:w-44 md:flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Valor liquido XOF"
                        value={entry.valorLiquido}
                        onChange={(event) => setValorLiquido(project.id, event.target.value)}
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

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "A criar..." : "Criar periodo"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/salary")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
