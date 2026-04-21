"use server";

import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import {
  projects,
  projectAssistants,
  users,
  clients,
  servicesCatalog,
} from "@/lib/db/schema";
import { eq, and, ilike, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/actions";
import { insertAuditLog } from "@/lib/db/audit";

const projectSchema = z.object({
  clientId: z.string().uuid("Cliente inválido"),
  servicoId: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  titulo: z.string().min(2, "Título obrigatório"),
  descricao: z.string().optional(),
  dataInicio: z.string().min(1, "Data de início obrigatória"),
  dataFimEstimada: z.string().optional().transform(v => v || null),
  estado: z.enum(["proposta", "activo", "pausado", "concluido", "cancelado"]).default("proposta"),
  pontoFocalId: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  valorPrevisto: z.string().optional().transform(v => v || null),
  moeda: z.enum(["XOF", "EUR", "USD"]).default("XOF"),
  notas: z.string().optional(),
  assistants: z.array(z.string().uuid()).default([]),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export async function listProjects(search?: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  const where = search
    ? or(ilike(projects.titulo, `%${search}%`))
    : undefined;

  return dbAdmin.query.projects.findMany({
    where,
    with: {
      client: true,
      pontoFocal: { columns: { id: true, nomeCurto: true } },
      assistants: { with: { user: { columns: { id: true, nomeCurto: true } } } },
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
}

export async function getProject(id: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");

  return dbAdmin.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      client: true,
      servico: true,
      pontoFocal: { columns: { id: true, nomeCurto: true, nomeCompleto: true } },
      assistants: { with: { user: { columns: { id: true, nomeCurto: true, nomeCompleto: true } } } },
      invoices: { columns: { id: true, numero: true, estado: true, total: true, moeda: true }, limit: 10 },
    },
  });
}

export async function createProject(_: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg", "coord"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const assistantsRaw = formData.getAll("assistants[]").map(String);

  const parsed = projectSchema.safeParse({
    clientId: formData.get("clientId"),
    servicoId: formData.get("servicoId") || undefined,
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
    dataInicio: formData.get("dataInicio"),
    dataFimEstimada: formData.get("dataFimEstimada") || undefined,
    estado: formData.get("estado") || "proposta",
    pontoFocalId: formData.get("pontoFocalId") || undefined,
    valorPrevisto: formData.get("valorPrevisto") || undefined,
    moeda: formData.get("moeda") || "XOF",
    notas: formData.get("notas") || undefined,
    assistants: assistantsRaw,
  });

  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { assistants, ...projectData } = parsed.data;

  const [created] = await dbAdmin
    .insert(projects)
    .values({ ...projectData, createdBy: dbUser.id })
    .returning();

  if (assistants.length > 0) {
    await dbAdmin.insert(projectAssistants).values(
      assistants.map((userId) => ({ projectId: created.id, userId }))
    );
  }

  await insertAuditLog({
    userId: dbUser.id,
    acao: "create",
    entidade: "projects",
    entidadeId: created.id,
    dadosDepois: created,
  });

  revalidatePath("/admin/projects");
  return { success: true, id: created.id };
}

export async function updateProject(id: string, _: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg", "coord"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const assistantsRaw = formData.getAll("assistants[]").map(String);

  const parsed = projectSchema.safeParse({
    clientId: formData.get("clientId"),
    servicoId: formData.get("servicoId") || undefined,
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
    dataInicio: formData.get("dataInicio"),
    dataFimEstimada: formData.get("dataFimEstimada") || undefined,
    estado: formData.get("estado") || "proposta",
    pontoFocalId: formData.get("pontoFocalId") || undefined,
    valorPrevisto: formData.get("valorPrevisto") || undefined,
    moeda: formData.get("moeda") || "XOF",
    notas: formData.get("notas") || undefined,
    assistants: assistantsRaw,
  });

  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const existing = await dbAdmin.query.projects.findFirst({
    where: eq(projects.id, id),
  });
  if (!existing) return { error: "Projecto não encontrado" };

  const { assistants, ...projectData } = parsed.data;

  const [updated] = await dbAdmin
    .update(projects)
    .set({ ...projectData, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  // Replace assistants
  await dbAdmin.delete(projectAssistants).where(eq(projectAssistants.projectId, id));
  if (assistants.length > 0) {
    await dbAdmin.insert(projectAssistants).values(
      assistants.map((userId) => ({ projectId: id, userId }))
    );
  }

  await insertAuditLog({
    userId: dbUser.id,
    acao: "update",
    entidade: "projects",
    entidadeId: id,
    dadosAntes: existing,
    dadosDepois: updated,
  });

  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function updateProjectEstado(id: string, estado: string) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg", "coord"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const valid = ["proposta", "activo", "pausado", "concluido", "cancelado"];
  if (!valid.includes(estado)) return { error: "Estado inválido" };

  await dbAdmin
    .update(projects)
    .set({ estado: estado as never, updatedAt: new Date() })
    .where(eq(projects.id, id));

  revalidatePath(`/admin/projects/${id}`);
  revalidatePath("/admin/projects");
  return { success: true };
}
