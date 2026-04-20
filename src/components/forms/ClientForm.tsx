"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/db/schema";

interface Props {
  client?: Client;
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string; success?: boolean; id?: string }>;
  submitLabel?: string;
}

export default function ClientForm({ client, action, submitLabel = "Guardar" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      if (state.id) router.push(`/admin/clients/${state.id}`);
      else router.push("/admin/clients");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome *</label>
        <input
          name="nome"
          required
          defaultValue={client?.nome}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">NIF</label>
          <input
            name="nif"
            defaultValue={client?.nif ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">País</label>
          <input
            name="pais"
            defaultValue={client?.pais ?? "Guiné-Bissau"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Endereço</label>
        <textarea
          name="endereco"
          rows={2}
          defaultValue={client?.endereco ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Telefone</label>
          <input
            name="contacto"
            defaultValue={client?.contacto ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notas</label>
        <textarea
          name="notas"
          rows={3}
          defaultValue={client?.notas ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "A guardar…" : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
