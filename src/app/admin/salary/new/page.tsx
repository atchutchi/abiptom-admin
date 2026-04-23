import Link from "next/link";
import { dbAdmin } from "@/lib/db";
import { eq } from "drizzle-orm";
import { salaryPolicies } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SalaryNewPeriodForm } from "@/components/forms/SalaryNewPeriodForm";

export const metadata = { title: "Novo Período Salarial — ABIPTOM Admin" };

export default async function NewSalaryPeriodPage() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");
  if (!["ca", "dg"].includes(dbUser.role)) redirect("/admin/dashboard");

  // Load active policies
  const policies = await dbAdmin.query.salaryPolicies.findMany({
    where: eq(salaryPolicies.activo, true),
    orderBy: (p, { desc }) => [desc(p.dataInicio)],
  });

  // Load active projects with PF + assistants
  const projectRows = await dbAdmin.query.projects.findMany({
    where: (p, { inArray }) =>
      inArray(p.estado, ["activo", "proposta", "pausado", "concluido"]),
    with: {
      client: { columns: { id: true, nome: true } },
      pontoFocal: { columns: { id: true, nomeCurto: true } },
      assistants: {
        with: { user: { columns: { id: true, nomeCurto: true } } },
      },
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  return (
    <>
      <Header title="Novo Período Salarial" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link
            href="/admin/salary"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Folha salarial
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Novo Período Salarial
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Selecciona o mês e importa automaticamente os projectos a partir
              das facturas pagas.
            </p>
          </div>

          <SalaryNewPeriodForm
            policies={policies.map((p) => ({
              id: p.id,
              nome: p.nome,
              versao: p.versao,
              tipo: (p.configuracaoJson as { tipo: string }).tipo,
            }))}
            projects={projectRows.map((p) => ({
              id: p.id,
              titulo: p.titulo,
              clienteNome: p.client.nome,
              pontoFocalId: p.pontoFocalId,
              pontoFocalNome: p.pontoFocal?.nomeCurto ?? null,
              assistants: p.assistants.map((a) => ({
                userId: a.userId,
                nomeCurto: a.user.nomeCurto,
              })),
            }))}
          />
        </div>
      </main>
    </>
  );
}
