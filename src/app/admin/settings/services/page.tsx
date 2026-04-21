import { listServices } from "@/lib/services/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Catálogo de Serviços — ABIPTOM Admin" };

const PERIODICIDADE_LABEL: Record<string, string> = {
  unica: "Única",
  mensal: "Mensal",
  anual: "Anual",
  bienal: "Bienal",
};

export default async function ServicesPage() {
  const services = await listServices(true);

  const byCategoria = services.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.categoria] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo de Serviços</h1>
          <p className="text-sm text-muted-foreground">{services.length} serviço(s) no catálogo</p>
        </div>
        <Button asChild>
          <Link href="/admin/settings/services/new">
            <Plus className="size-4" />
            Novo Serviço
          </Link>
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Package className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum serviço no catálogo.</p>
          <Button asChild variant="secondary">
            <Link href="/admin/settings/services/new">Adicionar primeiro serviço</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byCategoria).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {cat}
              </h2>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Nome</th>
                      <th className="px-4 py-3 text-left font-medium">Periodicidade</th>
                      <th className="px-4 py-3 text-left font-medium">Prazo</th>
                      <th className="px-4 py-3 text-right font-medium">Preço</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {PERIODICIDADE_LABEL[s.periodicidade] ?? s.periodicidade}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.prazoEntrega ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {s.precoXof ? formatCurrency(Number(s.precoXof), "XOF") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={s.activo ? "default" : "secondary"}>
                            {s.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/settings/services/${s.id}`}
                            className="text-primary hover:underline text-xs"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
