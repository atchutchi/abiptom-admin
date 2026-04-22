"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";
import type { ProfileFormData } from "@/lib/users/actions";
import type { User, UserRole } from "@/lib/db/schema";

const ROLE_LABELS: Record<UserRole, string> = {
  ca: "Conselho de Administração",
  dg: "Director Geral",
  coord: "Coordenação",
  staff: "Colaborador",
};

interface ProfileFormProps {
  user: User;
  homeHref: string;
  onSubmit: (
    data: ProfileFormData
  ) => Promise<{ error?: string; success?: boolean }>;
}

export function ProfileForm({ user, homeHref, onSubmit }: ProfileFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const form = e.currentTarget;
    const result = await onSubmit({
      nomeCompleto: (form.elements.namedItem("nomeCompleto") as HTMLInputElement).value,
      nomeCurto: (form.elements.namedItem("nomeCurto") as HTMLInputElement).value,
      telefone:
        (form.elements.namedItem("telefone") as HTMLInputElement).value || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Perfil actualizado.");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="rounded-lg border bg-white p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Informação pessoal</h2>
            <p className="text-sm text-gray-500">
              Actualiza o nome apresentado na aplicação e o teu contacto directo.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nomeCompleto">Nome completo</Label>
              <Input
                id="nomeCompleto"
                name="nomeCompleto"
                defaultValue={user.nomeCompleto}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeCurto">Nome curto</Label>
              <Input
                id="nomeCurto"
                name="nomeCurto"
                defaultValue={user.nomeCurto}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                defaultValue={user.telefone ?? ""}
                placeholder="+245 955 000 000"
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Conta</h2>
                <p className="text-sm text-gray-500">
                  Dados controlados pela administração.
                </p>
              </div>
              <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="mt-1 font-medium text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Cargo</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {user.cargo ?? "Sem cargo definido"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Data de entrada</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {user.dataEntrada ? formatDate(user.dataEntrada) : "Sem registo"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Segurança da conta
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Para alterar a palavra-passe usa o fluxo de recuperação por email.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/forgot-password">Alterar palavra-passe</Link>
            </Button>
          </section>
        </aside>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar..." : "Guardar alterações"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(homeHref)}>
          Voltar
        </Button>
      </div>
    </form>
  );
}
