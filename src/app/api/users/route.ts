import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const dbUser = await dbAdmin.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser || (dbUser.role !== "ca" && dbUser.role !== "dg")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const allUsers = await dbAdmin.query.users.findMany({
    orderBy: (u, { asc }) => [asc(u.nomeCompleto)],
    columns: {
      id: true,
      nomeCompleto: true,
      nomeCurto: true,
      email: true,
      role: true,
      cargo: true,
      activo: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: allUsers });
}
