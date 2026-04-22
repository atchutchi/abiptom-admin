"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { insertAuditLog } from "@/lib/db/audit";
import { getCurrentUser } from "@/lib/auth/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AVATAR_BUCKET,
  ensureAvatarBucket,
  getAvatarExtension,
} from "@/lib/users/avatar";

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

const ProfileSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome completo obrigatório"),
  nomeCurto: z.string().min(1, "Nome curto obrigatório").max(50),
  telefone: z.string().max(30, "Telefone inválido").optional(),
});

export type ProfileFormData = z.infer<typeof ProfileSchema>;

export async function createUser(formData: UserFormData) {
  const parsed = UserSchema.safeParse(formData);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    return { error: issues[0]?.message ?? parsed.error.message };
  }

  const { dbUser: actor } = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  const supabaseAdmin = createAdminClient();

  // Criar utilizador no Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      password: crypto.randomUUID(), // password temporária — deve ser redefinida
      user_metadata: {
        role: parsed.data.role,
        mfa_enabled: false,
        active: true,
      },
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Erro ao criar utilizador." };
  }

  // Inserir na tabela users
  const [newUser] = await dbAdmin
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
  const { dbUser: actor } = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  const existing = await dbAdmin.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existing) return { error: "Utilizador não encontrado." };

  const supabaseAdmin = createAdminClient();
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    existing.authUserId,
    {
      ...(formData.email ? { email: formData.email } : {}),
      user_metadata: {
        role: formData.role ?? existing.role,
        mfa_enabled: existing.mfaEnabled,
        active: existing.activo,
      },
    }
  );

  if (authError) {
    return {
      error: authError.message ?? "Erro ao sincronizar utilizador no Supabase.",
    };
  }

  const [updated] = await dbAdmin
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
  const { dbUser: actor } = await getCurrentUser();
  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    return { error: "Sem permissão." };
  }

  if (actor.id === id) return { error: "Não podes desactivar a tua própria conta." };

  const existing = await dbAdmin.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existing) return { error: "Utilizador não encontrado." };

  const supabaseAdmin = createAdminClient();
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    existing.authUserId,
    {
      user_metadata: {
        role: existing.role,
        mfa_enabled: existing.mfaEnabled,
        active: false,
      },
    }
  );

  if (authError) {
    return {
      error: authError.message ?? "Erro ao desactivar utilizador no Supabase.",
    };
  }

  const [updated] = await dbAdmin
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
  return dbAdmin.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.nomeCompleto)],
  });
}

export async function updateMyProfile(formData: ProfileFormData) {
  const parsed = ProfileSchema.safeParse(formData);
  if (!parsed.success) {
    const issues = parsed.error.issues ?? [];
    return { error: issues[0]?.message ?? parsed.error.message };
  }

  const { dbUser } = await getCurrentUser();
  if (!dbUser) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  const [updated] = await dbAdmin
    .update(users)
    .set({
      nomeCompleto: parsed.data.nomeCompleto,
      nomeCurto: parsed.data.nomeCurto,
      telefone: parsed.data.telefone?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))
    .returning();

  await insertAuditLog({
    userId: dbUser.id,
    acao: "actualizar_perfil",
    entidade: "users",
    entidadeId: dbUser.id,
    dadosAntes: {
      nomeCompleto: dbUser.nomeCompleto,
      nomeCurto: dbUser.nomeCurto,
      telefone: dbUser.telefone,
    },
    dadosDepois: {
      nomeCompleto: updated.nomeCompleto,
      nomeCurto: updated.nomeCurto,
      telefone: updated.telefone,
    },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/staff/me/profile");
  revalidatePath("/staff/me/dashboard");
  revalidatePath("/admin", "layout");
  revalidatePath("/staff", "layout");

  return { success: true, user: updated };
}

export async function uploadMyAvatar(formData: FormData) {
  const { dbUser } = await getCurrentUser();
  if (!dbUser) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona uma imagem para continuar." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "A imagem deve ter no máximo 2 MB." };
  }

  const extension = getAvatarExtension(file.type);
  if (!extension) {
    return { error: "Formato não suportado. Usa JPG, PNG ou WebP." };
  }

  await ensureAvatarBucket();

  const admin = createAdminClient();
  const nextPath = `${dbUser.id}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(nextPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message ?? "Falha ao carregar o avatar." };
  }

  const oldPath = dbUser.fotografiaUrl;

  const [updated] = await dbAdmin
    .update(users)
    .set({
      fotografiaUrl: nextPath,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))
    .returning();

  if (oldPath) {
    await admin.storage.from(AVATAR_BUCKET).remove([oldPath]);
  }

  await insertAuditLog({
    userId: dbUser.id,
    acao: "actualizar_avatar",
    entidade: "users",
    entidadeId: dbUser.id,
    dadosAntes: { fotografiaUrl: oldPath },
    dadosDepois: { fotografiaUrl: updated.fotografiaUrl },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/staff/me/profile");
  revalidatePath("/admin", "layout");
  revalidatePath("/staff", "layout");

  return { success: true, user: updated };
}

export async function removeMyAvatar() {
  const { dbUser } = await getCurrentUser();
  if (!dbUser) {
    return { error: "Sessão inválida. Inicia sessão novamente." };
  }

  if (!dbUser.fotografiaUrl) {
    return { error: "Não existe avatar configurado." };
  }

  const oldPath = dbUser.fotografiaUrl;
  const admin = createAdminClient();

  await admin.storage.from(AVATAR_BUCKET).remove([oldPath]);

  const [updated] = await dbAdmin
    .update(users)
    .set({
      fotografiaUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))
    .returning();

  await insertAuditLog({
    userId: dbUser.id,
    acao: "remover_avatar",
    entidade: "users",
    entidadeId: dbUser.id,
    dadosAntes: { fotografiaUrl: oldPath },
    dadosDepois: { fotografiaUrl: null },
  });

  revalidatePath("/admin/profile");
  revalidatePath("/staff/me/profile");
  revalidatePath("/admin", "layout");
  revalidatePath("/staff", "layout");

  return { success: true, user: updated };
}
