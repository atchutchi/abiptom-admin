-- Migration de recuperação idempotente para o módulo de mensagens.
-- Usar quando a 0010 foi aplicada parcialmente ou quando o SQL Editor acusa
-- "type already exists" ao tentar repetir a migration original.

DO $$
BEGIN
  CREATE TYPE "public"."chat_conversation_type" AS ENUM('direct', 'group', 'project');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."chat_email_notification_state" AS ENUM('pending', 'sent', 'skipped', 'error');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "chat_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "chat_conversation_type" NOT NULL,
  "title" text,
  "direct_key" varchar(80),
  "project_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_read_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "chat_message_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_presence" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "is_online" boolean DEFAULT false NOT NULL,
  "current_conversation_id" uuid,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chat_email_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "state" "chat_email_notification_state" DEFAULT 'pending' NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "chat_conversations"
    ADD CONSTRAINT "chat_conversations_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_conversations"
    ADD CONSTRAINT "chat_conversations_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_participants"
    ADD CONSTRAINT "chat_participants_conversation_id_chat_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_participants"
    ADD CONSTRAINT "chat_participants_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_users_id_fk"
    FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_reads"
    ADD CONSTRAINT "chat_message_reads_message_id_chat_messages_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_reads"
    ADD CONSTRAINT "chat_message_reads_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_presence"
    ADD CONSTRAINT "user_presence_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_presence"
    ADD CONSTRAINT "user_presence_current_conversation_id_chat_conversations_id_fk"
    FOREIGN KEY ("current_conversation_id") REFERENCES "public"."chat_conversations"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_email_notifications"
    ADD CONSTRAINT "chat_email_notifications_message_id_chat_messages_id_fk"
    FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_email_notifications"
    ADD CONSTRAINT "chat_email_notifications_recipient_id_users_id_fk"
    FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversations_direct_key_uq"
  ON "chat_conversations" USING btree ("direct_key")
  WHERE "type" = 'direct' AND "direct_key" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversations_project_uq"
  ON "chat_conversations" USING btree ("project_id")
  WHERE "type" = 'project' AND "project_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "chat_participants_conversation_user_uq"
  ON "chat_participants" USING btree ("conversation_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "chat_message_reads_message_user_uq"
  ON "chat_message_reads" USING btree ("message_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "chat_email_notifications_message_recipient_uq"
  ON "chat_email_notifications" USING btree ("message_id", "recipient_id");

CREATE INDEX IF NOT EXISTS "chat_messages_conversation_created_idx"
  ON "chat_messages" USING btree ("conversation_id", "created_at");

CREATE INDEX IF NOT EXISTS "chat_email_notifications_pending_idx"
  ON "chat_email_notifications" USING btree ("state", "available_at");

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.is_chat_participant(target_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE conversation_id = target_conversation_id
      AND user_id = private.current_app_user_id()
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_chat_participant(uuid) TO authenticated;

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_email_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "chat_select_own_conversations" ON chat_conversations
    FOR SELECT
    USING (private.is_chat_participant(id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "chat_select_own_participants" ON chat_participants
    FOR SELECT
    USING (private.is_chat_participant(conversation_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "chat_select_own_messages" ON chat_messages
    FOR SELECT
    USING (private.is_chat_participant(conversation_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "chat_select_own_reads" ON chat_message_reads
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM chat_messages cm
        WHERE cm.id = chat_message_reads.message_id
          AND private.is_chat_participant(cm.conversation_id)
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "presence_select_authenticated" ON user_presence
    FOR SELECT
    USING (get_my_role() IN ('ca', 'dg', 'coord', 'staff'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "presence_update_own" ON user_presence
    FOR UPDATE
    USING (user_id = private.current_app_user_id())
    WITH CHECK (user_id = private.current_app_user_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "presence_insert_own" ON user_presence
    FOR INSERT
    WITH CHECK (user_id = private.current_app_user_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "chat_select_own_email_notifications" ON chat_email_notifications
    FOR SELECT
    USING (recipient_id = private.current_app_user_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
