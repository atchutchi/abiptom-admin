-- Tasks + reports (cron snapshots)

DO $$ BEGIN
  CREATE TYPE "public"."task_state" AS ENUM ('pendente', 'em_curso', 'concluida', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."task_priority" AS ENUM ('baixa', 'media', 'alta');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."report_type" AS ENUM ('mensal', 'trimestral', 'anual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "atribuida_a" uuid NOT NULL,
  "atribuida_por" uuid,
  "projecto_id" uuid,
  "cliente_id" uuid,
  "prazo" date,
  "estado" "task_state" DEFAULT 'pendente' NOT NULL,
  "prioridade" "task_priority" DEFAULT 'media' NOT NULL,
  "concluida_em" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tipo" "report_type" NOT NULL,
  "periodo_inicio" date NOT NULL,
  "periodo_fim" date NOT NULL,
  "dados_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "pdf_url" text,
  "xlsx_url" text,
  "gerado_por" uuid,
  "gerado_em" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_atribuida_a_users_id_fk"
    FOREIGN KEY ("atribuida_a") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_atribuida_por_users_id_fk"
    FOREIGN KEY ("atribuida_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projecto_id_projects_id_fk"
    FOREIGN KEY ("projecto_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_cliente_id_clients_id_fk"
    FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_gerado_por_users_id_fk"
    FOREIGN KEY ("gerado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "tasks_estado_idx" ON "tasks" ("estado");
CREATE INDEX IF NOT EXISTS "tasks_prioridade_idx" ON "tasks" ("prioridade");
CREATE INDEX IF NOT EXISTS "tasks_atribuida_a_idx" ON "tasks" ("atribuida_a");
CREATE INDEX IF NOT EXISTS "tasks_prazo_idx" ON "tasks" ("prazo");
CREATE INDEX IF NOT EXISTS "reports_tipo_idx" ON "reports" ("tipo");
CREATE INDEX IF NOT EXISTS "reports_periodo_idx" ON "reports" ("periodo_inicio", "periodo_fim");
