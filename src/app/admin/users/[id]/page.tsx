import { notFound, redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/Header";
import { UserForm } from "@/components/forms/UserForm";
import {
  updateUser,
  deactivateUser,
  deleteUserPermanently,
} from "@/lib/users/actions";
import { DeactivateUserButton } from "@/components/forms/DeactivateUserButton";
import { DeleteUserPermanentlyButton } from "@/components/forms/DeleteUserPermanentlyButton";
import { getCurrentUser } from "@/lib/auth/actions";

export const metadata = { title: "Editar utilizador — ABIPTOM Core" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;

  const { user, dbUser: actor } = await getCurrentUser();
  if (!user) redirect("/login");

  if (!actor || (actor.role !== "ca" && actor.role !== "dg")) {
    redirect("/admin/dashboard");
  }

  const target = await dbAdmin.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!target) notFound();

  const updateWithId = updateUser.bind(null, id);

  return (
    <>
      <Header title="Editar utilizador" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <UserForm
              defaultValues={target}
              onSubmit={updateWithId}
              isEdit
              canEditDiscount={actor.role === "ca" || actor.role === "dg"}
            />
          </div>

          {target.id !== actor.id && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                Zona de perigo
              </h2>
              <DeactivateUserButton
                userId={id}
                isActive={target.activo}
                onDeactivate={deactivateUser}
              />
              <div className="mt-5 border-t pt-5">
                <DeleteUserPermanentlyButton
                  userId={id}
                  onDelete={deleteUserPermanently}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
