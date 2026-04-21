-- ═══════════════════════════════════════════════════════════════
-- RLS Fase 2 — Executa em blocos pequenos no SQL Editor
-- Cola um bloco de cada vez. Se já existirem policies, apaga primeiro.
-- ═══════════════════════════════════════════════════════════════

-- ─── BLOCO 1: Activar RLS nas novas tabelas ────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
