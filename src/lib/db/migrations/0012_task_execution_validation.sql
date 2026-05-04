ALTER TYPE "public"."task_state" ADD VALUE IF NOT EXISTS 'submetida';
ALTER TYPE "public"."task_state" ADD VALUE IF NOT EXISTS 'aprovada';
ALTER TYPE "public"."task_state" ADD VALUE IF NOT EXISTS 'precisa_correcao';
ALTER TYPE "public"."task_state" ADD VALUE IF NOT EXISTS 'rejeitada';

DO $$
BEGIN
  CREATE TYPE "public"."project_deliverable_state" AS ENUM ('planeado', 'em_curso', 'concluido', 'cancelado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."task_validation_decision" AS ENUM ('aprovada', 'precisa_correcao', 'rejeitada');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

GRANT EXECUTE ON FUNCTION private.current_app_user_id() TO authenticated;

CREATE TABLE IF NOT EXISTS "project_deliverables" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "peso" numeric(7,2) DEFAULT '0' NOT NULL,
  "prazo" date,
  "estado" "public"."project_deliverable_state" DEFAULT 'planeado' NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deliverable_id" uuid;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "execution_weight" numeric(7,2) DEFAULT '1' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submission_note" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "validated_at" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "validated_by" uuid;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "quality_score" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "validation_note" text;

DO $$
BEGIN
  ALTER TABLE "project_deliverables"
    ADD CONSTRAINT "project_deliverables_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_deliverables"
    ADD CONSTRAINT "project_deliverables_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_deliverable_id_project_deliverables_id_fk"
    FOREIGN KEY ("deliverable_id") REFERENCES "public"."project_deliverables"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_validated_by_users_id_fk"
    FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "project_deliverables_project_title_uq"
  ON "project_deliverables" ("project_id", "titulo");
CREATE INDEX IF NOT EXISTS "project_deliverables_project_idx"
  ON "project_deliverables" ("project_id");
CREATE INDEX IF NOT EXISTS "tasks_deliverable_idx" ON "tasks" ("deliverable_id");
CREATE INDEX IF NOT EXISTS "tasks_validated_by_idx" ON "tasks" ("validated_by");
CREATE INDEX IF NOT EXISTS "tasks_submitted_at_idx" ON "tasks" ("submitted_at");

CREATE TABLE IF NOT EXISTS "task_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "comentario" text,
  "evidencia_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "task_submissions"
    ADD CONSTRAINT "task_submissions_task_id_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "task_submissions"
    ADD CONSTRAINT "task_submissions_submitted_by_users_id_fk"
    FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "task_submissions_task_idx" ON "task_submissions" ("task_id");
CREATE INDEX IF NOT EXISTS "task_submissions_submitted_by_idx" ON "task_submissions" ("submitted_by");

CREATE TABLE IF NOT EXISTS "task_validations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "submission_id" uuid,
  "validated_by" uuid NOT NULL,
  "decision" "public"."task_validation_decision" NOT NULL,
  "quality_score" integer,
  "comentario" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "task_validations"
    ADD CONSTRAINT "task_validations_task_id_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "task_validations"
    ADD CONSTRAINT "task_validations_submission_id_task_submissions_id_fk"
    FOREIGN KEY ("submission_id") REFERENCES "public"."task_submissions"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "task_validations"
    ADD CONSTRAINT "task_validations_validated_by_users_id_fk"
    FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "task_validations_task_idx" ON "task_validations" ("task_id");
CREATE INDEX IF NOT EXISTS "task_validations_validated_by_idx" ON "task_validations" ("validated_by");

CREATE TABLE IF NOT EXISTS "project_execution_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "ano" integer NOT NULL,
  "mes" integer NOT NULL,
  "planned_weight" numeric(7,2) DEFAULT '0' NOT NULL,
  "approved_weight" numeric(7,2) DEFAULT '0' NOT NULL,
  "execution_percent" numeric(7,2) DEFAULT '0' NOT NULL,
  "assigned_tasks" integer DEFAULT 0 NOT NULL,
  "submitted_tasks" integer DEFAULT 0 NOT NULL,
  "approved_tasks" integer DEFAULT 0 NOT NULL,
  "rejected_tasks" integer DEFAULT 0 NOT NULL,
  "pending_validation_tasks" integer DEFAULT 0 NOT NULL,
  "overdue_tasks" integer DEFAULT 0 NOT NULL,
  "generated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_execution_snapshots_project_month_uq"
  ON "project_execution_snapshots" ("project_id", "ano", "mes");

DO $$
BEGIN
  ALTER TABLE "project_execution_snapshots"
    ADD CONSTRAINT "project_execution_snapshots_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "project_execution_snapshots"
    ADD CONSTRAINT "project_execution_snapshots_generated_by_users_id_fk"
    FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "staff_performance_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "project_id" uuid,
  "ano" integer NOT NULL,
  "mes" integer NOT NULL,
  "assigned_tasks" integer DEFAULT 0 NOT NULL,
  "submitted_tasks" integer DEFAULT 0 NOT NULL,
  "approved_tasks" integer DEFAULT 0 NOT NULL,
  "rejected_tasks" integer DEFAULT 0 NOT NULL,
  "overdue_tasks" integer DEFAULT 0 NOT NULL,
  "approval_rate" numeric(7,2) DEFAULT '0' NOT NULL,
  "quality_average" numeric(7,2),
  "generated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_performance_snapshots_user_project_month_uq"
  ON "staff_performance_snapshots" ("user_id", "project_id", "ano", "mes");

DO $$
BEGIN
  ALTER TABLE "staff_performance_snapshots"
    ADD CONSTRAINT "staff_performance_snapshots_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "staff_performance_snapshots"
    ADD CONSTRAINT "staff_performance_snapshots_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "staff_performance_snapshots"
    ADD CONSTRAINT "staff_performance_snapshots_generated_by_users_id_fk"
    FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "project_deliverables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_validations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_execution_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_performance_snapshots" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_deliverables' AND policyname = 'project_deliverables_select_visible') THEN
    CREATE POLICY "project_deliverables_select_visible" ON "project_deliverables"
      FOR SELECT TO authenticated
      USING (
        get_my_role() IN ('ca', 'dg', 'coord')
        OR EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = project_deliverables.project_id
            AND p.ponto_focal_id = private.current_app_user_id()
        )
        OR EXISTS (
          SELECT 1 FROM project_assistants pa
          WHERE pa.project_id = project_deliverables.project_id
            AND pa.user_id = private.current_app_user_id()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_deliverables' AND policyname = 'project_deliverables_manage_admin_coord') THEN
    CREATE POLICY "project_deliverables_manage_admin_coord" ON "project_deliverables"
      FOR ALL TO authenticated
      USING (get_my_role() IN ('ca', 'dg', 'coord'))
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_submissions' AND policyname = 'task_submissions_select_visible') THEN
    CREATE POLICY "task_submissions_select_visible" ON "task_submissions"
      FOR SELECT TO authenticated
      USING (
        get_my_role() IN ('ca', 'dg', 'coord')
        OR submitted_by = private.current_app_user_id()
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_submissions.task_id
            AND t.atribuida_a = private.current_app_user_id()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_submissions' AND policyname = 'task_submissions_insert_own') THEN
    CREATE POLICY "task_submissions_insert_own" ON "task_submissions"
      FOR INSERT TO authenticated
      WITH CHECK (
        submitted_by = private.current_app_user_id()
        AND EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_submissions.task_id
            AND (t.atribuida_a = private.current_app_user_id() OR get_my_role() IN ('ca', 'dg', 'coord'))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_validations' AND policyname = 'task_validations_select_visible') THEN
    CREATE POLICY "task_validations_select_visible" ON "task_validations"
      FOR SELECT TO authenticated
      USING (
        get_my_role() IN ('ca', 'dg', 'coord')
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_validations.task_id
            AND t.atribuida_a = private.current_app_user_id()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'task_validations' AND policyname = 'task_validations_insert_admin_coord') THEN
    CREATE POLICY "task_validations_insert_admin_coord" ON "task_validations"
      FOR INSERT TO authenticated
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'project_execution_snapshots' AND policyname = 'project_execution_snapshots_admin_coord') THEN
    CREATE POLICY "project_execution_snapshots_admin_coord" ON "project_execution_snapshots"
      FOR ALL TO authenticated
      USING (get_my_role() IN ('ca', 'dg', 'coord'))
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_performance_snapshots' AND policyname = 'staff_performance_snapshots_select_visible') THEN
    CREATE POLICY "staff_performance_snapshots_select_visible" ON "staff_performance_snapshots"
      FOR SELECT TO authenticated
      USING (
        get_my_role() IN ('ca', 'dg', 'coord')
        OR user_id = private.current_app_user_id()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_performance_snapshots' AND policyname = 'staff_performance_snapshots_manage_admin_coord') THEN
    CREATE POLICY "staff_performance_snapshots_manage_admin_coord" ON "staff_performance_snapshots"
      FOR ALL TO authenticated
      USING (get_my_role() IN ('ca', 'dg', 'coord'))
      WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));
  END IF;
END $$;
