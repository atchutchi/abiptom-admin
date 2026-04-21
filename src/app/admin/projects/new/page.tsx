import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, clients, servicesCatalog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import ProjectForm from "@/components/forms/ProjectForm";

export const metadata = { title: "Novo Projecto — ABIPTOM Admin" };

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });
  if (!dbUser || !["ca", "dg", "coord"].includes(dbUser.role)) {
    redirect("/admin/dashboard");
  }

  const [allClients, allUsers, allServices] = await Promise.all([
    db.query.clients.findMany({ where: eq(clients.activo, true), orderBy: (c, { asc }) => [asc(c.nome)] }),
    db.query.users.findMany({ where: eq(users.activo, true), orderBy: (u, { asc }) => [asc(u.nomeCurto)] }),
    db.query.servicesCatalog.findMany({ where: eq(servicesCatalog.activo, true), orderBy: (s, { asc }) => [asc(s.nome)] }),
  ]);

  return (
    <>
      <Header title="Novo Projecto" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <ProjectForm
            clients={allClients}
            staffUsers={allUsers}
            services={allServices}
          />
        </div>
      </main>
    </>
  );
}
