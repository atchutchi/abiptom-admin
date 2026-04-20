"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertAuditLog } from "@/lib/db/audit";
import { getCurrentUser } from "@/lib/auth/actions";

const UserSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome completo obrigatório"),
  nomeCurto: z.string().min(1, "Nome curto obrigatório").max(50),
  email: z.string().email("Email inválido"),
  telefone: z.string().optional(),
  role: z.enum(["ca", "dg", "coord", "staff"]),
  cargo: z.string().optional(),
  salarioBaseMensal: z.string().optional(),
  dataEntrada: z.string().optional(),
});

export type UserFormData = z.infer<typeof UserSchema>;

export async function createUser(formData: UserFormData) {
  const parsed = UserSchema.safeParse(formData);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    return { error: issues[0]?.message ?? parsed.error.message };
  }

  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  const supabase = await createClient();

  // Criar utilizador no Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: crypto.randomUUID(), // password temporária — deve ser redefinida
      user_metadata: { role: parsed.data.role },
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Erro ao criar utilizador." };
  }

  // Inserir na tabela users
  const [newUser] = await db
    .insert(users)
    .values({
      authUserId: authData.user.id,
      nomeCompleto: parsed.data.nomeCompleto,
      nomeCurto: parsed.data.nomeCurto,
      email: parsed.data.email,
      telefone: parsed.data.telefone ?? null,
      role: parsed.data.role,
      cargo: parsed.data.cargo ?? null,
      salarioBaseMensal: parsed.data.salarioBaseMensal ?? "0",
      dataEntrada: parsed.data.dataEntrada ?? null,
    })
    .returning();

  await insertAuditLog({
    userId: actor.id,
    acao: "criar_utilizador",
    entidade: "users",
    entidadeId: newUser.id,
    dadosDepois: newUser,
  });

  revalidatePath("/admin/users");
  return { success: true, user: newUser };
}

export async function updateUser(id: string, formData: Partial<UserFormData>) {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existing) return { error: "Utilizador não encontrado." };

  const [updated] = await db
    .update(users)
    .set({
      ...formData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  await insertAuditLog({
    userId: actor.id,
    acao: "editar_utilizador",
    entidade: "users",
    entidadeId: id,
    dadosAntes: existing,
    dadosDepois: updated,
  });

  revalidatePath("/admin/users");
  return { success: true, user: updated };
}

export async function deactivateUser(id: string) {
  const actor = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  if (actor.id === id) return { error: "Não podes desactivar a tua própria conta." };

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existing) return { error: "Utilizador não encontrado." };

  const [updated] = await db
    .update(users)
    .set({ activo: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  await insertAuditLog({
    userId: actor.id,
    acao: "desactivar_utilizador",
    entidade: "users",
    entidadeId: id,
    dadosAntes: existing,
    dadosDepois: updated,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function listUsers() {
  return db.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.nomeCompleto)],
  });
}
