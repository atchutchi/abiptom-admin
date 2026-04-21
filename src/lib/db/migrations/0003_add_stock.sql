-- Stock: enum + tabelas

DO $$ BEGIN
  CREATE TYPE "public"."stock_movement_type" AS ENUM ('entrada', 'saida', 'ajuste');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "stock_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "sku" varchar(100),
  "categoria" varchar(100),
  "unidade" varchar(30) DEFAULT 'unidade' NOT NULL,
  "quantidade_atual" numeric(14, 3) DEFAULT '0' NOT NULL,
  "quantidade_minima" numeric(14, 3) DEFAULT '0' NOT NULL,
  "custo_unitario" numeric(14, 2),
  "localizacao" text,
  "activo" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL,
  "tipo" "stock_movement_type" NOT NULL,
  "quantidade" numeric(14, 3) NOT NULL,
  "custo_unitario" numeric(14, 2),
  "referencia" varchar(200),
  "notas" text,
  "criado_por" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_stock_items_id_fk"
    FOREIGN KEY ("item_id") REFERENCES "public"."stock_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_criado_por_users_id_fk"
    FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_sku_unique" UNIQUE ("sku");
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "stock_items_nome_idx" ON "stock_items" ("nome");
CREATE INDEX IF NOT EXISTS "stock_items_categoria_idx" ON "stock_items" ("categoria");
CREATE INDEX IF NOT EXISTS "stock_movements_item_id_idx" ON "stock_movements" ("item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_created_at_idx" ON "stock_movements" ("created_at");
