CREATE TYPE "public"."currency" AS ENUM('XOF', 'EUR', 'USD');--> statement-breakpoint
CREATE TYPE "public"."invoice_state" AS ENUM('rascunho', 'proforma', 'definitiva', 'paga_parcial', 'paga', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('proforma', 'definitiva');--> statement-breakpoint
CREATE TYPE "public"."periodicidade" AS ENUM('unica', 'mensal', 'anual', 'bienal');--> statement-breakpoint
CREATE TYPE "public"."project_role" AS ENUM('pf', 'aux', 'dg', 'coord');--> statement-breakpoint
CREATE TYPE "public"."project_state" AS ENUM('proposta', 'activo', 'pausado', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."salary_period_state" AS ENUM('aberto', 'calculado', 'confirmado', 'pago');--> statement-breakpoint
CREATE SEQUENCE "public"."invoice_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 254 CACHE 1;--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nif" varchar(50),
	"endereco" text,
	"contacto" varchar(50),
	"email" varchar(255),
	"pais" varchar(100) DEFAULT 'Guiné-Bissau',
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cargo" varchar(100),
	"email" varchar(255),
	"telefone" varchar(50),
	"principal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" date NOT NULL,
	"categoria" varchar(100) NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"moeda" "currency" DEFAULT 'XOF' NOT NULL,
	"taxa_cambio" numeric(10, 6) DEFAULT '1',
	"projecto_id" uuid,
	"beneficiario" text,
	"forma_pagamento" varchar(100),
	"comprovativo_url" text,
	"registado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"ordem" integer DEFAULT 1 NOT NULL,
	"descricao" text NOT NULL,
	"unidade" varchar(50) DEFAULT 'serviço',
	"quantidade" numeric(10, 3) DEFAULT '1' NOT NULL,
	"preco_unitario" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"data" date NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"moeda" "currency" NOT NULL,
	"taxa_cambio" numeric(10, 6) DEFAULT '1',
	"referencia" varchar(200),
	"metodo" varchar(100),
	"comprovativo_url" text,
	"notas" text,
	"registado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" integer,
	"tipo" "invoice_type",
	"estado" "invoice_state" DEFAULT 'rascunho' NOT NULL,
	"client_id" uuid NOT NULL,
	"data_emissao" date NOT NULL,
	"data_vencimento" date,
	"moeda" "currency" DEFAULT 'XOF' NOT NULL,
	"taxa_cambio" numeric(10, 6) DEFAULT '1',
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"igv_percentagem" numeric(5, 2) DEFAULT '0',
	"igv_valor" numeric(14, 2) DEFAULT '0',
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"forma_pagamento" text,
	"conta_bancaria" text DEFAULT 'Banque Atlantique GB — Conta nº 020080330007 — IBAN GW68 GW19 5010 0102 0080 3300 0706',
	"observacoes" text,
	"pdf_url" text,
	"project_id" uuid,
	"enviada_em" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"percentagem_override" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "project_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"papel" "project_role" NOT NULL,
	"percentagem_aplicada" numeric(5, 2) NOT NULL,
	"valor_liquido_projecto" numeric(14, 2) NOT NULL,
	"valor_recebido" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"servico_id" uuid,
	"titulo" text NOT NULL,
	"descricao" text,
	"data_inicio" date NOT NULL,
	"data_fim_estimada" date,
	"estado" "project_state" DEFAULT 'proposta' NOT NULL,
	"ponto_focal_id" uuid,
	"valor_previsto" numeric(14, 2),
	"moeda" "currency" DEFAULT 'XOF' NOT NULL,
	"notas" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"salario_base" numeric(14, 2) DEFAULT '0' NOT NULL,
	"componente_dinamica" jsonb DEFAULT '[]',
	"subsidios" jsonb DEFAULT '{}',
	"outros_beneficios" numeric(14, 2) DEFAULT '0',
	"descontos" numeric(14, 2) DEFAULT '0',
	"total_bruto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_liquido" numeric(14, 2) DEFAULT '0' NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"data_pagamento" date,
	"referencia_pagamento" varchar(200),
	"recibo_url" text,
	"override_motivo" text
);
--> statement-breakpoint
CREATE TABLE "salary_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ano" integer NOT NULL,
	"mes" integer NOT NULL,
	"policy_id" uuid NOT NULL,
	"estado" "salary_period_state" DEFAULT 'aberto' NOT NULL,
	"total_bruto" numeric(14, 2) DEFAULT '0',
	"total_liquido" numeric(14, 2) DEFAULT '0',
	"total_folha" numeric(14, 2) DEFAULT '0',
	"criado_por" uuid,
	"confirmado_em" timestamp with time zone,
	"confirmado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(100) NOT NULL,
	"versao" varchar(20) NOT NULL,
	"descricao" text,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"activo" boolean DEFAULT true NOT NULL,
	"configuracao_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria" varchar(100) NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"unidade" varchar(50) DEFAULT 'serviço',
	"periodicidade" "periodicidade" DEFAULT 'unica' NOT NULL,
	"prazo_entrega" varchar(100),
	"preco_xof" numeric(12, 2),
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projecto_id_projects_id_fk" FOREIGN KEY ("projecto_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_registado_por_users_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_registado_por_users_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assistants" ADD CONSTRAINT "project_assistants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assistants" ADD CONSTRAINT "project_assistants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_payments" ADD CONSTRAINT "project_payments_period_id_salary_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."salary_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_payments" ADD CONSTRAINT "project_payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_payments" ADD CONSTRAINT "project_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_servico_id_services_catalog_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."services_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_ponto_focal_id_users_id_fk" FOREIGN KEY ("ponto_focal_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_lines" ADD CONSTRAINT "salary_lines_period_id_salary_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."salary_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_lines" ADD CONSTRAINT "salary_lines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_periods" ADD CONSTRAINT "salary_periods_policy_id_salary_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."salary_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_periods" ADD CONSTRAINT "salary_periods_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_periods" ADD CONSTRAINT "salary_periods_confirmado_por_users_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;