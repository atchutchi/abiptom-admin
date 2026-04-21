-- Migração: módulo Despesas (Fase 3)
-- Aplicar no SQL Editor do Supabase Abiptom
-- IMPORTANTE: começa por limpar tentativas parciais anteriores

-- ─── Limpeza (seguro: não há dados ainda) ──────────────────────────────────

DROP TABLE IF EXISTS expenses CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;
DROP TYPE IF EXISTS expense_state CASCADE;

-- ─── Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE expense_category AS ENUM (
  'aluguer',
  'servicos_publicos',
  'material_escritorio',
  'deslocacoes',
  'marketing',
  'formacao',
  'software_licencas',
  'manutencao',
  'impostos_taxas',
  'outros'
);

CREATE TYPE expense_state AS ENUM (
  'rascunho',
  'aprovada',
  'paga',
  'anulada'
);

-- ─── Tabela expenses ───────────────────────────────────────────────────────

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  categoria expense_category NOT NULL,
  descricao text NOT NULL,
  fornecedor text,
  nif_fornecedor varchar(50),
  valor numeric(14, 2) NOT NULL,
  moeda currency NOT NULL DEFAULT 'XOF',
  taxa_cambio numeric(10, 6) DEFAULT 1,
  valor_xof numeric(14, 2) NOT NULL,
  metodo_pagamento varchar(100),
  referencia varchar(200),
  comprovativo_url text,
  estado expense_state NOT NULL DEFAULT 'rascunho',
  data_pagamento date,
  notas text,
  criado_por uuid REFERENCES users(id) ON DELETE SET NULL,
  aprovado_por uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_data ON expenses(data DESC);
CREATE INDEX idx_expenses_categoria ON expenses(categoria);
CREATE INDEX idx_expenses_estado ON expenses(estado);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_expenses" ON expenses
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_insert_expenses" ON expenses
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_expenses" ON expenses
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── Trigger updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
