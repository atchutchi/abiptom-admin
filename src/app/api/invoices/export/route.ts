import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, gte, lte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/actions";
import {
  buildInvoiceExportRows,
  createInvoiceExportWorkbook,
} from "@/lib/invoices/export";

export async function GET(req: NextRequest) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) return new NextResponse("Não autorizado", { status: 401 });
  if (!["ca", "dg"].includes(dbUser.role)) {
    return new NextResponse("Sem permissão", { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const mes = searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  const mesInicio = `${mes}-01`;
  const mesFim = `${mes}-31`;

  const rows = await withAuthenticatedDb(user, async (db) =>
    db.query.invoices.findMany({
      where: and(
        gte(invoices.dataEmissao, mesInicio),
        lte(invoices.dataEmissao, mesFim)
      ),
      with: { client: true },
      orderBy: (i, { asc }) => [asc(i.dataEmissao)],
    })
  );

  const buf = await createInvoiceExportWorkbook(
    buildInvoiceExportRows(rows),
    mes
  );

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="facturas-${mes}.xlsx"`,
    },
  });
}
