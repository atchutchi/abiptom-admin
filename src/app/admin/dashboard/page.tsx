import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  ca: "Conselho de Administração",
  dg: "Director Geral",
  coord: "Coordenação",
  staff: "Colaborador",
};

export const metadata = { title: "Painel — ABIPTOM Admin" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser) redirect("/login");

  return (
    <>
      <Header title="Painel" />
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo, {dbUser.nomeCurto}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Papel:</span>
                <Badge variant="secondary">
                  {ROLE_LABELS[dbUser.role] ?? dbUser.role}
                </Badge>
              </div>
              {dbUser.cargo && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Cargo:</span>
                  <span className="text-sm">{dbUser.cargo}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Email:</span>
                <span className="text-sm">{dbUser.email}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Facturas em aberto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-gray-400 mt-1">Disponível na Fase 2</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Projectos activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-gray-400 mt-1">Disponível na Fase 3</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Folha do mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-gray-400 mt-1">Disponível na Fase 3</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
