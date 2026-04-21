-- RLS Policies — Fase 3
-- Executar no SQL Editor do Supabase após aplicar migration-phase3.sql

-- ─── Habilitar RLS ────────────────────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ─── projects ────────────────────────────────────────────────────────────────

-- ca, dg, coord: vêem todos os projectos
CREATE POLICY "admin_select_projects" ON projects
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

-- staff: vê projectos onde é PF ou auxiliar
CREATE POLICY "staff_select_own_projects" ON projects
  FOR SELECT
  USING (
    get_my_role() = 'staff'
    AND (
      ponto_focal_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
      OR id IN (
        SELECT project_id FROM project_assistants pa
        JOIN users u ON u.id = pa.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

-- ca, dg, coord: podem criar projectos
CREATE POLICY "admin_insert_projects" ON projects
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));

-- ca, dg, coord: podem actualizar projectos
CREATE POLICY "admin_update_projects" ON projects
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

-- ─── project_assistants ───────────────────────────────────────────────────────

-- ca, dg, coord: vêem todos
CREATE POLICY "admin_select_project_assistants" ON project_assistants
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

-- staff: vê apenas as suas próprias entradas
CREATE POLICY "staff_select_own_project_assistants" ON project_assistants
  FOR SELECT
  USING (
    get_my_role() = 'staff'
    AND user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ca, dg, coord: podem gerir assistentes
CREATE POLICY "admin_insert_project_assistants" ON project_assistants
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));

CREATE POLICY "admin_delete_project_assistants" ON project_assistants
  FOR DELETE
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

-- ─── salary_policies ──────────────────────────────────────────────────────────

-- ca, dg: gestão total das políticas
CREATE POLICY "admin_select_salary_policies" ON salary_policies
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_insert_salary_policies" ON salary_policies
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_salary_policies" ON salary_policies
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── salary_periods ───────────────────────────────────────────────────────────

-- ca, dg: gestão total dos períodos
CREATE POLICY "admin_select_salary_periods" ON salary_periods
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_insert_salary_periods" ON salary_periods
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_salary_periods" ON salary_periods
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── salary_lines ─────────────────────────────────────────────────────────────

-- ca, dg: vêem todas as linhas
CREATE POLICY "admin_select_salary_lines" ON salary_lines
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- staff: vê apenas a sua própria linha
CREATE POLICY "staff_select_own_salary_line" ON salary_lines
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ca, dg: inserem e actualizam linhas
CREATE POLICY "admin_insert_salary_lines" ON salary_lines
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_salary_lines" ON salary_lines
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── project_payments ────────────────────────────────────────────────────────

-- ca, dg: vêem todos
CREATE POLICY "admin_select_project_payments" ON project_payments
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- staff: vê os seus próprios recebimentos
CREATE POLICY "staff_select_own_project_payments" ON project_payments
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- ca, dg: inserem
CREATE POLICY "admin_insert_project_payments" ON project_payments
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

-- ─── expenses ─────────────────────────────────────────────────────────────────

-- ca, dg: gestão total
CREATE POLICY "admin_select_expenses" ON expenses
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- coord: vê despesas dos seus projectos
CREATE POLICY "coord_select_expenses" ON expenses
  FOR SELECT
  USING (
    get_my_role() = 'coord'
    AND projecto_id IN (
      SELECT id FROM projects WHERE ponto_focal_id IN (
        SELECT id FROM users WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "admin_insert_expenses" ON expenses
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg', 'coord'));

CREATE POLICY "admin_update_expenses" ON expenses
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));
