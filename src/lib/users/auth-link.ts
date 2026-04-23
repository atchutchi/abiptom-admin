"use server";

import { eq, sql } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";

type MinimalInternalUser = Pick<
  User,
  "id" | "authUserId" | "email" | "role" | "activo" | "mfaEnabled"
>;

type AuthLinkSnapshot = {
  authUserId: string;
  active: boolean;
  mfaEnabled: boolean;
};

async function getAuthLinkSnapshot(args: {
  authUserId?: string | null;
  email?: string | null;
}): Promise<AuthLinkSnapshot | null> {
  if (args.authUserId) {
    const rows = await dbAdmin.execute<{
      id: string;
      active: boolean;
      mfa_enabled: boolean;
    }>(sql`
      select
        id::text as id,
        coalesce((raw_user_meta_data->>'active')::boolean, true) as active,
        coalesce((raw_user_meta_data->>'mfa_enabled')::boolean, false) as mfa_enabled
      from auth.users
      where id = ${args.authUserId}::uuid
      limit 1
    `);

    if (rows[0]) {
      return {
        authUserId: rows[0].id,
        active: rows[0].active,
        mfaEnabled: rows[0].mfa_enabled,
      };
    }
  }

  if (!args.email) {
    return null;
  }

  const rows = await dbAdmin.execute<{
    id: string;
    active: boolean;
    mfa_enabled: boolean;
  }>(sql`
    select
      id::text as id,
      coalesce((raw_user_meta_data->>'active')::boolean, true) as active,
      coalesce((raw_user_meta_data->>'mfa_enabled')::boolean, false) as mfa_enabled
    from auth.users
    where lower(email) = lower(${args.email})
    limit 1
  `);

  if (!rows[0]) {
    return null;
  }

  return {
    authUserId: rows[0].id,
    active: rows[0].active,
    mfaEnabled: rows[0].mfa_enabled,
  };
}

export async function repairInternalUserFromAuth(args: {
  authUserId: string;
  email?: string | null;
}): Promise<User | null> {
  const directMatch = await dbAdmin.query.users.findFirst({
    where: eq(users.authUserId, args.authUserId),
  });

  if (directMatch) {
    return (await repairAuthLinkForInternalUser(directMatch)) ?? directMatch;
  }

  if (!args.email) {
    return null;
  }

  const [emailMatch] = await dbAdmin
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${args.email})`)
    .limit(1);

  if (!emailMatch) {
    return null;
  }

  const authSnapshot = await getAuthLinkSnapshot({
    authUserId: args.authUserId,
    email: args.email,
  });

  const [updated] = await dbAdmin
    .update(users)
    .set({
      authUserId: authSnapshot?.authUserId ?? args.authUserId,
      activo: authSnapshot?.active ?? emailMatch.activo,
      mfaEnabled: authSnapshot?.mfaEnabled ?? emailMatch.mfaEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, emailMatch.id))
    .returning();

  return updated;
}

export async function repairAuthLinkForInternalUser(
  dbUser: MinimalInternalUser,
): Promise<User | null> {
  const authSnapshot = await getAuthLinkSnapshot({
    authUserId: dbUser.authUserId,
    email: dbUser.email,
  });

  if (!authSnapshot) {
    return null;
  }

  if (
    authSnapshot.authUserId === dbUser.authUserId &&
    authSnapshot.active === dbUser.activo &&
    authSnapshot.mfaEnabled === dbUser.mfaEnabled
  ) {
    const [fresh] = await dbAdmin
      .select()
      .from(users)
      .where(eq(users.id, dbUser.id))
      .limit(1);
    return fresh ?? null;
  }

  const [updated] = await dbAdmin
    .update(users)
    .set({
      authUserId: authSnapshot.authUserId,
      activo: authSnapshot.active,
      mfaEnabled: authSnapshot.mfaEnabled,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id))
    .returning();

  return updated;
}

export async function syncAuthMetadataForDbUser(
  dbUser: Pick<User, "authUserId" | "role" | "activo" | "mfaEnabled">,
) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(dbUser.authUserId, {
    user_metadata: {
      role: dbUser.role,
      active: dbUser.activo,
      mfa_enabled: dbUser.mfaEnabled,
    },
  });

  if (error) {
    throw new Error(error.message ?? "Erro ao sincronizar metadata Auth.");
  }
}
