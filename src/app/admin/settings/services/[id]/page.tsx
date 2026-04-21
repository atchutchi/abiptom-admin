import { db } from "@/lib/db";
import { servicesCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ServiceForm from "@/components/forms/ServiceForm";
import { updateService, toggleServiceActive } from "@/lib/services/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Editar Serviço — ABIPTOM Admin" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await db.query.servicesCatalog.findFirst({
    where: eq(servicesCatalog.id, id),
  });

  if (!service) notFound();

  const action = updateService.bind(null, id);
  const toggle = async () => {
    "use server";
    await toggleServiceActive(id, !service.activo);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
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
  );
}
