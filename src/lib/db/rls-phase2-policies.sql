-- ═══════════════════════════════════════════════════════════════
-- RLS Fase 2 — Policies (cola bloco a bloco no SQL Editor Supabase)
-- Apaga policies antigas antes de criar novas, para evitar conflitos.
-- ═══════════════════════════════════════════════════════════════

-- ─── BLOCO 2: clients ──────────────────────────────────────────
DROP POLICY IF EXISTS "admin_coord_select_clients" ON clients;
DROP POLICY IF EXISTS "admin_insert_clients" ON clients;
DROP POLICY IF EXISTS "admin_update_clients" ON clients;

CREATE POLICY "admin_coord_select_clients" ON clients
  FOR SELECT USING (get_my_role() IN ('ca', 'dg', 'coord'));
CREATE POLICY "admin_insert_clients" ON clients
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_update_clients" ON clients
  FOR UPDATE USING (get_my_role() IN ('ca', 'dg'));

-- ─── BLOCO 3: contacts ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin_coord_select_contacts" ON contacts;
DROP POLICY IF EXISTS "admin_insert_contacts" ON contacts;
DROP POLICY IF EXISTS "admin_update_contacts" ON contacts;
DROP POLICY IF EXISTS "admin_delete_contacts" ON contacts;

CREATE POLICY "admin_coord_select_contacts" ON contacts
  FOR SELECT USING (get_my_role() IN ('ca', 'dg', 'coord'));
CREATE POLICY "admin_insert_contacts" ON contacts
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_update_contacts" ON contacts
  FOR UPDATE USING (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_delete_contacts" ON contacts
  FOR DELETE USING (get_my_role() IN ('ca', 'dg'));

-- ─── BLOCO 4: services_catalog ─────────────────────────────────
DROP POLICY IF EXISTS "all_select_active_services" ON services_catalog;
DROP POLICY IF EXISTS "admin_insert_services" ON services_catalog;
DROP POLICY IF EXISTS "admin_update_services" ON services_catalog;

CREATE POLICY "all_select_active_services" ON services_catalog
  FOR SELECT USING (activo = true OR get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_insert_services" ON services_catalog
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_update_services" ON services_catalog
  FOR UPDATE USING (get_my_role() IN ('ca', 'dg'));

-- ─── BLOCO 5: invoices ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_invoices" ON invoices;
DROP POLICY IF EXISTS "coord_select_invoices" ON invoices;
DROP POLICY IF EXISTS "admin_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "admin_update_invoices" ON invoices;

CREATE POLICY "admin_select_invoices" ON invoices
  FOR SELECT USING (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "coord_select_invoices" ON invoices
  FOR SELECT USING (get_my_role() = 'coord' AND estado != 'rascunho');
CREATE POLICY "admin_insert_invoices" ON invoices
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_update_invoices" ON invoices
  FOR UPDATE USING (get_my_role() IN ('ca', 'dg'));

-- ─── BLOCO 6: invoice_items ────────────────────────────────────
DROP POLICY IF EXISTS "admin_coord_select_items" ON invoice_items;
DROP POLICY IF EXISTS "admin_insert_items" ON invoice_items;
DROP POLICY IF EXISTS "admin_update_items" ON invoice_items;
DROP POLICY IF EXISTS "admin_delete_items" ON invoice_items;

CREATE POLICY "admin_coord_select_items" ON invoice_items
  FOR SELECT USING (get_my_role() IN ('ca', 'dg', 'coord'));
CREATE POLICY "admin_insert_items" ON invoice_items
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_update_items" ON invoice_items
  FOR UPDATE USING (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_delete_items" ON invoice_items
  FOR DELETE USING (get_my_role() IN ('ca', 'dg'));

-- ─── BLOCO 7: invoice_payments ─────────────────────────────────
DROP POLICY IF EXISTS "admin_select_payments" ON invoice_payments;
DROP POLICY IF EXISTS "admin_insert_payments" ON invoice_payments;

CREATE POLICY "admin_select_payments" ON invoice_payments
  FOR SELECT USING (get_my_role() IN ('ca', 'dg'));
CREATE POLICY "admin_insert_payments" ON invoice_payments
  FOR INSERT WITH CHECK (get_my_role() IN ('ca', 'dg'));
