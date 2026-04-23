-- Migração: liga despesas a projectos para desconto prévio na folha actual_2024
-- Introduz expenses.project_id com índice para suportar despesas directas de projecto.

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_data_project
  ON expenses(data, project_id);
