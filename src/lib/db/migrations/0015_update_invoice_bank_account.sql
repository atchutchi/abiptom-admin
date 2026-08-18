ALTER TABLE invoices
  ALTER COLUMN conta_bancaria
  SET DEFAULT E'ECOBANK Conta nº 180936560001\nGW143 01001 180936560001';

UPDATE invoices
SET
  conta_bancaria = E'ECOBANK Conta nº 180936560001\nGW143 01001 180936560001',
  updated_at = now()
WHERE
  conta_bancaria ILIKE '%Banque Atlantique%'
  OR conta_bancaria LIKE '%020080330007%';
