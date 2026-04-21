import { notFound } from "next/navigation";
import { getExpense, updateExpense } from "@/lib/expenses/actions";
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_STATE_LABEL,
  EXPENSE_STATE_COLOR,
} from "@/lib/expenses/labels";
import ExpenseForm from "@/components/forms/ExpenseForm";
import ExpenseActions from "@/components/forms/ExpenseActions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Despesa — ABIPTOM Admin" };

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await getExpense(id);
  if (!expense) notFound();

  const action = updateExpense.bind(null, id);
  const readOnly = expense.estado === "paga" || expense.estado === "anulada";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{expense.descricao}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {EXPENSE_CATEGORY_LABEL[expense.categoria]} · {formatDate(expense.data)}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                EXPENSE_STATE_COLOR[expense.estado]
              )}
            >
              {EXPENSE_STATE_LABEL[expense.estado]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground">Valor</p>
          <p className="text-2xl font-semibold font-mono">
            {formatCurrency(expense.valorXof)}
          </p>
          {expense.moeda !== "XOF" && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(expense.valor, expense.moeda)} @ {expense.taxaCambio}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="font-medium">Acções</h2>
        <ExpenseActions expense={expense} />
      </div>

      {!readOnly && (
        <div className="rounded-lg border border-border p-5 space-y-4">
          <h2 className="font-medium">Editar detalhes</h2>
          <ExpenseForm expense={expense} action={action} submitLabel="Actualizar" />
        </div>
      )}

      {readOnly && (
        <div className="rounded-lg border border-border p-5 space-y-3">
          <h2 className="font-medium">Detalhes</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {expense.fornecedor && (
              <>
                <dt className="text-muted-foreground">Fornecedor</dt>
                <dd>{expense.fornecedor}</dd>
              </>
            )}
            {expense.referencia && (
              <>
                <dt className="text-muted-foreground">Referência</dt>
                <dd className="font-mono">{expense.referencia}</dd>
              </>
            )}
            {expense.metodoPagamento && (
              <>
                <dt className="text-muted-foreground">Método</dt>
                <dd>{expense.metodoPagamento}</dd>
              </>
            )}
            {expense.dataPagamento && (
              <>
                <dt className="text-muted-foreground">Data de pagamento</dt>
                <dd>{formatDate(expense.dataPagamento)}</dd>
              </>
            )}
            {expense.notas && (
              <>
                <dt className="text-muted-foreground col-span-2">Notas</dt>
                <dd className="col-span-2 whitespace-pre-wrap">{expense.notas}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
