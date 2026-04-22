-- Migração: snapshot de projectos por período salarial
-- Introduz salary_period_projects para suportar períodos em estado aberto
-- antes do primeiro cálculo.

CREATE TABLE IF NOT EXISTS salary_period_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES salary_periods(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  valor_liquido numeric(14, 2) NOT NULL DEFAULT 0,
  pf_percentagem_override numeric(5, 4),
  coord_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_salary_period_projects_period
  ON salary_period_projects(period_id);

CREATE INDEX IF NOT EXISTS idx_salary_period_projects_project
  ON salary_period_projects(project_id);

DROP TRIGGER IF EXISTS trg_salary_period_projects_updated_at ON salary_period_projects;
CREATE TRIGGER trg_salary_period_projects_updated_at
  BEFORE UPDATE ON salary_period_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE salary_period_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_projects'
      AND policyname = 'admin_select_salary_period_projects'
  ) THEN
    CREATE POLICY "admin_select_salary_period_projects" ON salary_period_projects
      FOR SELECT
      USING (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_projects'
      AND policyname = 'admin_insert_salary_period_projects'
  ) THEN
    CREATE POLICY "admin_insert_salary_period_projects" ON salary_period_projects
      FOR INSERT
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_projects'
      AND policyname = 'admin_update_salary_period_projects'
  ) THEN
    CREATE POLICY "admin_update_salary_period_projects" ON salary_period_projects
      FOR UPDATE
      USING (get_my_role() IN ('ca', 'dg'))
      WITH CHECK (get_my_role() IN ('ca', 'dg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_period_projects'
      AND policyname = 'admin_delete_salary_period_projects'
  ) THEN
    CREATE POLICY "admin_delete_salary_period_projects" ON salary_period_projects
      FOR DELETE
      USING (get_my_role() IN ('ca', 'dg'));
  END IF;
END $$;
