"use server";

import { z } from "zod";
import { and, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { withAuthenticatedDb } from "@/lib/db";
import { insertAuditLog } from "@/lib/db/audit";
import { clients, tasks, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/actions";

export interface TaskFilters {
  estado?: string;
  prioridade?: string;
  atribuidaA?: string;
  q?: string;
  prazoDe?: string;
  prazoAte?: string;
  onlyMine?: boolean;
}

const taskSchema = z.object({
  titulo: z.string().trim().min(3, "Título obrigatório"),
  descricao: z.string().trim().optional(),
  atribuidaA: z.string().uuid("Colaborador inválido"),
  projectoId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  prazo: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Prazo inválido"),
  prioridade: z.enum(["baixa", "media", "alta"]).default("media"),
  estado: z.enum(["pendente", "em_curso", "concluida", "cancelada"]).default("pendente"),
});

const taskStateSchema = z.object({
  estado: z.enum(["pendente", "em_curso", "concluida", "cancelada"]),
});

async function requireTaskAccess() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  return { user, dbUser };
}

function canManageTasks(role: string) {
  return role === "ca" || role === "dg" || role === "coord";
}

export async function listTasks(filters: TaskFilters = {}) {
  const { user, dbUser } = await requireTaskAccess();

  const conditions: SQL[] = [];

  if (dbUser.role === "staff") {
    conditions.push(eq(tasks.atribuidaA, dbUser.id));
  }

  if (filters.onlyMine) {
    conditions.push(eq(tasks.atribuidaA, dbUser.id));
  }

  if (filters.estado && ["pendente", "em_curso", "concluida", "cancelada"].includes(filters.estado)) {
    conditions.push(eq(tasks.estado, filters.estado as "pendente" | "em_curso" | "concluida" | "cancelada"));
  }

  if (filters.prioridade && ["baixa", "media", "alta"].includes(filters.prioridade)) {
    conditions.push(eq(tasks.prioridade, filters.prioridade as "baixa" | "media" | "alta"));
  }

  if (filters.atribuidaA && canManageTasks(dbUser.role)) {
    conditions.push(eq(tasks.atribuidaA, filters.atribuidaA));
  }

  if (filters.prazoDe && /^\d{4}-\d{2}-\d{2}$/.test(filters.prazoDe)) {
    conditions.push(gte(tasks.prazo, filters.prazoDe));
  }

  if (filters.prazoAte && /^\d{4}-\d{2}-\d{2}$/.test(filters.prazoAte)) {
    conditions.push(lte(tasks.prazo, filters.prazoAte));
  }

  if (filters.q) {
    conditions.push(ilike(tasks.titulo, `%${filters.q}%`));
  }

  return withAuthenticatedDb(user, async (db) =>
    db.query.tasks.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(tasks.createdAt)],
      with: {
        atribuidaA: {
          columns: {
            id: true,
            nomeCurto: true,
            role: true,
          },
        },
        atribuidaPor: {
          columns: {
            id: true,
            nomeCurto: true,
          },
        },
        projecto: {
          columns: {
            id: true,
            titulo: true,
          },
        },
        cliente: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
    })
  );
}

export async function getTask(id: string) {
  const { user, dbUser } = await requireTaskAccess();

  const task = await withAuthenticatedDb(user, async (db) =>
    db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        atribuidaA: {
          columns: {
            id: true,
            nomeCurto: true,
            role: true,
            email: true,
          },
        },
        atribuidaPor: {
          columns: {
            id: true,
            nomeCurto: true,
          },
        },
        projecto: {
          columns: {
            id: true,
            titulo: true,
          },
        },
        cliente: {
          columns: {
            id: true,
            nome: true,
          },
        },
      },
    })
  );

  if (!task) return null;

  if (dbUser.role === "staff" && task.atribuidaA !== dbUser.id) {
    throw new Error("Sem permissão");
  }

  return task;
}

export async function listAssignableUsers() {
  const { user, dbUser } = await requireTaskAccess();
  if (!canManageTasks(dbUser.role)) return [];

  return withAuthenticatedDb(user, async (db) =>
    db.query.users.findMany({
      where: eq(users.activo, true),
      orderBy: (u, { asc }) => [asc(u.nomeCurto)],
      columns: {
        id: true,
        nomeCurto: true,
        role: true,
      },
    })
  );
}

export async function listTaskProjectOptions() {
  const { user, dbUser } = await requireTaskAccess();
  if (!canManageTasks(dbUser.role)) return [];

  return withAuthenticatedDb(user, async (db) =>
    db.query.projects.findMany({
      orderBy: (p, { asc }) => [asc(p.titulo)],
      columns: {
        id: true,
        titulo: true,
      },
    })
  );
}

export async function listTaskClientOptions() {
  const { user, dbUser } = await requireTaskAccess();
  if (!canManageTasks(dbUser.role)) return [];

  return withAuthenticatedDb(user, async (db) =>
    db.query.clients.findMany({
      where: eq(clients.activo, true),
      orderBy: (c, { asc }) => [asc(c.nome)],
      columns: {
        id: true,
        nome: true,
      },
    })
  );
}

export async function createTask(_: unknown, formData: FormData) {
  const { user, dbUser } = await requireTaskAccess();
  if (!canManageTasks(dbUser.role)) return { error: "Sem permissão" };

  const parsed = taskSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: (formData.get("descricao") as string) || undefined,
    atribuidaA: formData.get("atribuidaA"),
    projectoId: (formData.get("projectoId") as string) || undefined,
    clienteId: (formData.get("clienteId") as string) || undefined,
    prazo: (formData.get("prazo") as string) || undefined,
    prioridade: (formData.get("prioridade") as string) || "media",
    estado: (formData.get("estado") as string) || "pendente",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const data = parsed.data;

  const [created] = await withAuthenticatedDb(user, async (db) =>
    db
      .insert(tasks)
      .values({
        titulo: data.titulo,
        descricao: data.descricao || null,
        atribuidaA: data.atribuidaA,
        atribuidaPor: dbUser.id,
        projectoId: data.projectoId || null,
        clienteId: data.clienteId || null,
        prazo: data.prazo || null,
        prioridade: data.prioridade,
        estado: data.estado,
        concluidaEm: data.estado === "concluida" ? new Date() : null,
      })
      .returning()
  );

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "create",
    entidade: "tasks",
    entidadeId: created.id,
    dadosDepois: created,
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/me/tasks");
  revalidatePath("/staff/me/dashboard");

  return { success: true, id: created.id };
}

export async function updateTask(id: string, _: unknown, formData: FormData) {
  const { user, dbUser } = await requireTaskAccess();
  if (!canManageTasks(dbUser.role)) return { error: "Sem permissão" };

  const existing = await withAuthenticatedDb(user, async (db) =>
    db.query.tasks.findFirst({ where: eq(tasks.id, id) })
  );
  if (!existing) return { error: "Tarefa não encontrada" };

  const parsed = taskSchema.safeParse({
    titulo: formData.get("titulo"),
    descricao: (formData.get("descricao") as string) || undefined,
    atribuidaA: formData.get("atribuidaA"),
    projectoId: (formData.get("projectoId") as string) || undefined,
    clienteId: (formData.get("clienteId") as string) || undefined,
    prazo: (formData.get("prazo") as string) || undefined,
    prioridade: (formData.get("prioridade") as string) || existing.prioridade,
    estado: (formData.get("estado") as string) || existing.estado,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const data = parsed.data;

  const [updated] = await withAuthenticatedDb(user, async (db) =>
    db
      .update(tasks)
      .set({
        titulo: data.titulo,
        descricao: data.descricao || null,
        atribuidaA: data.atribuidaA,
        projectoId: data.projectoId || null,
        clienteId: data.clienteId || null,
        prazo: data.prazo || null,
        prioridade: data.prioridade,
        estado: data.estado,
        concluidaEm:
          data.estado === "concluida"
            ? existing.concluidaEm ?? new Date()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
  );

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "update",
    entidade: "tasks",
    entidadeId: id,
    dadosAntes: existing,
    dadosDepois: updated,
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${id}`);
  revalidatePath("/staff/me/tasks");
  revalidatePath("/staff/me/dashboard");

  return { success: true };
}

export async function setTaskState(id: string, _: unknown, formData: FormData) {
  const { user, dbUser } = await requireTaskAccess();

  const existing = await withAuthenticatedDb(user, async (db) =>
    db.query.tasks.findFirst({ where: eq(tasks.id, id) })
  );
  if (!existing) return { error: "Tarefa não encontrada" };

  const canManage = canManageTasks(dbUser.role);
  const isAssignee = existing.atribuidaA === dbUser.id;

  if (!canManage && !isAssignee) {
    return { error: "Sem permissão" };
  }

  const parsed = taskStateSchema.safeParse({
    estado: formData.get("estado"),
  });

  if (!parsed.success) {
    return { error: "Estado inválido" };
  }

  const estado = parsed.data.estado;

  const [updated] = await withAuthenticatedDb(user, async (db) =>
    db
      .update(tasks)
      .set({
        estado,
        concluidaEm: estado === "concluida" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning()
  );

  const hdrs = await headers();
  await insertAuditLog({
    userId: dbUser.id,
    acao: "update_state",
    entidade: "tasks",
    entidadeId: id,
    dadosAntes: { estado: existing.estado },
    dadosDepois: { estado: updated.estado },
    ip: hdrs.get("x-forwarded-for") ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/tasks/${id}`);
  revalidatePath("/staff/me/tasks");
  revalidatePath("/staff/me/dashboard");

  return { success: true };
}
