-- Migração: correcções ao motor de folha salarial (política actual_2024)
-- Aplicar no SQL Editor do Supabase Abiptom
-- Idempotente: pode ser re-executada sem erros.
--
-- Introduz:
--   * users.percentagem_desconto_folha, users.elegivel_subsidio_dinamico_default
--   * projects.percentagem_pf, percentagem_aux_total, percentagem_rubrica_gestao
--   * expenses.beneficiario_user_id (+ índice)
--   * Tabela salary_period_participants (com partial unique index)
--   * salary_lines.total_bruto_calculado / _final; total_liquido_calculado / _final
--     (rename + backfill a partir de total_bruto / total_liquido)
--   * RLS policies para salary_period_participants

-- ─── users ─────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS percentagem_desconto_folha numeric(5, 4) NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS elegivel_subsidio_dinamico_default boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_percentagem_desconto_folha_range'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_percentagem_desconto_folha_range
      CHECK (percentagem_desconto_folha >= 0 AND percentagem_desconto_folha <= 1);
  END IF;
END $$;

-- ─── projects ──────────────────────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS percentagem_pf numeric(5, 4);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS percentagem_aux_total numeric(5, 4);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS percentagem_rubrica_gestao numeric(5, 4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_percentagem_pf_range'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_percentagem_pf_range
      CHECK (percentagem_pf IS NULL OR (percentagem_pf >= 0 AND percentagem_pf <= 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_percentagem_aux_total_range'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_percentagem_aux_total_range
      CHECK (percentagem_aux_total IS NULL OR (percentagem_aux_total >= 0 AND percentagem_aux_total <= 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_percentagem_rubrica_gestao_range'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_percentagem_rubrica_gestao_range
      CHECK (percentagem_rubrica_gestao IS NULL OR (percentagem_rubrica_gestao >= 0 AND percentagem_rubrica_gestao <= 1));
  END IF;
END $$;

-- ─── expenses ──────────────────────────────────────────────────────────────

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS beneficiario_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_data_beneficiario
  ON expenses(data, beneficiario_user_id);

-- ─── salary_period_participants ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary_period_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES salary_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  is_elegivel_subsidio boolean NOT NULL DEFAULT true,
  recebe_rubrica_gestao boolean NOT NULL DEFAULT false,
  salario_base_override numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_rubrica_gestao_per_period
  ON salary_period_participants (period_id)
  WHERE recebe_rubrica_gestao = true;

CREATE INDEX IF NOT EXISTS idx_salary_period_participants_period
  ON salary_period_participants (period_id);

CREATE INDEX IF NOT EXISTS idx_salary_period_participants_user
  ON salary_period_participants (user_id);

-- Trigger updated_at (reutiliza função set_updated_at criada na 0001_add_expenses)
DROP TRIGGER IF EXISTS trg_salary_period_participants_updated_at ON salary_period_participants;
CREATE TRIGGER trg_salary_period_participants_updated_at
  BEFORE UPDATE ON salary_period_participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── salary_lines: rename + novas colunas _calculado ────────────────────────

-- Rename total_bruto -> total_bruto_final (se ainda tem o nome antigo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_lines' AND column_name = 'total_bruto'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_lines' AND column_name = 'total_bruto_final'
  ) THEN
    ALTER TABLE salary_lines RENAME COLUMN total_bruto TO total_bruto_final;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_lines' AND column_name = 'total_liquido'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salary_lines' AND column_name = 'total_liquido_final'
  ) THEN
    ALTER TABLE salary_lines RENAME COLUMN total_liquido TO total_liquido_final;
  END IF;
END $$;

-- Novas colunas _calculado (o motor preenche; linhas antigas recebem backfill)
ALTER TABLE salary_lines
  ADD COLUMN IF NOT EXISTS total_bruto_calculado numeric(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE salary_lines
  ADD COLUMN IF NOT EXISTS total_liquido_calculado numeric(14, 2) NOT NULL DEFAULT 0;

-- Backfill: se total_bruto_calculado ainda está a 0 mas _final tem valor, copia
UPDATE salary_lines
SET total_bruto_calculado = total_bruto_final
WHERE total_bruto_calculado = 0 AND total_bruto_final <> 0;

UPDATE salary_lines
SET total_liquido_calculado = total_liquido_final
WHERE total_liquido_calculado = 0 AND total_liquido_final <> 0;

-- ─── RLS: salary_period_participants ───────────────────────────────────────

ALTER TABLE salary_period_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_participants'
      AND policyname = 'admin_select_salary_period_participants'
  ) THEN
    CREATE POLICY "admin_select_salary_period_participants" ON salary_period_participants
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_participants'
      AND policyname = 'staff_select_own_salary_period_participants'
  ) THEN
    CREATE POLICY "staff_select_own_salary_period_participants" ON salary_period_participants
      FOR SELECT
      USING (
        user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_participants'
      AND policyname = 'admin_insert_salary_period_participants'
  ) THEN
    CREATE POLICY "admin_insert_salary_period_participants" ON salary_period_participants
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_participants'
      AND policyname = 'admin_update_salary_period_participants'
  ) THEN
    CREATE POLICY "admin_update_salary_period_participants" ON salary_period_participants
      FOR UPDATE
      USING (get_my_role() IN ('ca', 'dg'))
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_participants'
      AND policyname = 'admin_delete_salary_period_participants'
  ) THEN
    CREATE POLICY "admin_delete_salary_period_participants" ON salary_period_participants
      FOR DELETE
      USING (get_my_role() IN ('ca', 'dg'));
  END IF;
END $$;
