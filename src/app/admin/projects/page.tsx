import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { listProjects } from "@/lib/projects/actions";
import { getCurrentUser } from "@/lib/auth/actions";

export const metadata = { title: "Projectos — ABIPTOM Admin" };

const ESTADO_LABELS: Record<string, string> = {
  proposta: "Proposta",
  activo: "Activo",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const ESTADO_COLORS: Record<string, string> = {
  proposta: "bg-yellow-100 text-yellow-800",
  activo: "bg-green-100 text-green-800",
  pausado: "bg-orange-100 text-orange-800",
  concluido: "bg-blue-100 text-blue-800",
  cancelado: "bg-gray-100 text-gray-600",
};

function fmt(val: string | null) {
  if (!val) return "—";
  return Number(val).toLocaleString("pt-PT");
}

export default async function ProjectsPage() {
  const { user, dbUser } = await getCurrentUser();
  if (!user) redirect("/login");

  if (!dbUser || !["ca", "dg", "coord"].includes(dbUser.role)) {
    redirect("/admin/dashboard");
  }

  const allProjects = await listProjects();

  return (
    <>
      <Header title="Projectos" />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{allProjects.length} projectos</p>
            <Link href="/admin/projects/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Novo projecto
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ponto Focal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Valor previsto</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      Nenhum projecto criado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {allProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.titulo}</TableCell>
                    <TableCell className="text-gray-600">{p.client.nome}</TableCell>
                    <TableCell className="text-gray-600">
                      {p.pontoFocal?.nomeCurto ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADO_COLORS[p.estado]}`}
                      >
                        {ESTADO_LABELS[p.estado]}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{p.dataInicio}</TableCell>
                    <TableCell className="text-right text-gray-600">
                      {p.valorPrevisto
                        ? `${fmt(p.valorPrevisto)} ${p.moeda}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${p.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </>
  );
}
