-- ═══════════════════════════════════════════════════════════════
-- Migração Fase 3 (SEGURA) — Projectos e Folha Salarial
-- Cola no SQL Editor do Supabase (abiptom-admin).
-- Usa IF NOT EXISTS — seguro correr mesmo que já exista algo.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Enums (cria só se não existirem) ──────────────────────

DO $$ BEGIN
  CREATE TYPE "project_state" AS ENUM('proposta','activo','pausado','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "salary_period_state" AS ENUM('aberto','calculado','confirmado','pago');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "project_role" AS ENUM('pf','aux','dg','coord');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. projects ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE RESTRICT,
  "servico_id" uuid REFERENCES "services_catalog"("id") ON DELETE SET NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "data_inicio" date NOT NULL,
  "data_fim_estimada" date,
  "estado" project_state DEFAULT 'proposta' NOT NULL,
  "ponto_focal_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "valor_previsto" numeric(14,2),
  "moeda" currency DEFAULT 'XOF' NOT NULL,
  "notas" text,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- ─── 3. project_assistants ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "project_assistants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "percentagem_override" numeric(5,2)
);

-- ─── 4. project_id em invoices (se não existir já) ────────────

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;

-- ─── 5. salary_policies ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "salary_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" varchar(100) NOT NULL,
  "versao" varchar(20) NOT NULL,
  "descricao" text,
  "data_inicio" date NOT NULL,
  "data_fim" date,
  "activo" boolean DEFAULT true NOT NULL,
  "configuracao_json" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- ─── 6. salary_periods ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "salary_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ano" integer NOT NULL,
  "mes" integer NOT NULL,
  "policy_id" uuid NOT NULL REFERENCES "salary_policies"("id") ON DELETE RESTRICT,
  "estado" salary_period_state DEFAULT 'aberto' NOT NULL,
  "total_bruto" numeric(14,2) DEFAULT '0',
  "total_liquido" numeric(14,2) DEFAULT '0',
  "total_folha" numeric(14,2) DEFAULT '0',
  "criado_por" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "confirmado_em" timestamptz,
  "confirmado_por" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- ─── 7. salary_lines ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "salary_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period_id" uuid NOT NULL REFERENCES "salary_periods"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "salario_base" numeric(14,2) DEFAULT '0' NOT NULL,
  "componente_dinamica" jsonb DEFAULT '[]',
  "subsidios" jsonb DEFAULT '{}',
  "outros_beneficios" numeric(14,2) DEFAULT '0',
  "descontos" numeric(14,2) DEFAULT '0',
  "total_bruto" numeric(14,2) DEFAULT '0' NOT NULL,
  "total_liquido" numeric(14,2) DEFAULT '0' NOT NULL,
  "pago" boolean DEFAULT false NOT NULL,
  "data_pagamento" date,
  "referencia_pagamento" varchar(200),
  "recibo_url" text,
  "override_motivo" text
);

-- ─── 8. project_payments ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "project_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "period_id" uuid NOT NULL REFERENCES "salary_periods"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE RESTRICT,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "papel" project_role NOT NULL,
  "percentagem_aplicada" numeric(5,2) NOT NULL,
  "valor_liquido_projecto" numeric(14,2) NOT NULL,
  "valor_recebido" numeric(14,2) NOT NULL
);

-- ─── 9. expenses ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "data" date NOT NULL,
  "categoria" varchar(100) NOT NULL,
  "descricao" text NOT NULL,
  "valor" numeric(14,2) NOT NULL,
  "moeda" currency DEFAULT 'XOF' NOT NULL,
  "taxa_cambio" numeric(10,6) DEFAULT '1',
  "projecto_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "beneficiario" text,
  "forma_pagamento" varchar(100),
  "comprovativo_url" text,
  "registado_por" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- ─── 10. Seed políticas salariais (só se tabela vazia) ────────

INSERT INTO salary_policies (nome, versao, descricao, data_inicio, activo, configuracao_json)
SELECT
  'Política Actual',
  '2024',
  'Política de remuneração em vigor desde 2024. 1 aux: PF 30%, Aux 15%. 2 aux: PF 25%, Aux 10% cada. DG 5%, Resto ABIPTOM 50%. Subsídio dinâmico 22% do saldo / 8 pessoas.',
  '2024-01-01',
  true,
  '{
    "tipo": "actual_2024",
    "percentagens": {
      "pf_0aux": 0.30,
      "pf_1aux": 0.30,
      "pf_2aux": 0.25,
      "aux_1aux": 0.15,
      "aux_2aux": 0.10,
      "dg": 0.05,
      "resto": 0.50
    },
    "subsidio": {
      "percentagem": 0.22,
      "numPessoas": 8
    }
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM salary_policies WHERE versao = '2024');

INSERT INTO salary_policies (nome, versao, descricao, data_inicio, activo, configuracao_json)
SELECT
  'Guia Remuneração',
  '2026',
  'Nova política 2026. Reserva 10%, Fundo 5%, PF 25%/20%, Aux 10%/7,5%, Coord 5%, Custos 20%, Margem 25%.',
  '2026-01-01',
  true,
  '{
    "tipo": "guia_2026",
    "percentagens": {
      "reserva": 0.10,
      "fundo": 0.05,
      "pf_1aux": 0.25,
      "pf_2aux": 0.20,
      "aux_1aux": 0.10,
      "aux_2aux": 0.075,
      "coord": 0.05,
      "custos": 0.20,
      "margem": 0.25
    }
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM salary_policies WHERE versao = '2026');

-- ─── Verificação final ─────────────────────────────────────────

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'projects','project_assistants',
    'salary_policies','salary_periods','salary_lines',
    'project_payments','expenses'
  )
ORDER BY table_name;

SELECT nome, versao, configuracao_json -> 'percentagens' AS pcts
FROM salary_policies
ORDER BY versao;
