import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { E2E_USERS } from "./credentials";

loadEnv({ path: ".env.local" });

type SeedUser = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function ensureAuthUser(
  db: Client,
  supabaseUrl: string,
  serviceRoleKey: string,
  user: SeedUser
) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existing = await db.query<{ id: string }>(
    "select id from auth.users where email = $1 limit 1",
    [user.email]
  );

  let authUserId = existing.rows[0]?.id;

  if (!authUserId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        mfa_enabled: user.mfaEnabled,
        active: true,
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? `Falha ao criar utilizador ${user.email}`);
    }

    authUserId = data.user.id;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(authUserId, {
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        mfa_enabled: user.mfaEnabled,
        active: true,
      },
    });

    if (error) {
      throw new Error(error.message ?? `Falha ao actualizar utilizador ${user.email}`);
    }
  }

  await db.query("delete from auth.mfa_factors where user_id = $1", [authUserId]);
  await db.query(
    "delete from public.users where email = $1 and auth_user_id <> $2",
    [user.email, authUserId]
  );

  await db.query(
    `
      insert into public.users (
        auth_user_id,
        nome_completo,
        nome_curto,
        email,
        role,
        cargo,
        salario_base_mensal,
        activo,
        mfa_enabled
      )
      values ($1, $2, $3, $4, $5::user_role, $6, $7, true, $8)
      on conflict (auth_user_id) do update
      set
        nome_completo = excluded.nome_completo,
        nome_curto = excluded.nome_curto,
        email = excluded.email,
        role = excluded.role,
        cargo = excluded.cargo,
        salario_base_mensal = excluded.salario_base_mensal,
        activo = true,
        mfa_enabled = excluded.mfa_enabled,
        updated_at = now()
    `,
    [
      authUserId,
      user.nomeCompleto,
      user.nomeCurto,
      user.email,
      user.role,
      user.cargo,
      user.salarioBaseMensal,
      user.mfaEnabled,
    ]
  );
}

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltam DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY para os testes E2E."
    );
  }

  const db = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  await db.connect();

  try {
    for (const user of Object.values(E2E_USERS)) {
      await ensureAuthUser(db, supabaseUrl, serviceRoleKey, user);
    }
  } finally {
    await db.end();
  }
}
