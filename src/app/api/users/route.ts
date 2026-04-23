import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/actions";

export async function GET() {
  const { user, dbUser } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

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
