import { getSalaryPeriod } from "@/lib/salary/actions";
import { getCurrentUser } from "@/lib/auth/actions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ConfirmPeriodButton } from "@/components/forms/ConfirmPeriodButton";
import { MarkLinePaidButton } from "@/components/forms/MarkLinePaidButton";
import { ArrowLeft, CheckCircle2, FileDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import type { ProjectPaymentRecord } from "@/lib/salary/types";

const PERIOD_STATE_LABELS: Record<string, string> = {
  aberto: "Aberto",
  calculado: "Calculado",
  confirmado: "Confirmado",
  pago: "Pago",
};

const PERIOD_STATE_COLORS: Record<string, string> = {
  aberto: "bg-gray-100 text-gray-700",
  calculado: "bg-blue-100 text-blue-700",
  confirmado: "bg-orange-100 text-orange-700",
  pago: "bg-green-100 text-green-700",
};

const MES_LABELS = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface PageProps {
  params: Promise<{ periodId: string }>;
}

export default async function SalaryPeriodPage({ params }: PageProps) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");

  const { periodId } = await params;
  const period = await getSalaryPeriod(periodId);
  if (!period) notFound();

  const canConfirm =
    ["ca", "dg"].includes(dbUser.role) && period.estado === "calculado";
  const canMarkPaid =
    ["ca", "dg"].includes(dbUser.role) && period.estado === "confirmado";

  // Group project payments by project for summary table
  type PaymentRow = (typeof period.projectPayments)[number];
  const paymentsByProject = period.projectPayments.reduce<
    Map<string, { titulo: string; payments: PaymentRow[] }>
  >((acc, pp) => {
    if (!acc.has(pp.projectId)) {
      acc.set(pp.projectId, { titulo: pp.project.titulo, payments: [] });
    }
    acc.get(pp.projectId)!.payments.push(pp);
    return acc;
  }, new Map());

  return (
    <>
      <Header title="Folha Salarial" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <Link
              href="/admin/salary"
              className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Folha Salarial
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {MES_LABELS[period.mes]} {period.ano}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {period.policy.nome} v{period.policy.versao}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  className={
                    PERIOD_STATE_COLORS[period.estado] ?? "bg-gray-100 text-gray-700"
                  }
                >
                  {PERIOD_STATE_LABELS[period.estado] ?? period.estado}
                </Badge>
                {canConfirm && <ConfirmPeriodButton periodId={period.id} />}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Total Bruto", value: period.totalBruto },
              { label: "Total Líquido", value: period.totalLiquido },
              { label: "Total Folha", value: period.totalFolha },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg border bg-white px-5 py-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>

          <section className="overflow-x-auto rounded-lg border bg-white">
            <div className="border-b bg-gray-50 px-5 py-3">
              <h2 className="font-semibold text-gray-800">Linhas salariais</h2>
            </div>
            <table className="min-w-[980px] w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Colaborador
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Sal. Base
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Componente
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Subsídio
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Outros
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Descontos
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600">
                    Total Líq.
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Pago
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {period.lines.map((line) => {
                  const componenteTotal = (
                    line.componenteDinamica as ProjectPaymentRecord[]
                  ).reduce((sum, c) => sum + c.valorRecebido, 0);

                  const subsidioTotal = Object.values(
                    (line.subsidios as Record<string, number>) ?? {}
                  ).reduce((sum, v) => sum + v, 0);

                  return (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{line.user.nomeCurto}</p>
                        <p className="text-xs uppercase text-gray-400">
                          {line.user.role}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(line.salarioBase)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(componenteTotal)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {subsidioTotal > 0 ? formatCurrency(subsidioTotal) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {Number(line.outrosBeneficios) > 0
                          ? formatCurrency(line.outrosBeneficios)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">
                        {Number(line.descontos) > 0
                          ? `-${formatCurrency(line.descontos)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {formatCurrency(line.totalLiquidoFinal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {line.pago ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {line.dataPagamento && (
                              <span className="text-xs text-gray-400">
                                {formatDate(line.dataPagamento)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canMarkPaid && !line.pago && (
                            <MarkLinePaidButton
                              lineId={line.id}
                              nomeCurto={line.user.nomeCurto}
                            />
                          )}
                          {period.estado !== "aberto" && (
                            <a
                              href={`/api/salary/receipt/${line.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                              title="Ver recibo PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Recibo
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {paymentsByProject.size > 0 && (
            <section className="overflow-x-auto rounded-lg border bg-white">
              <div className="border-b bg-gray-50 px-5 py-3">
                <h2 className="font-semibold text-gray-800">
                  Distribuição por projecto
                </h2>
              </div>
              {Array.from(paymentsByProject.entries()).map(
                ([projectId, { titulo, payments }]) => (
                  <div key={projectId} className="border-b last:border-0">
                    <div className="bg-gray-50/50 px-5 py-2">
                      <p className="text-sm font-medium text-gray-700">{titulo}</p>
                    </div>
                    <table className="min-w-[720px] w-full text-sm">
                      <tbody className="divide-y divide-gray-50">
                        {payments.map((pp) => (
                          <tr key={pp.id}>
                            <td className="px-6 py-2 text-gray-700">
                              {pp.user.nomeCurto}
                            </td>
                            <td className="px-4 py-2 text-xs uppercase text-gray-500">
                              {pp.papel}
                            </td>
                            <td className="px-4 py-2 text-gray-500 tabular-nums">
                              {Number(pp.percentagemAplicada) * 100}%
                            </td>
                            <td className="px-4 py-2 text-right font-medium tabular-nums">
                              {formatCurrency(pp.valorRecebido)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </section>
          )}

          <div className="pt-2">
            <Button variant="outline" asChild>
              <Link href="/admin/salary">Voltar à lista</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
