-- RLS Policies — Fase 1
-- Executar no SQL Editor do Supabase após as migrations Drizzle

-- ─── Habilitar RLS ─────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ─── Função auxiliar: obter papel do utilizador autenticado ────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid()
$$;

-- ─── users ─────────────────────────────────────────────────────────────────

-- ca e dg vêem todos
CREATE POLICY "admin_select_users" ON users
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- coord vê todos (mas não salários — filtrado na aplicação)
CREATE POLICY "coord_select_users" ON users
  FOR SELECT
  USING (get_my_role() = 'coord');

-- staff vê apenas o seu próprio registo
CREATE POLICY "staff_select_own_user" ON users
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- só ca e dg podem inserir
CREATE POLICY "admin_insert_users" ON users
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

-- só ca e dg podem actualizar
CREATE POLICY "admin_update_users" ON users
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- nunca apagar — apenas desactivar
-- (não há política DELETE, o que bloqueia todas as eliminações)

-- ─── partner_shares ─────────────────────────────────────────────────────────

-- só ca vê e gere quotas de sócios
CREATE POLICY "ca_select_partner_shares" ON partner_shares
  FOR SELECT
  USING (get_my_role() = 'ca');

CREATE POLICY "ca_insert_partner_shares" ON partner_shares
  FOR INSERT
  WITH CHECK (get_my_role() = 'ca');

CREATE POLICY "ca_update_partner_shares" ON partner_shares
  FOR UPDATE
  USING (get_my_role() = 'ca');

-- ─── audit_log ───────────────────────────────────────────────────────────────

-- ca e dg podem ler o log
CREATE POLICY "admin_select_audit_log" ON audit_log
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- inserção feita via service_role em server actions — sem política INSERT para anon/authenticated
-- (as server actions usam service_role key para escrever no audit_log)
