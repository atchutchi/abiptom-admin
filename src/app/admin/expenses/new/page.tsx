import ExpenseForm from "@/components/forms/ExpenseForm";
import { createExpense } from "@/lib/expenses/actions";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nova Despesa — ABIPTOM Admin" };

export default function NewExpensePage() {
  return (
    <>
      <Header title="Nova Despesa" />

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <Link
              href="/admin/expenses"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Despesas
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Nova Despesa</h1>
            <p className="text-sm text-muted-foreground">
              Registar uma nova despesa operacional.
            </p>
          </div>
          <ExpenseForm action={createExpense} submitLabel="Registar despesa" />
        </div>
      </main>
    </>
  );
}
