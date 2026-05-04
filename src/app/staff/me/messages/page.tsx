import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { getCurrentUser } from "@/lib/auth/actions";
import { listConversations } from "@/lib/messages/actions";

export const metadata = { title: "Chat — ABIPTOM Core" };

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { user, dbUser } = await getCurrentUser();
  if (!user || !dbUser) redirect("/login");

  const params = await searchParams;
  const conversations = await listConversations();

  return (
    <>
      <Header title="Chat" />
      <MessagesClient
        currentUserId={dbUser.id}
        initialConversations={conversations}
        initialConversationId={params.conversation}
      />
    </>
  );
}
