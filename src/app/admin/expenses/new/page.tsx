import ExpenseForm from "@/components/forms/ExpenseForm";
import { createExpense } from "@/lib/expenses/actions";

export const metadata = { title: "Nova Despesa — ABIPTOM Admin" };

export default function NewExpensePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Nova Despesa</h1>
        <p className="text-sm text-muted-foreground">
          Registar uma nova despesa operacional.
        </p>
      </div>
      <ExpenseForm action={createExpense} submitLabel="Registar despesa" />
    </div>
  );
}
