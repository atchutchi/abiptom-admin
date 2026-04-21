import Link from "next/link";
import { Package, Users } from "lucide-react";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Definições — ABIPTOM Admin" };

const SECTIONS = [
  {
    title: "Catálogo de Serviços",
    description: "Gerir os serviços oferecidos pela ABIPTOM, preços e periodicidades.",
    href: "/admin/settings/services",
    icon: Package,
  },
  {
    title: "Utilizadores",
    description: "Criar, editar e desactivar utilizadores do sistema.",
    href: "/admin/users",
    icon: Users,
  },
];

export default function SettingsPage() {
  return (
    <>
      <Header title="Definições" />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <p className="text-sm text-muted-foreground">
            Configurações gerais do sistema.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-lg border border-border p-5 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
