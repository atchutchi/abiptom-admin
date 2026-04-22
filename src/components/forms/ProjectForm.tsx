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
import { createProject, updateProject } from "@/lib/projects/actions";

interface Client {
  id: string;
  nome: string;
}

interface StaffUser {
  id: string;
  nomeCurto: string;
  nomeCompleto: string;
}

interface Service {
  id: string;
  nome: string;
  categoria: string;
}

interface Project {
  id: string;
  clientId: string;
  servicoId: string | null;
  titulo: string;
  descricao: string | null;
  dataInicio: string;
  dataFimEstimada: string | null;
  estado: string;
  pontoFocalId: string | null;
  valorPrevisto: string | null;
  moeda: string;
  notas: string | null;
}

interface ProjectFormProps {
  clients: Client[];
  staffUsers: StaffUser[];
  services: Service[];
  project?: Project;
  assistantIds?: string[];
}

export default function ProjectForm({
  clients,
  staffUsers,
  services,
  project,
  assistantIds = [],
}: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>(assistantIds);

  function toggleAssistant(userId: string) {
    setSelectedAssistants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Inject selected assistants
    selectedAssistants.forEach((id) => formData.append("assistants[]", id));

    startTransition(async () => {
      const result = project
        ? await updateProject(project.id, null, formData)
        : await createProject(null, formData);

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/admin/projects");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            name="titulo"
            defaultValue={project?.titulo ?? ""}
            placeholder="Nome do projecto"
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="clientId">Cliente *</Label>
          <Select name="clientId" defaultValue={project?.clientId ?? ""} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="servicoId">Serviço</Label>
          <Select name="servicoId" defaultValue={project?.servicoId ?? ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="(opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="dataInicio">Data de início *</Label>
          <Input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={project?.dataInicio ?? ""}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="dataFimEstimada">Data fim estimada</Label>
          <Input
            id="dataFimEstimada"
            name="dataFimEstimada"
            type="date"
            defaultValue={project?.dataFimEstimada ?? ""}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="estado">Estado</Label>
          <Select name="estado" defaultValue={project?.estado ?? "proposta"}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proposta">Proposta</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="pontoFocalId">Ponto Focal (PF)</Label>
          <Select name="pontoFocalId" defaultValue={project?.pontoFocalId ?? ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar PF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {staffUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nomeCurto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="valorPrevisto">Valor previsto (XOF)</Label>
          <Input
            id="valorPrevisto"
            name="valorPrevisto"
            type="number"
            min="0"
            step="1"
            defaultValue={project?.valorPrevisto ?? ""}
            placeholder="0"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="moeda">Moeda</Label>
          <Select name="moeda" defaultValue={project?.moeda ?? "XOF"}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XOF">XOF</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Auxiliares */}
      <div className="space-y-2">
        <Label>Auxiliares</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3">
          {staffUsers.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedAssistants.includes(u.id)}
                onChange={() => toggleAssistant(u.id)}
                className="rounded"
              />
              {u.nomeCurto}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {selectedAssistants.length === 0
            ? "Nenhum auxiliar seleccionado"
            : `${selectedAssistants.length} auxiliar(es) seleccionado(s)`}
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="descricao">Descrição</Label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={project?.descricao ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descrição do projecto..."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notas">Notas internas</Label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          defaultValue={project?.notas ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "A guardar..." : project ? "Actualizar" : "Criar projecto"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/projects")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
