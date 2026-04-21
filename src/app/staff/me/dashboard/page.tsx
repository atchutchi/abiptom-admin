import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, salaryLines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { FileDown, CheckCircle2 } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ca: "Conselho de Administração",
  dg: "Director Geral",
  coord: "Coordenação",
  staff: "Colaborador",
};

const MES_LABELS = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const metadata = { title: "O meu painel — ABIPTOM Admin" };

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser) redirect("/login");

  const myLines = await db.query.salaryLines.findMany({
    where: eq(salaryLines.userId, dbUser.id),
    with: {
      period: {
        columns: { ano: true, mes: true, estado: true },
      },
    },
  });

  const visibleLines = myLines
    .filter((l) => l.period.estado !== "aberto")
    .sort((a, b) => {
      if (a.period.ano !== b.period.ano) return b.period.ano - a.period.ano;
      return b.period.mes - a.period.mes;
    });

  return (
    <>
      <Header title="O meu painel" />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Olá, {dbUser.nomeCurto}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Papel:</span>
                <Badge variant="secondary">
                  {ROLE_LABELS[dbUser.role] ?? dbUser.role}
                </Badge>
              </div>
              {dbUser.cargo && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Cargo:</span>
                  <span className="text-sm">{dbUser.cargo}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">
                Os meus recibos salariais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleLines.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Ainda não tem recibos disponíveis.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="py-2 font-medium text-gray-600">
                        Período
                      </th>
                      <th className="py-2 font-medium text-gray-600 text-right">
                        Líquido
                      </th>
                      <th className="py-2 font-medium text-gray-600 text-center">
                        Pago
                      </th>
                      <th className="py-2 font-medium text-gray-600 text-right">
                        Recibo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleLines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="py-2.5">
                          {MES_LABELS[line.period.mes]} {line.period.ano}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-medium">
                          {formatCurrency(line.totalLiquido)}
                        </td>
                        <td className="py-2.5 text-center">
                          {line.pago ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                              {line.dataPagamento && (
                                <span className="text-xs text-gray-400">
                                  {formatDate(line.dataPagamento)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <a
                            href={`/api/salary/receipt/${line.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
