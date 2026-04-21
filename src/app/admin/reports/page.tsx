import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/actions";
import { getMonthlyProfitLoss } from "@/lib/reports/actions";
import { formatCurrency } from "@/lib/utils/format";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenses/labels";

export const metadata = { title: "Relatórios" };

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

const SALARY_STATE_LABELS: Record<string, string> = {
  aberto: "Aberto",
  calculado: "Calculado",
  confirmado: "Confirmado",
  pago: "Pago",
};

interface PageProps {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");
  if (!["ca", "dg"].includes(dbUser.role)) redirect("/admin/dashboard");

  const sp = await searchParams;
  const now = new Date();
  const ano = Number(sp.ano) || now.getFullYear();
  const mes = Number(sp.mes) || now.getMonth() + 1;

  const report = await getMonthlyProfitLoss(ano, mes);

  const anos = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);

  const categoriasOrdenadas = Object.entries(report.despesas.porCategoria).sort(
    (a, b) => b[1] - a[1]
  );
  const totalDespesasCat = categoriasOrdenadas.reduce(
    (s, [, v]) => s + v,
    0
  );

  return (
    <div className="max-w-6xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Relatório mensal (P&L)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Receitas, despesas, salários e dividendos do período
          </p>
        </div>

        <form method="get" className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mês
            </label>
            <select
              name="mes"
              defaultValue={mes}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {MES_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ano
            </label>
            <select
              name="ano"
              defaultValue={ano}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-gray-900 text-white px-4 text-sm font-medium hover:bg-gray-800"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={ArrowUpRight}
          label="Facturado"
          value={report.receitas.facturado}
          sub={`${report.receitas.facturasCount} factura(s)`}
          tone="green"
        />
        <KpiCard
          icon={Wallet}
          label="Recebido"
          value={report.receitas.recebido}
          sub={`${report.receitas.pagamentosCount} pagamento(s)`}
          tone="emerald"
        />
        <KpiCard
          icon={ArrowDownRight}
          label="Despesas"
          value={report.despesas.total}
          sub={`${report.despesas.count} movimento(s)`}
          tone="red"
        />
        <KpiCard
          icon={Receipt}
          label="Folha salarial"
          value={report.salarios.totalFolha}
          sub={
            report.salarios.estado
              ? SALARY_STATE_LABELS[report.salarios.estado] ??
                report.salarios.estado
              : "Sem período"
          }
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ResultCard
          icon={TrendingUp}
          label="Margem bruta"
          value={report.resultado.margemBruta}
          hint="Facturado - Despesas"
        />
        <ResultCard
          icon={TrendingUp}
          label="Margem líquida"
          value={report.resultado.margemLiquida}
          hint="Margem bruta - Folha bruta"
        />
        <ResultCard
          icon={Banknote}
          label="Cash-flow"
          value={report.resultado.cashflow}
          hint="Recebido - Despesas - Líquido - Divid. pagos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Despesas por categoria</h2>
            <span className="text-xs text-gray-500 tabular-nums">
              {formatCurrency(totalDespesasCat)}
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {categoriasOrdenadas.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-400 py-8">
                    Sem despesas no mês.
                  </td>
                </tr>
              )}
              {categoriasOrdenadas.map(([cat, valor]) => {
                const pct =
                  totalDespesasCat > 0 ? (valor / totalDespesasCat) * 100 : 0;
                return (
                  <tr key={cat} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {EXPENSE_CATEGORY_LABEL[cat] ?? cat}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(valor)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-500 w-16">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">Detalhe</h2>
          </div>
          <dl className="divide-y divide-gray-100 text-sm">
            <Row label="Total bruto da folha" value={report.salarios.totalBruto} />
            <Row
              label="Total líquido pago a colaboradores"
              value={report.salarios.totalLiquido}
            />
            <Row
              label="Dividendos distribuídos"
              value={report.dividendos.totalDistribuido}
            />
            <Row
              label="Dividendos pagos no mês"
              value={report.dividendos.pagoNoMes}
            />
          </dl>
          <div className="px-4 py-3 text-xs text-gray-500 border-t bg-gray-50">
            Dividendos distribuídos correspondem ao trimestre do mês seleccionado
            (T1=Mar, T2=Jun, T3=Set, T4=Dez).
          </div>
        </section>
      </div>

      <div className="rounded-lg border bg-gray-50 px-4 py-3 text-xs text-gray-600 flex items-center gap-4 flex-wrap">
        <span>Ver também:</span>
        <Link href="/admin/invoices" className="text-blue-600 hover:underline">
          Facturas
        </Link>
        <Link href="/admin/expenses" className="text-blue-600 hover:underline">
          Despesas
        </Link>
        <Link href="/admin/salary" className="text-blue-600 hover:underline">
          Folha salarial
        </Link>
        <Link href="/admin/dividends" className="text-blue-600 hover:underline">
          Dividendos
        </Link>
      </div>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  red: "bg-red-50 text-red-700 border-red-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  sub: string;
  tone: "green" | "emerald" | "red" | "orange";
}

function KpiCard({ icon: Icon, label, value, sub, tone }: KpiCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <div
          className={`h-7 w-7 rounded-md border flex items-center justify-center ${TONE_CLASSES[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums mt-2">
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

interface ResultCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
}

function ResultCard({ icon: Icon, label, value, hint }: ResultCardProps) {
  const positive = value >= 0;
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center gap-2 text-gray-600">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p
        className={`text-2xl font-bold tabular-nums mt-2 ${
          positive ? "text-gray-900" : "text-red-600"
        }`}
      >
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}

interface RowProps {
  label: string;
  value: number;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-medium tabular-nums">{formatCurrency(value)}</dd>
    </div>
  );
}
