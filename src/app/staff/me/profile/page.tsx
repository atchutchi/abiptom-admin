import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { getCurrentUser } from "@/lib/auth/actions";
import { getDefaultRoute } from "@/lib/auth/rbac";
import { getAvatarUrl } from "@/lib/users/avatar";
import {
  removeMyAvatar,
  updateMyProfile,
  uploadMyAvatar,
} from "@/lib/users/actions";

export const metadata = { title: "Meu perfil — ABIPTOM Core" };

export default async function StaffProfilePage() {
  const { user, dbUser } = await getCurrentUser();

  if (!user || !dbUser) {
    redirect("/login");
  }

  if (dbUser.role !== "staff") {
    redirect("/admin/profile");
  }

  const avatarUrl = await getAvatarUrl(dbUser.fotografiaUrl);

  return (
    <>
      <Header title="Meu perfil" />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <ProfileForm
            user={dbUser}
            avatarUrl={avatarUrl}
            homeHref={getDefaultRoute(dbUser.role)}
            onSubmit={updateMyProfile}
            onUploadAvatar={uploadMyAvatar}
            onRemoveAvatar={removeMyAvatar}
          />
        </div>
      </main>
    </>
  );
}
