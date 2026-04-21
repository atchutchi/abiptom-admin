-- Actualiza configuração da Política Actual (actual_2024) para suportar
-- 2 auxiliares (PF 25%, Aux 10% cada) vs 1 auxiliar (PF 30%, Aux 15%).
-- Cola no SQL Editor do Supabase (abiptom-admin).

UPDATE salary_policies
SET configuracao_json = '{
  "tipo": "actual_2024",
  "percentagens": {
    "pf_0aux": 0.30,
    "pf_1aux": 0.30,
    "pf_2aux": 0.25,
    "aux_1aux": 0.15,
    "aux_2aux": 0.10,
    "dg": 0.05,
    "resto": 0.50
  },
  "subsidio": {
    "percentagem": 0.22,
    "numPessoas": 8
  }
}'::jsonb,
descricao = 'Política de remuneração em vigor desde 2024. 1 aux: PF 30%, Aux 15%. 2 aux: PF 25%, Aux 10% cada. DG 5%, Resto ABIPTOM 50%. Subsídio dinâmico 22% do saldo dividido por 8 pessoas.'
WHERE versao = '2024' AND nome = 'Política Actual';

-- Verificação
SELECT nome, versao, configuracao_json -> 'percentagens' AS pcts FROM salary_policies;
