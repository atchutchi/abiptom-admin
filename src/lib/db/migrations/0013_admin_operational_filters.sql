ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'impressao';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'fundo_maneio';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'comunicacao';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;

UPDATE projects
SET arquivado_em = COALESCE(arquivado_em, updated_at, created_at, now())
WHERE estado = 'concluido'
  AND arquivado_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_arquivado_em ON projects(arquivado_em);
