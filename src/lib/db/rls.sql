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

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies — Fase 2 (Facturação e Clientes)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- ─── clients ─────────────────────────────────────────────────────────────────

-- ca, dg, coord vêem todos os clientes activos e inactivos
CREATE POLICY "admin_coord_select_clients" ON clients
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

-- staff só vê clientes dos seus projectos (fase 3 — por ora bloqueia)
-- (sem política SELECT para staff → bloqueado a nível DB)

CREATE POLICY "admin_insert_clients" ON clients
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_clients" ON clients
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── contacts ────────────────────────────────────────────────────────────────

CREATE POLICY "admin_coord_select_contacts" ON contacts
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

CREATE POLICY "admin_insert_contacts" ON contacts
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_contacts" ON contacts
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_delete_contacts" ON contacts
  FOR DELETE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── services_catalog ────────────────────────────────────────────────────────

-- todos os utilizadores autenticados vêem o catálogo activo
CREATE POLICY "all_select_active_services" ON services_catalog
  FOR SELECT
  USING (activo = true OR get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_insert_services" ON services_catalog
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_services" ON services_catalog
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── invoices ────────────────────────────────────────────────────────────────

-- ca e dg vêem todas as facturas
CREATE POLICY "admin_select_invoices" ON invoices
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

-- coord vê proformas e definitivas (não rascunhos)
CREATE POLICY "coord_select_invoices" ON invoices
  FOR SELECT
  USING (get_my_role() = 'coord' AND estado != 'rascunho');

CREATE POLICY "admin_insert_invoices" ON invoices
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_invoices" ON invoices
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── invoice_items ────────────────────────────────────────────────────────────

CREATE POLICY "admin_coord_select_items" ON invoice_items
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg', 'coord'));

CREATE POLICY "admin_insert_items" ON invoice_items
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_update_items" ON invoice_items
  FOR UPDATE
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_delete_items" ON invoice_items
  FOR DELETE
  USING (get_my_role() IN ('ca', 'dg'));

-- ─── invoice_payments ─────────────────────────────────────────────────────────

CREATE POLICY "admin_select_payments" ON invoice_payments
  FOR SELECT
  USING (get_my_role() IN ('ca', 'dg'));

CREATE POLICY "admin_insert_payments" ON invoice_payments
  FOR INSERT
  WITH CHECK (get_my_role() IN ('ca', 'dg'));

-- Re-enable RLS on tabelas existentes (foram desactivadas no last push)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
