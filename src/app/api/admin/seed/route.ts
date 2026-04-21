import { NextResponse } from "next/server";
import { seed } from "@/lib/db/seed";
import { getCurrentUser } from "@/lib/auth/actions";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Não disponível em produção" }, { status: 403 });
  }

  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!["ca", "dg"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    await seed();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
