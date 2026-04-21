import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbAdmin } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { UserForm } from "@/components/forms/UserForm";
import { createUser } from "@/lib/users/actions";

export const metadata = { title: "Novo utilizador — ABIPTOM Admin" };

export default async function NewUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await dbAdmin.query.users.findFirst({
    where: eq(users.authUserId, user.id),
  });

  if (!dbUser || (dbUser.role !== "ca" && dbUser.role !== "dg")) {
    redirect("/admin/dashboard");
  }

  return (
    <>
      <Header title="Novo utilizador" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border p-6">
            <UserForm onSubmit={createUser} />
          </div>
        </div>
      </main>
    </>
  );
}
