import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { salaryPolicies, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { SalaryNewPeriodForm } from "@/components/forms/SalaryNewPeriodForm";

export default async function NewSalaryPeriodPage() {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");
  if (!["ca", "dg"].includes(dbUser.role)) redirect("/admin/dashboard");

  // Load active policies
  const policies = await db.query.salaryPolicies.findMany({
    where: eq(salaryPolicies.activo, true),
    orderBy: (p, { desc }) => [desc(p.dataInicio)],
  });

  // Load active projects with PF + assistants
  const projectRows = await db.query.projects.findMany({
    where: (p, { eq, inArray }) =>
      inArray(p.estado, ["activo", "proposta"]),
    with: {
      client: { columns: { id: true, nome: true } },
      pontoFocal: { columns: { id: true, nomeCurto: true } },
      assistants: {
        with: { user: { columns: { id: true, nomeCurto: true } } },
      },
    },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  // Load active staff users for override section
  const staffRows = await db.query.users.findMany({
    where: eq(users.activo, true),
    columns: {
      id: true,
      nomeCurto: true,
      nomeCompleto: true,
      role: true,
      salarioBaseMensal: true,
    },
    orderBy: (u, { asc }) => [asc(u.nomeCurto)],
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Novo Período Salarial
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona o mês, a política e os projectos a incluir no cálculo.
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
        staffUsers={staffRows.map((u) => ({
          id: u.id,
          nomeCurto: u.nomeCurto,
          nomeCompleto: u.nomeCompleto,
          salarioBase: Number(u.salarioBaseMensal ?? 0),
        }))}
      />
    </div>
  );
}
