-- Dividendos: enum + tabelas

DO $$ BEGIN
  CREATE TYPE "public"."dividend_state" AS ENUM ('proposto', 'aprovado', 'pago', 'anulado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "dividend_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ano" integer NOT NULL,
  "trimestre" integer,
  "base_calculada" numeric(14, 2) DEFAULT '0' NOT NULL,
  "total_distribuido" numeric(14, 2) DEFAULT '0' NOT NULL,
  "estado" "dividend_state" DEFAULT 'proposto' NOT NULL,
  "notas" text,
  "criado_por" uuid,
  "aprovado_por" uuid,
  "aprovado_em" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "dividend_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "percentagem_quota" numeric(5, 2) NOT NULL,
  "valor_bruto" numeric(14, 2) DEFAULT '0' NOT NULL,
  "pago" boolean DEFAULT false NOT NULL,
  "data_pagamento" date,
  "referencia_pagamento" varchar(200),
  "notas" text
);

DO $$ BEGIN
  ALTER TABLE "dividend_periods" ADD CONSTRAINT "dividend_periods_criado_por_users_id_fk"
    FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "dividend_periods" ADD CONSTRAINT "dividend_periods_aprovado_por_users_id_fk"
    FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "dividend_lines" ADD CONSTRAINT "dividend_lines_period_id_dividend_periods_id_fk"
    FOREIGN KEY ("period_id") REFERENCES "public"."dividend_periods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "dividend_lines" ADD CONSTRAINT "dividend_lines_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "dividend_periods_ano_idx" ON "dividend_periods" ("ano");
CREATE INDEX IF NOT EXISTS "dividend_lines_period_id_idx" ON "dividend_lines" ("period_id");
CREATE INDEX IF NOT EXISTS "dividend_lines_user_id_idx" ON "dividend_lines" ("user_id");
