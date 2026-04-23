-- Migração: normalizar valores monetários XOF para inteiros.
-- Aplicar no SQL Editor do Supabase Abiptom.
-- Idempotente: pode ser re-executada.
--
-- Objectivo:
--   * Corrigir valores já gravados com ruído decimal, ex.: 19 999,99.
--   * Manter moedas estrangeiras com casas decimais.
--   * Arredondar sempre os equivalentes em XOF.

-- ─── Facturação ────────────────────────────────────────────────────────────

UPDATE invoices
SET
  subtotal = round(subtotal),
  igv_valor = round(igv_valor),
  total = round(total)
WHERE moeda = 'XOF';

UPDATE invoice_items item
SET
  preco_unitario = round(item.preco_unitario),
  total = round(item.total)
FROM invoices invoice
WHERE item.invoice_id = invoice.id
  AND invoice.moeda = 'XOF';

UPDATE invoice_payments
SET valor = round(valor)
WHERE moeda = 'XOF';

-- ─── Projectos e catálogo ─────────────────────────────────────────────────

UPDATE projects
SET valor_previsto = round(valor_previsto)
WHERE moeda = 'XOF'
  AND valor_previsto IS NOT NULL;

UPDATE services_catalog
SET preco_xof = round(preco_xof)
WHERE preco_xof IS NOT NULL;

-- ─── Despesas ─────────────────────────────────────────────────────────────

UPDATE expenses
SET
  valor = round(valor),
  valor_xof = round(valor_xof)
WHERE moeda = 'XOF';

UPDATE expenses
SET valor_xof = round(valor_xof)
WHERE moeda <> 'XOF';

-- ─── Folha salarial ───────────────────────────────────────────────────────

UPDATE users
SET salario_base_mensal = round(salario_base_mensal)
WHERE salario_base_mensal IS NOT NULL;

UPDATE salary_periods
SET
  total_bruto = round(coalesce(total_bruto, 0)),
  total_liquido = round(coalesce(total_liquido, 0)),
  total_folha = round(coalesce(total_folha, 0));

UPDATE salary_period_projects
SET valor_liquido = round(valor_liquido);

UPDATE salary_period_participants
SET salario_base_override = round(salario_base_override)
WHERE salario_base_override IS NOT NULL;

UPDATE salary_lines
SET
  salario_base = round(salario_base),
  outros_beneficios = round(coalesce(outros_beneficios, 0)),
  descontos = round(coalesce(descontos, 0)),
  total_bruto_calculado = round(total_bruto_calculado),
  total_bruto_final = round(total_bruto_final),
  total_liquido_calculado = round(total_liquido_calculado),
  total_liquido_final = round(total_liquido_final);

UPDATE project_payments
SET
  valor_liquido_projecto = round(valor_liquido_projecto),
  valor_recebido = round(valor_recebido);

-- ─── Dividendos ───────────────────────────────────────────────────────────

UPDATE dividend_periods
SET
  base_calculada = round(base_calculada),
  total_distribuido = round(total_distribuido);

UPDATE dividend_lines
SET valor_bruto = round(valor_bruto);

-- ─── Stock ────────────────────────────────────────────────────────────────

UPDATE stock_items
SET custo_unitario = round(custo_unitario)
WHERE custo_unitario IS NOT NULL;

UPDATE stock_movements
SET custo_unitario = round(custo_unitario)
WHERE custo_unitario IS NOT NULL;
