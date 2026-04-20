"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDefaultRoute } from "./rbac";
import type { UserRole } from "@/lib/db/schema";
import { insertAuditLog } from "@/lib/db/audit";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou palavra-passe incorrectos." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Erro de autenticação." };

  const role = (user.user_metadata?.role ?? "staff") as UserRole;

  revalidatePath("/", "layout");
  redirect(getDefaultRoute(role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function verifyMfaCode(code: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: "", // preenchido pelo cliente depois de listar os factores
    code,
  });

  if (error) return { error: "Código inválido ou expirado." };
  return { data };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, dbUser: null };

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  return { user, dbUser: dbUser ?? null };
}
