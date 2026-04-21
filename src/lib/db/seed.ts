import { dbAdmin } from "./index";
import { servicesCatalog, clients } from "./schema";

// ─── Catálogo de serviços (preçário completo ABIPTOM) ─────────────────────────

const SERVICES = [
  // Vídeo e Produção Audiovisual
  { categoria: "Vídeo e Produção Audiovisual", nome: "Vídeo Institucional (2-3 min)", unidade: "vídeo", periodicidade: "unica" as const, prazoEntrega: "5-7 dias úteis", precoXof: "750000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Reels / Short-form (30-60s)", unidade: "vídeo", periodicidade: "unica" as const, prazoEntrega: "2-3 dias úteis", precoXof: "175000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Cobertura de Evento (meio-dia)", unidade: "evento", periodicidade: "unica" as const, prazoEntrega: "3-5 dias úteis", precoXof: "300000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Cobertura de Evento (dia inteiro)", unidade: "evento", periodicidade: "unica" as const, prazoEntrega: "3-5 dias úteis", precoXof: "500000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Drone — Captação Aérea (meia-hora)", unidade: "sessão", periodicidade: "unica" as const, prazoEntrega: "1-2 dias úteis", precoXof: "150000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Fotografia Corporativa (1 dia)", unidade: "dia", periodicidade: "unica" as const, prazoEntrega: "2-3 dias úteis", precoXof: "200000" },
  { categoria: "Vídeo e Produção Audiovisual", nome: "Edição de Vídeo (por minuto editado)", unidade: "minuto", periodicidade: "unica" as const, precoXof: "25000" },

  // Gestão de Redes Sociais e Marketing Digital
  { categoria: "Gestão de Redes Sociais", nome: "Pack Básico (8 posts/mês)", unidade: "mês", periodicidade: "mensal" as const, precoXof: "125000" },
  { categoria: "Gestão de Redes Sociais", nome: "Pack Padrão (16 posts/mês)", unidade: "mês", periodicidade: "mensal" as const, precoXof: "200000" },
  { categoria: "Gestão de Redes Sociais", nome: "Pack Premium (30 posts/mês)", unidade: "mês", periodicidade: "mensal" as const, precoXof: "350000" },
  { categoria: "Gestão de Redes Sociais", nome: "Gestão de Publicidade (Meta Ads)", unidade: "mês", periodicidade: "mensal" as const, precoXof: "150000" },
  { categoria: "Gestão de Redes Sociais", nome: "Criação de Identidade Visual para Redes", unidade: "pacote", periodicidade: "unica" as const, prazoEntrega: "5-7 dias úteis", precoXof: "250000" },

  // Web Design e Desenvolvimento
  { categoria: "Web Design e Desenvolvimento", nome: "Website Institucional (5 páginas)", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "15-20 dias úteis", precoXof: "1500000" },
  { categoria: "Web Design e Desenvolvimento", nome: "Landing Page", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "7-10 dias úteis", precoXof: "500000" },
  { categoria: "Web Design e Desenvolvimento", nome: "Loja Online (e-commerce básico)", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "20-30 dias úteis", precoXof: "2500000" },
  { categoria: "Web Design e Desenvolvimento", nome: "Manutenção Mensal de Website", unidade: "mês", periodicidade: "mensal" as const, precoXof: "75000" },
  { categoria: "Web Design e Desenvolvimento", nome: "Redesign de Website", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "10-15 dias úteis", precoXof: "1000000" },

  // Serviços Técnicos
  { categoria: "Serviços Técnicos", nome: "Configuração de Email Profissional (por conta)", unidade: "conta", periodicidade: "unica" as const, prazoEntrega: "1 dia útil", precoXof: "25000" },
  { categoria: "Serviços Técnicos", nome: "Suporte Técnico Mensal", unidade: "mês", periodicidade: "mensal" as const, precoXof: "100000" },
  { categoria: "Serviços Técnicos", nome: "Configuração de Servidor / VPS", unidade: "servidor", periodicidade: "unica" as const, prazoEntrega: "2-3 dias úteis", precoXof: "200000" },
  { categoria: "Serviços Técnicos", nome: "Auditoria de Segurança Web", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "5 dias úteis", precoXof: "350000" },

  // ERP Flexbundle
  { categoria: "ERP Flexbundle", nome: "Licença Flexbundle (anual, até 5 utilizadores)", unidade: "ano", periodicidade: "anual" as const, precoXof: "600000" },
  { categoria: "ERP Flexbundle", nome: "Licença Flexbundle (anual, até 20 utilizadores)", unidade: "ano", periodicidade: "anual" as const, precoXof: "1200000" },
  { categoria: "ERP Flexbundle", nome: "Implementação e Configuração ERP", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "10-20 dias úteis", precoXof: "500000" },
  { categoria: "ERP Flexbundle", nome: "Formação ERP (por sessão de 3h)", unidade: "sessão", periodicidade: "unica" as const, precoXof: "75000" },

  // Gráficos e Digitais
  { categoria: "Design Gráfico", nome: "Identidade Visual Completa (logótipo + marca)", unidade: "pacote", periodicidade: "unica" as const, prazoEntrega: "10-15 dias úteis", precoXof: "750000" },
  { categoria: "Design Gráfico", nome: "Design de Cartão de Visita (frente e verso)", unidade: "design", periodicidade: "unica" as const, prazoEntrega: "2-3 dias úteis", precoXof: "75000" },
  { categoria: "Design Gráfico", nome: "Design de Brochura / Flyer (A4)", unidade: "design", periodicidade: "unica" as const, prazoEntrega: "3-5 dias úteis", precoXof: "100000" },
  { categoria: "Design Gráfico", nome: "Design de Banner / Roll-up", unidade: "design", periodicidade: "unica" as const, prazoEntrega: "2-3 dias úteis", precoXof: "75000" },
  { categoria: "Design Gráfico", nome: "Infográfico", unidade: "design", periodicidade: "unica" as const, prazoEntrega: "3-5 dias úteis", precoXof: "125000" },

  // Desenvolvimento de Software Personalizado
  { categoria: "Desenvolvimento de Software", nome: "Aplicação Web Personalizada (cotação por projecto)", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "A definir", precoXof: "5000000" },
  { categoria: "Desenvolvimento de Software", nome: "Integração de API / Automação", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "5-15 dias úteis", precoXof: "750000" },
  { categoria: "Desenvolvimento de Software", nome: "Dashboard / Relatório Personalizado", unidade: "projecto", periodicidade: "unica" as const, prazoEntrega: "10-20 dias úteis", precoXof: "1000000" },

  // Alojamento Web e Domínio
  { categoria: "Alojamento e Domínio", nome: "Alojamento Web Básico (anual)", unidade: "ano", periodicidade: "anual" as const, precoXof: "100000" },
  { categoria: "Alojamento e Domínio", nome: "Alojamento Web Pro (anual)", unidade: "ano", periodicidade: "anual" as const, precoXof: "250000" },
  { categoria: "Alojamento e Domínio", nome: "Registo de Domínio .gw (2 anos)", unidade: "domínio", periodicidade: "bienal" as const, precoXof: "50000" },
  { categoria: "Alojamento e Domínio", nome: "Registo de Domínio .com / .net (anual)", unidade: "domínio", periodicidade: "anual" as const, precoXof: "30000" },
  { categoria: "Alojamento e Domínio", nome: "Email Profissional G Workspace (por utilizador/ano)", unidade: "utilizador/ano", periodicidade: "anual" as const, precoXof: "75000" },
];

// ─── Clientes históricos ──────────────────────────────────────────────────────

const CLIENTS = [
  {
    nome: "INDUTEC",
    nif: "510000001",
    endereco: "Bissau, Guiné-Bissau",
    pais: "Guiné-Bissau",
    email: "geral@indutec.gw",
    notas: "Cliente recorrente — Gestão de redes sociais e website",
  },
  {
    nome: "AP Trading",
    nif: "510000002",
    endereco: "Bissau, Guiné-Bissau",
    pais: "Guiné-Bissau",
    email: "info@aptrading.gw",
    notas: "Vídeo e produção audiovisual",
  },
  {
    nome: "Água Balur",
    nif: "510000003",
    endereco: "Bissau, Guiné-Bissau",
    pais: "Guiné-Bissau",
    email: "contacto@aguabalur.gw",
    notas: "Gestão de redes sociais",
  },
  {
    nome: "Farmácia Aziza",
    nif: "510000004",
    endereco: "Bairro de Ajuda, Bissau, Guiné-Bissau",
    pais: "Guiné-Bissau",
    email: "farmaciaaziza@gmail.com",
    notas: "Website e marketing digital",
  },
  {
    nome: "Agência Satyam",
    nif: "510000005",
    endereco: "Bissau, Guiné-Bissau",
    pais: "Guiné-Bissau",
    email: "satyam@agenciasatyam.gw",
    notas: "Desenvolvimento de software personalizado",
  },
];

export async function seed() {
  console.log("A correr seed…");

  // Serviços
  const existing = await dbAdmin.select().from(servicesCatalog);
  if (existing.length === 0) {
    await dbAdmin.insert(servicesCatalog).values(SERVICES);
    console.log(`  ✓ ${SERVICES.length} serviços inseridos`);
  } else {
    console.log(`  → Serviços já existem (${existing.length}), a ignorar`);
  }

  // Clientes
  const existingClients = await dbAdmin.select().from(clients);
  if (existingClients.length === 0) {
    await dbAdmin.insert(clients).values(CLIENTS);
    console.log(`  ✓ ${CLIENTS.length} clientes inseridos`);
  } else {
    console.log(`  → Clientes já existem (${existingClients.length}), a ignorar`);
  }

  console.log("Seed concluído.");
}
