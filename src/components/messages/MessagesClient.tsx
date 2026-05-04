"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FolderKanban,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  createDirectConversation,
  createGroupConversation,
  createProjectConversation,
  getConversationMessages,
  listConversations,
  markConversationRead,
  sendMessage,
  type ConversationMessage,
  type ConversationSummary,
  type MessageProject,
  type MessageUser,
} from "@/lib/messages/actions";
import { cn } from "@/lib/utils";

interface MessagesClientProps {
  currentUserId: string;
  initialConversations: ConversationSummary[];
  users: MessageUser[];
  projects: MessageProject[];
  initialConversationId?: string | null;
}

type NewConversationMode = "direct" | "group" | "project";

const TYPE_LABELS: Record<string, string> = {
  direct: "Colega",
  group: "Grupo",
  project: "Projecto",
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLastSeen(value: string | null) {
  if (!value) return "Offline";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 2) return "Visto agora";
  if (diffMinutes < 60) return `Visto há ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Visto há ${diffHours} h`;

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

export function MessagesClient({
  currentUserId,
  initialConversations,
  users,
  projects,
  initialConversationId,
}: MessagesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(
    initialConversationId ?? initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<NewConversationMode>("direct");
  const [directUserId, setDirectUserId] = useState(users[0]?.id ?? "");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupParticipantIds, setGroupParticipantIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canCreateConversation =
    (mode === "direct" && Boolean(directUserId)) ||
    (mode === "group" && groupTitle.trim().length >= 2 && groupParticipantIds.length >= 2) ||
    (mode === "project" && Boolean(projectId));

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId
  );

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(term)
    );
  }, [conversations, search]);

  const refreshConversations = useCallback(async () => {
    const next = await listConversations().catch(() => null);
    if (next) setConversations(next);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const nextMessages = await getConversationMessages(conversationId);
    setMessages(nextMessages);
    await markConversationRead(conversationId).catch(() => undefined);
    await refreshConversations();
  }, [refreshConversations]);

  function updateUrl(conversationId: string) {
    const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
    nextParams.set("conversation", conversationId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function selectConversation(conversationId: string) {
    setSelectedId(conversationId);
    updateUrl(conversationId);
  }

  useEffect(() => {
    if (!selectedId) return;

    let mounted = true;
    getConversationMessages(selectedId)
      .then((nextMessages) => {
        if (mounted) setMessages(nextMessages);
      })
      .then(() => markConversationRead(selectedId))
      .then(() => refreshConversations())
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [refreshConversations, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedId]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
      return;
    }

    if (
      selectedId &&
      conversations.length > 0 &&
      !conversations.some((conversation) => conversation.id === selectedId)
    ) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${selectedId ?? "none"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: selectedId ? `conversation_id=eq.${selectedId}` : undefined,
        },
        () => {
          if (selectedId) {
            void loadMessages(selectedId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => {
          void refreshConversations();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, refreshConversations, selectedId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (selectedId) {
        void loadMessages(selectedId).catch(() => undefined);
        return;
      }

      void refreshConversations();
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [loadMessages, refreshConversations, selectedId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !body.trim() || isPending) return;

    const nextBody = body;
    setBody("");
    setError(null);

    startTransition(async () => {
      try {
        const result = await sendMessage(selectedId, nextBody);
        if ("error" in result && result.error) {
          setError(result.error);
          setBody(nextBody);
          return;
        }

        if (result.message) {
          setMessages((current) =>
            current.some((message) => message.id === result.message.id)
              ? current
              : [...current, result.message]
          );
        }
        await loadMessages(selectedId);
      } catch {
        setError("Não foi possível enviar a mensagem. Tenta novamente.");
        setBody(nextBody);
      }
    });
  }

  async function handleCreateConversation(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result =
          mode === "direct"
            ? await createDirectConversation(directUserId)
            : mode === "group"
              ? await createGroupConversation({
                  title: groupTitle,
                  participantIds: groupParticipantIds,
                })
              : await createProjectConversation(projectId);

        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }

        if (result.conversationId) {
          const nextConversations = await listConversations();
          setConversations(nextConversations);
          setSelectedId(result.conversationId);
          updateUrl(result.conversationId);
        }

        setDialogOpen(false);
        setGroupTitle("");
        setGroupParticipantIds([]);
      } catch {
        setError("Não foi possível criar a conversa.");
      }
    });
  }

  function toggleGroupParticipant(userId: string) {
    setGroupParticipantIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  return (
    <main className="flex h-[calc(100dvh-4rem)] min-h-0 flex-1 overflow-hidden p-3 md:p-4">
      <div className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-[minmax(11rem,35%)_minmax(0,1fr)] overflow-hidden rounded-lg border border-[color:var(--brand-line)] bg-[color:var(--brand-card)] shadow-sm lg:grid-cols-[20rem_1fr] lg:grid-rows-1">
        <aside className="flex min-h-0 flex-col border-b border-[color:var(--brand-line)] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--brand-line)] p-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--brand-ink)]">
                Conversas
              </p>
              <p className="text-xs text-[color:var(--brand-muted)]">
                {conversations.length} activas
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button size="icon-sm" aria-label="Nova conversa" />}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </DialogTrigger>
              <DialogContent className="max-h-[min(44rem,calc(100vh-2rem))] w-[min(46rem,calc(100vw-2rem))] overflow-hidden p-0 sm:max-w-none">
                <form
                  onSubmit={handleCreateConversation}
                  className="flex max-h-[min(44rem,calc(100vh-2rem))] min-w-0 flex-col"
                >
                  <DialogHeader className="border-b border-[color:var(--brand-line)] px-5 py-4">
                    <DialogTitle>Nova conversa</DialogTitle>
                  </DialogHeader>

                  <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(["direct", "group", "project"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setMode(item);
                            setError(null);
                          }}
                          className={cn(
                            "h-10 min-w-0 truncate rounded-lg border px-2 text-sm font-medium transition-colors",
                            mode === item
                              ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-ink)]"
                              : "border-[color:var(--brand-line)] text-[color:var(--brand-muted)] hover:bg-[rgb(245_184_0_/_10%)]"
                          )}
                        >
                          {TYPE_LABELS[item]}
                        </button>
                      ))}
                    </div>

                    {mode === "direct" && (
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">Colega</span>
                        <select
                          value={directUserId}
                          onChange={(event) => {
                            setDirectUserId(event.target.value);
                            setError(null);
                          }}
                          className="h-9 w-full min-w-0 rounded-lg border border-input bg-[rgb(255_253_248_/_85%)] px-2 text-sm outline-none focus:border-[color:var(--brand-gold)]"
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.nomeCurto} · {user.cargo ?? user.email}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {mode === "group" && (
                      <div className="space-y-3">
                        <label className="block min-w-0 space-y-2 text-sm">
                          <span className="font-medium">Nome do grupo</span>
                          <Input
                            value={groupTitle}
                            onChange={(event) => {
                              setGroupTitle(event.target.value);
                              setError(null);
                            }}
                            placeholder="Ex.: Equipa comercial"
                            className="min-w-0"
                          />
                        </label>
                        <div className="max-h-56 space-y-1 overflow-y-auto overflow-x-hidden rounded-lg border border-[color:var(--brand-line)] p-2">
                          {users.map((user) => (
                            <label
                              key={user.id}
                              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-[rgb(245_184_0_/_10%)]"
                            >
                              <input
                                type="checkbox"
                                checked={groupParticipantIds.includes(user.id)}
                                onChange={() => {
                                  toggleGroupParticipant(user.id);
                                  setError(null);
                                }}
                                className="h-4 w-4 shrink-0 accent-[color:var(--brand-gold)]"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {user.nomeCurto} · {user.cargo ?? user.email}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {mode === "project" && (
                      <label className="block min-w-0 space-y-2 text-sm">
                        <span className="font-medium">Projecto</span>
                        <select
                          value={projectId}
                          onChange={(event) => {
                            setProjectId(event.target.value);
                            setError(null);
                          }}
                          className="h-9 w-full min-w-0 rounded-lg border border-input bg-[rgb(255_253_248_/_85%)] px-2 text-sm outline-none focus:border-[color:var(--brand-gold)]"
                        >
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.titulo}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {error && <p className="text-sm text-red-600">{error}</p>}
                  </div>

                  <div className="flex justify-end border-t border-[color:var(--brand-line)] bg-[rgb(255_243_194_/_45%)] px-5 py-4">
                    <Button type="submit" disabled={isPending || !canCreateConversation}>
                      Criar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border-b border-[color:var(--brand-line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[color:var(--brand-muted)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar"
                className="pl-8"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <div className="p-6 text-center text-sm text-[color:var(--brand-muted)]">
                Nenhuma conversa.
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-[rgb(234_223_189_/_65%)] px-3 py-3 text-left transition-colors hover:bg-[rgb(245_184_0_/_9%)]",
                  selectedId === conversation.id && "bg-[color:var(--brand-gold-soft)]"
                )}
              >
                <ConversationIcon type={conversation.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[color:var(--brand-ink)]">
                      {conversation.title}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge>{conversation.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-[color:var(--brand-muted)]">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.body}`
                      : `${TYPE_LABELS[conversation.type]} sem mensagens`}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <PresenceDots participants={conversation.participants} />
                    <span className="truncate text-[11px] text-[color:var(--brand-muted-light)]">
                      {conversation.participants.length} participantes
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[color:var(--brand-line)] px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-[color:var(--brand-ink)]">
                      {selectedConversation.title}
                    </h2>
                    <Badge variant="outline">{TYPE_LABELS[selectedConversation.type]}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-[color:var(--brand-muted)]">
                    {selectedConversation.participants
                      .map((participant) => participant.nomeCurto)
                      .join(", ")}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-3 md:flex">
                  {selectedConversation.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-1 text-xs text-[color:var(--brand-muted)]"
                      title={formatLastSeen(participant.lastSeenAt)}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          participant.isOnline ? "bg-green-600" : "bg-gray-300"
                        )}
                      />
                      <span>{participant.nomeCurto}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[rgb(255_250_240_/_75%)] p-4">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-[color:var(--brand-muted)]">
                    Ainda não há mensagens.
                  </div>
                )}
                {messages.map((message) => {
                  const mine = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[min(40rem,85%)] rounded-lg px-3 py-2 shadow-sm",
                          mine
                            ? "bg-[color:var(--brand-ink)] text-[#fff8df]"
                            : "border border-[color:var(--brand-line)] bg-white text-[color:var(--brand-ink)]"
                        )}
                      >
                        {!mine && (
                          <p className="mb-1 text-xs font-semibold text-[color:var(--brand-gold-dark)]">
                            {message.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.body}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px]",
                            mine ? "text-[#fff3c2]" : "text-[color:var(--brand-muted)]"
                          )}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="shrink-0 border-t border-[color:var(--brand-line)] bg-[color:var(--brand-card)] p-3"
              >
                {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Escrever mensagem"
                    rows={2}
                    className="min-h-10 min-w-0 flex-1 resize-none rounded-lg border border-input bg-[rgb(255_253_248_/_85%)] px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-gold)] focus:ring-3 focus:ring-[rgb(245_184_0_/_25%)]"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon-lg"
                    disabled={!body.trim() || isPending}
                    className="shrink-0 md:w-auto md:px-3"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only md:not-sr-only md:ml-2">Enviar</span>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[color:var(--brand-muted)]">
              Cria ou selecciona uma conversa.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ConversationIcon({ type }: { type: string }) {
  const Icon =
    type === "project" ? FolderKanban : type === "group" ? Users : MessageSquare;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-ink)]">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function PresenceDots({ participants }: { participants: MessageUser[] }) {
  const onlineCount = participants.filter((participant) => participant.isOnline).length;

  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full bg-green-600" />
      <span className="text-[11px] text-[color:var(--brand-muted-light)]">
        {onlineCount} online
      </span>
    </span>
  );
}
