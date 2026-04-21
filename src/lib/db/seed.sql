-- ═══════════════════════════════════════════════════════════════
-- SEED — Serviços (preçário ABIPTOM) + Clientes históricos
-- Cola no SQL Editor do Supabase. Usa ON CONFLICT DO NOTHING
-- para ser idempotente (podes correr várias vezes sem duplicar).
-- ═══════════════════════════════════════════════════════════════

-- ─── Serviços (36 itens) ───────────────────────────────────────

INSERT INTO services_catalog (categoria, nome, unidade, periodicidade, prazo_entrega, preco_xof, activo) VALUES
-- Vídeo e Produção Audiovisual
('Vídeo e Produção Audiovisual', 'Vídeo Institucional (2-3 min)', 'vídeo', 'unica', '5-7 dias úteis', 750000, true),
('Vídeo e Produção Audiovisual', 'Reels / Short-form (30-60s)', 'vídeo', 'unica', '2-3 dias úteis', 175000, true),
('Vídeo e Produção Audiovisual', 'Cobertura de Evento (meio-dia)', 'evento', 'unica', '3-5 dias úteis', 300000, true),
('Vídeo e Produção Audiovisual', 'Cobertura de Evento (dia inteiro)', 'evento', 'unica', '3-5 dias úteis', 500000, true),
('Vídeo e Produção Audiovisual', 'Drone — Captação Aérea (meia-hora)', 'sessão', 'unica', '1-2 dias úteis', 150000, true),
('Vídeo e Produção Audiovisual', 'Fotografia Corporativa (1 dia)', 'dia', 'unica', '2-3 dias úteis', 200000, true),
('Vídeo e Produção Audiovisual', 'Edição de Vídeo (por minuto editado)', 'minuto', 'unica', NULL, 25000, true),

-- Gestão de Redes Sociais
('Gestão de Redes Sociais', 'Pack Básico (8 posts/mês)', 'mês', 'mensal', NULL, 125000, true),
('Gestão de Redes Sociais', 'Pack Padrão (16 posts/mês)', 'mês', 'mensal', NULL, 200000, true),
('Gestão de Redes Sociais', 'Pack Premium (30 posts/mês)', 'mês', 'mensal', NULL, 350000, true),
('Gestão de Redes Sociais', 'Gestão de Publicidade (Meta Ads)', 'mês', 'mensal', NULL, 150000, true),
('Gestão de Redes Sociais', 'Criação de Identidade Visual para Redes', 'pacote', 'unica', '5-7 dias úteis', 250000, true),

-- Web Design e Desenvolvimento
('Web Design e Desenvolvimento', 'Website Institucional (5 páginas)', 'projecto', 'unica', '15-20 dias úteis', 1500000, true),
('Web Design e Desenvolvimento', 'Landing Page', 'projecto', 'unica', '7-10 dias úteis', 500000, true),
('Web Design e Desenvolvimento', 'Loja Online (e-commerce básico)', 'projecto', 'unica', '20-30 dias úteis', 2500000, true),
('Web Design e Desenvolvimento', 'Manutenção Mensal de Website', 'mês', 'mensal', NULL, 75000, true),
('Web Design e Desenvolvimento', 'Redesign de Website', 'projecto', 'unica', '10-15 dias úteis', 1000000, true),

-- Serviços Técnicos
('Serviços Técnicos', 'Configuração de Email Profissional (por conta)', 'conta', 'unica', '1 dia útil', 25000, true),
('Serviços Técnicos', 'Suporte Técnico Mensal', 'mês', 'mensal', NULL, 100000, true),
('Serviços Técnicos', 'Configuração de Servidor / VPS', 'servidor', 'unica', '2-3 dias úteis', 200000, true),
('Serviços Técnicos', 'Auditoria de Segurança Web', 'projecto', 'unica', '5 dias úteis', 350000, true),

-- ERP Flexbundle
('ERP Flexbundle', 'Licença Flexbundle (anual, até 5 utilizadores)', 'ano', 'anual', NULL, 600000, true),
('ERP Flexbundle', 'Licença Flexbundle (anual, até 20 utilizadores)', 'ano', 'anual', NULL, 1200000, true),
('ERP Flexbundle', 'Implementação e Configuração ERP', 'projecto', 'unica', '10-20 dias úteis', 500000, true),
('ERP Flexbundle', 'Formação ERP (por sessão de 3h)', 'sessão', 'unica', NULL, 75000, true),

-- Design Gráfico
('Design Gráfico', 'Identidade Visual Completa (logótipo + marca)', 'pacote', 'unica', '10-15 dias úteis', 750000, true),
('Design Gráfico', 'Design de Cartão de Visita (frente e verso)', 'design', 'unica', '2-3 dias úteis', 75000, true),
('Design Gráfico', 'Design de Brochura / Flyer (A4)', 'design', 'unica', '3-5 dias úteis', 100000, true),
('Design Gráfico', 'Design de Banner / Roll-up', 'design', 'unica', '2-3 dias úteis', 75000, true),
('Design Gráfico', 'Infográfico', 'design', 'unica', '3-5 dias úteis', 125000, true),

-- Desenvolvimento de Software
('Desenvolvimento de Software', 'Aplicação Web Personalizada (cotação por projecto)', 'projecto', 'unica', 'A definir', 5000000, true),
('Desenvolvimento de Software', 'Integração de API / Automação', 'projecto', 'unica', '5-15 dias úteis', 750000, true),
('Desenvolvimento de Software', 'Dashboard / Relatório Personalizado', 'projecto', 'unica', '10-20 dias úteis', 1000000, true),

-- Alojamento e Domínio
('Alojamento e Domínio', 'Alojamento Web Básico (anual)', 'ano', 'anual', NULL, 100000, true),
('Alojamento e Domínio', 'Alojamento Web Pro (anual)', 'ano', 'anual', NULL, 250000, true),
('Alojamento e Domínio', 'Registo de Domínio .gw (2 anos)', 'domínio', 'bienal', NULL, 50000, true),
('Alojamento e Domínio', 'Registo de Domínio .com / .net (anual)', 'domínio', 'anual', NULL, 30000, true),
('Alojamento e Domínio', 'Email Profissional G Workspace (por utilizador/ano)', 'utilizador/ano', 'anual', NULL, 75000, true);

-- ─── Clientes históricos (5) ───────────────────────────────────

INSERT INTO clients (nome, nif, endereco, pais, email, notas, activo) VALUES
('INDUTEC', '510000001', 'Bissau, Guiné-Bissau', 'Guiné-Bissau', 'geral@indutec.gw', 'Cliente recorrente — Gestão de redes sociais e website', true),
('AP Trading', '510000002', 'Bissau, Guiné-Bissau', 'Guiné-Bissau', 'info@aptrading.gw', 'Vídeo e produção audiovisual', true),
('Água Balur', '510000003', 'Bissau, Guiné-Bissau', 'Guiné-Bissau', 'contacto@aguabalur.gw', 'Gestão de redes sociais', true),
('Farmácia Aziza', '510000004', 'Bairro de Ajuda, Bissau, Guiné-Bissau', 'Guiné-Bissau', 'farmaciaaziza@gmail.com', 'Website e marketing digital', true),
('Agência Satyam', '510000005', 'Bissau, Guiné-Bissau', 'Guiné-Bissau', 'satyam@agenciasatyam.gw', 'Desenvolvimento de software personalizado', true);

-- ─── Verificação ───────────────────────────────────────────────
SELECT 'services_catalog' AS tabela, COUNT(*) AS total FROM services_catalog
UNION ALL
SELECT 'clients', COUNT(*) FROM clients;
