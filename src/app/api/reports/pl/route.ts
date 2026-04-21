import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/actions";
import { getMonthlyProfitLoss } from "@/lib/reports/actions";
import { ProfitLossPDF } from "@/lib/pdf/profit-loss";

const MES_SLUG = [
  "",
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export async function GET(req: NextRequest) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  if (!["ca", "dg"].includes(dbUser.role)) {
    return new NextResponse("Sem permissão", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const ano = Number(searchParams.get("ano")) || now.getFullYear();
  const mes = Number(searchParams.get("mes")) || now.getMonth() + 1;

  if (mes < 1 || mes > 12) {
    return new NextResponse("Mês inválido", { status: 400 });
  }
  if (ano < 2000 || ano > 2100) {
    return new NextResponse("Ano inválido", { status: 400 });
  }

  const report = await getMonthlyProfitLoss(ano, mes);
  const generatedAt = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    ProfitLossPDF({ report, generatedAt }) as any
  );

  const filename = `pl-${MES_SLUG[mes]}-${ano}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
