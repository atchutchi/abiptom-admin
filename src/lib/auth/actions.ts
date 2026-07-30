"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultRoute } from "./rbac";
import type { UserRole } from "@/lib/db/schema";
import {
  repairInternalUserFromAuth,
  syncAuthMetadataForDbUser,
} from "@/lib/users/auth-link";
import { getCurrentUser as readCurrentUser } from "./session";

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

  const dbUser = await repairInternalUserFromAuth({
    authUserId: user.id,
    email: user.email,
  });
  if (!dbUser) return { error: "Utilizador não encontrado na aplicação." };

  try {
    await syncAuthMetadataForDbUser(dbUser);
  } catch (syncError) {
    console.error("Falha ao sincronizar metadata Auth no login", syncError);
  }

  const role = dbUser.role as UserRole;

  revalidatePath("/", "layout");
  redirect(getDefaultRoute(role));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentUser() {
  return readCurrentUser();
}
