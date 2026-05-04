import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { getCurrentUser } from "@/lib/auth/actions";
import {
  listConversations,
  listMessageProjects,
  listMessageUsers,
} from "@/lib/messages/actions";

export const metadata = { title: "Chat — ABIPTOM Core" };

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");
  if (dbUser.role === "staff") redirect("/staff/me/messages");

  const params = await searchParams;
  const [conversations, users, projects] = await Promise.all([
    listConversations(),
    listMessageUsers(),
    listMessageProjects(),
  ]);

  return (
    <>
      <Header title="Chat" />
      <MessagesClient
        currentUserId={dbUser.id}
        initialConversations={conversations}
        users={users}
        projects={projects}
        initialConversationId={params.conversation}
      />
    </>
  );
}
