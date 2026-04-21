import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth/actions";
import { getMonthlyProfitLoss, getQuarterlyProfitLoss } from "@/lib/reports/actions";
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
  const periodo = searchParams.get("periodo") === "trimestral" ? "trimestral" : "mensal";
  const ano = Number(searchParams.get("ano")) || now.getFullYear();
  const mes = Number(searchParams.get("mes")) || now.getMonth() + 1;
  const trimestre = Number(searchParams.get("trimestre")) || Math.ceil((now.getMonth() + 1) / 3);

  if (mes < 1 || mes > 12) {
    return new NextResponse("Mês inválido", { status: 400 });
  }
  if (trimestre < 1 || trimestre > 4) {
    return new NextResponse("Trimestre inválido", { status: 400 });
  }
  if (ano < 2000 || ano > 2100) {
    return new NextResponse("Ano inválido", { status: 400 });
  }

  const report =
    periodo === "trimestral"
      ? await getQuarterlyProfitLoss(ano, trimestre)
      : await getMonthlyProfitLoss(ano, mes);
  const generatedAt = new Date().toISOString().split("T")[0];

  const buffer = await renderToBuffer(
    ProfitLossPDF({
      report,
      generatedAt,
      title:
        periodo === "trimestral"
          ? "Relatório Trimestral (P&L)"
          : "Relatório Mensal (P&L)",
      periodLabelOverride:
        periodo === "trimestral" ? `T${trimestre} ${ano}` : undefined,
    })
  );

  const filename =
    periodo === "trimestral"
      ? `pl-t${trimestre}-${ano}.pdf`
      : `pl-${MES_SLUG[mes]}-${ano}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
