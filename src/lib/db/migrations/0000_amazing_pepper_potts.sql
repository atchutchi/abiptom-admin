CREATE TYPE "public"."user_role" AS ENUM('ca', 'dg', 'coord', 'staff');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"acao" varchar(100) NOT NULL,
	"entidade" varchar(100) NOT NULL,
	"entidade_id" text,
	"dados_antes" jsonb,
	"dados_depois" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"percentagem_quota" numeric(5, 2) NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"nome_completo" text NOT NULL,
	"nome_curto" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"telefone" varchar(30),
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"cargo" text,
	"salario_base_mensal" numeric(12, 2) DEFAULT '0',
	"data_entrada" date,
	"data_saida" date,
	"fotografia_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_shares" ADD CONSTRAINT "partner_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;