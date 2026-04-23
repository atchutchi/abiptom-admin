import { dbAdmin } from "@/lib/db";
import { servicesCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/forms/ServiceForm";
import { updateService, toggleServiceActive } from "@/lib/services/actions";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Editar Serviço — ABIPTOM Core" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await dbAdmin.query.servicesCatalog.findFirst({
    where: eq(servicesCatalog.id, id),
  });

  if (!service) notFound();

  const action = updateService.bind(null, id);
  const toggle = async () => {
    "use server";
    await toggleServiceActive(id, !service.activo);
  };

  return (
    <>
      <Header title="Editar Serviço" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <Link
              href="/admin/settings/services"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Catálogo de Serviços
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Editar Serviço</h1>
              <p className="text-sm text-muted-foreground">{service.categoria} · {service.nome}</p>
            </div>
            <form action={toggle}>
              <Button type="submit" variant={service.activo ? "outline" : "default"}>
                {service.activo ? "Desactivar" : "Reactivar"}
              </Button>
            </form>
          </div>
          <ServiceForm service={service} action={action} submitLabel="Actualizar" />
        </div>
      </main>
    </>
  );
}
