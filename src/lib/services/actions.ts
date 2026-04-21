"use server";

import { z } from "zod";
import { dbAdmin } from "@/lib/db";
import { servicesCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/actions";

const serviceSchema = z.object({
  categoria: z.string().min(1, "Categoria obrigatória"),
  nome: z.string().min(2, "Nome obrigatório"),
  descricao: z.string().optional(),
  unidade: z.string().optional(),
  periodicidade: z.enum(["unica", "mensal", "anual", "bienal"]).default("unica"),
  prazoEntrega: z.string().optional(),
  precoXof: z.string().optional(),
});

export async function listServices(includeInactive = false) {
  return dbAdmin.query.servicesCatalog.findMany({
    where: includeInactive ? undefined : eq(servicesCatalog.activo, true),
    orderBy: (s, { asc }) => [asc(s.categoria), asc(s.nome)],
  });
}

export async function createService(_: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const parsed = serviceSchema.safeParse({
    categoria: formData.get("categoria"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    unidade: formData.get("unidade") || undefined,
    periodicidade: formData.get("periodicidade") || "unica",
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    precoXof: formData.get("precoXof") || undefined,
  });

  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  await dbAdmin.insert(servicesCatalog).values(parsed.data);
  revalidatePath("/admin/settings/services");
  return { success: true };
}

export async function updateService(id: string, _: unknown, formData: FormData) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (!["ca", "dg"].includes(dbUser.role))
    return { error: "Sem permissão" };

  const parsed = serviceSchema.safeParse({
    categoria: formData.get("categoria"),
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    unidade: formData.get("unidade") || undefined,
    periodicidade: formData.get("periodicidade") || "unica",
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    precoXof: formData.get("precoXof") || undefined,
  });

  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  await dbAdmin
    .update(servicesCatalog)
    .set(parsed.data)
    .where(eq(servicesCatalog.id, id));

  revalidatePath("/admin/settings/services");
  return { success: true };
}

export async function toggleServiceActive(id: string, activo: boolean) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) throw new Error("Não autenticado");
  if (dbUser.role !== "ca") throw new Error("Sem permissão");

  await dbAdmin
    .update(servicesCatalog)
    .set({ activo })
    .where(eq(servicesCatalog.id, id));

  revalidatePath("/admin/settings/services");
}
