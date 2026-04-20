import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, gte, lte } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Não autorizado", { status: 401 });

  const { searchParams } = req.nextUrl;
  const mes = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  const mesInicio = `${mes}-01`;
  const mesFim = `${mes}-31`;

  const rows = await db.query.invoices.findMany({
    where: and(
      gte(invoices.dataEmissao, mesInicio),
      lte(invoices.dataEmissao, mesFim)
    ),
    with: { client: true },
    orderBy: (i, { asc }) => [asc(i.dataEmissao)],
  });

  const data = rows.map((r) => ({
    Número: r.numero ? String(r.numero).padStart(5, "0") : "Rascunho",
    Tipo: r.tipo ?? "—",
    Estado: r.estado,
    Cliente: r.client?.nome ?? "—",
    "Data Emissão": r.dataEmissao,
    "Data Vencimento": r.dataVencimento ?? "—",
    Moeda: r.moeda,
    Subtotal: Number(r.subtotal),
    "IGV (%)": Number(r.igvPercentagem),
    "IGV Valor": Number(r.igvValor),
    Total: Number(r.total),
    "Forma Pagamento": r.formaPagamento ?? "—",
    "Enviada Em": r.enviadaEm?.toISOString().slice(0, 10) ?? "—",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, `Facturas ${mes}`);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="facturas-${mes}.xlsx"`,
    },
  });
}
