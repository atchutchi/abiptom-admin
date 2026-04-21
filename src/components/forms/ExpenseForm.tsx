"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import type { Expense } from "@/lib/db/schema";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/expenses/labels";

type ActionResult = { error?: string; success?: boolean; id?: string };

interface Props {
  expense?: Expense;
  action: (prev: unknown, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

const MOEDAS = ["XOF", "EUR", "USD"] as const;

export default function ExpenseForm({ expense, action, submitLabel = "Guardar" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  const [valor, setValor] = useState(expense?.valor ?? "");
  const [moeda, setMoeda] = useState(expense?.moeda ?? "XOF");
  const [taxaCambio, setTaxaCambio] = useState(expense?.taxaCambio ?? "1");

  const valorXof = (() => {
    const v = Number(valor);
    const t = Number(taxaCambio);
    if (!isFinite(v) || !isFinite(t)) return 0;
    return v * t;
  })();

  useEffect(() => {
    if (state?.success) {
      if (state.id) router.push(`/admin/expenses/${state.id}`);
      else router.push("/admin/expenses");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Data *</label>
          <input
            type="date"
            name="data"
            required
            defaultValue={expense?.data ?? new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoria *</label>
          <select
            name="categoria"
            required
            defaultValue={expense?.categoria ?? "outros"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          >
            {Object.entries(EXPENSE_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição *</label>
        <input
          name="descricao"
          required
          defaultValue={expense?.descricao ?? ""}
          placeholder="Ex.: Aluguer escritório Novembro 2026"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Fornecedor</label>
          <input
            name="fornecedor"
            defaultValue={expense?.fornecedor ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">NIF fornecedor</label>
          <input
            name="nifFornecedor"
            defaultValue={expense?.nifFornecedor ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Valor *</label>
          <input
            name="valor"
            type="number"
            required
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Moeda</label>
          <select
            name="moeda"
            value={moeda}
            onChange={(e) => setMoeda(e.target.value as typeof MOEDAS[number])}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          >
            {MOEDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Taxa câmbio → XOF</label>
          <input
            name="taxaCambio"
            type="number"
            step="0.000001"
            min="0"
            value={taxaCambio}
            onChange={(e) => setTaxaCambio(e.target.value)}
            disabled={moeda === "XOF"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 disabled:bg-muted"
          />
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
        Valor em XOF: <span className="font-mono font-semibold">
          {valorXof.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} XOF
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Método de pagamento</label>
          <input
            name="metodoPagamento"
            defaultValue={expense?.metodoPagamento ?? ""}
            placeholder="Transferência, numerário, cheque…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Referência</label>
          <input
            name="referencia"
            defaultValue={expense?.referencia ?? ""}
            placeholder="Nº factura / recibo"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notas</label>
        <textarea
          name="notas"
          rows={3}
          defaultValue={expense?.notas ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
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
