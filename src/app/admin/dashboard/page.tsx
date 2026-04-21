import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  FileText,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/actions";
import { getDashboardStats } from "@/lib/dashboard/actions";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatDate,
  invoiceNumber,
  INVOICE_STATE_COLORS,
  INVOICE_STATE_LABELS,
} from "@/lib/utils/format";

export const metadata = { title: "Painel — ABIPTOM Admin" };

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

export default async function DashboardPage() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");

  const stats = await getDashboardStats();
  const saldoMes = stats.recebidoMes - stats.despesasMes;

  return (
    <>
      <Header title="Painel" />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bom dia, {dbUser.nomeCurto}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Resumo de {MES_LABELS[stats.folhaMes.mes]} {stats.folhaMes.ano}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              href="/admin/invoices"
              icon={FileText}
              label="Facturas em aberto"
              value={String(stats.facturasAbertas.count)}
              sub={formatCurrency(stats.facturasAbertas.totalXof)}
              tone="blue"
            />
            <KpiCard
              href="/admin/invoices"
              icon={AlertTriangle}
              label="Facturas vencidas"
              value={String(stats.facturasVencidas.count)}
              sub={formatCurrency(stats.facturasVencidas.totalXof)}
              tone={stats.facturasVencidas.count > 0 ? "red" : "gray"}
            />
            <KpiCard
              href="/admin/projects"
              icon={Briefcase}
              label="Projectos activos"
              value={String(stats.projectosActivos)}
              sub={`${stats.clientesActivos} cliente(s) activo(s)`}
              tone="orange"
            />
            <KpiCard
              href="/admin/salary"
              icon={Receipt}
              label="Folha do mês"
              value={formatCurrency(stats.folhaMes.totalLiquido)}
              sub={
                stats.folhaMes.estado
                  ? SALARY_STATE_LABELS[stats.folhaMes.estado] ??
                    stats.folhaMes.estado
                  : "Sem período aberto"
              }
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MiniStat
              icon={TrendingUp}
              label="Facturado no mês"
              value={stats.facturadoMes}
            />
            <MiniStat
              icon={Wallet}
              label="Recebido no mês"
              value={stats.recebidoMes}
            />
            <MiniStat
              icon={TrendingDown}
              label="Despesas no mês"
              value={stats.despesasMes}
            />
          </div>

          <div
            className={`rounded-lg border px-5 py-4 flex items-center justify-between ${
              saldoMes >= 0
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-100"
            }`}
          >
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Saldo do mês (recebido − despesas)
              </p>
              <p
                className={`text-2xl font-bold tabular-nums mt-1 ${
                  saldoMes >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {formatCurrency(saldoMes)}
              </p>
            </div>
            <Link
              href="/admin/reports"
              className="text-sm font-medium text-gray-700 hover:underline"
            >
              Ver P&L completo →
            </Link>
          </div>

          <section className="rounded-lg border bg-white overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Últimas facturas
              </h2>
              <Link
                href="/admin/invoices"
                className="text-xs text-blue-600 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Nº
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Emissão
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">
                    Estado
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.ultimasFacturas.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-gray-400 py-8"
                    >
                      Ainda não há facturas.
                    </td>
                  </tr>
                )}
                {stats.ultimasFacturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 tabular-nums">
                      {invoiceNumber(f.numero)}
                    </td>
                    <td className="px-4 py-2">{f.clientNome}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {formatDate(f.dataEmissao)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge
                        className={
                          INVOICE_STATE_COLORS[f.estado] ??
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {INVOICE_STATE_LABELS[f.estado] ?? f.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {formatCurrency(f.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              href="/admin/invoices/new"
              icon={FileText}
              label="Nova factura"
            />
            <QuickAction
              href="/admin/expenses/new"
              icon={Receipt}
              label="Nova despesa"
            />
            <QuickAction
              href="/admin/clients"
              icon={Users}
              label="Clientes"
            />
            <QuickAction
              href="/admin/reports"
              icon={TrendingUp}
              label="Relatórios"
            />
          </div>
        </div>
      </main>
    </>
  );
}

const TONE_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  red: "bg-red-50 text-red-700 border-red-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  gray: "bg-gray-50 text-gray-600 border-gray-100",
};

interface KpiCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone: "blue" | "red" | "orange" | "emerald" | "gray";
}

function KpiCard({ href, icon: Icon, label, value, sub, tone }: KpiCardProps) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-colors block"
    >
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
      <p className="text-2xl font-bold tabular-nums mt-2 text-gray-900">
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </Link>
  );
}

interface MiniStatProps {
  icon: React.ElementType;
  label: string;
  value: number;
}

function MiniStat({ icon: Icon, label, value }: MiniStatProps) {
  return (
    <div className="rounded-lg border bg-white p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-gray-50 flex items-center justify-center">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

interface QuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

function QuickAction({ href, icon: Icon, label }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="rounded-lg border bg-white p-3 flex items-center gap-2 text-sm hover:border-gray-400 hover:bg-gray-50 transition-colors"
    >
      <Icon className="h-4 w-4 text-gray-600" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}
