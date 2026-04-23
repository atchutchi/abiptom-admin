# ABIPTOM Admin

Última actualização: 23 de Abril de 2026.

`abiptom-admin` é o backoffice interno da ABIPTOM SARL para gestão administrativa, financeira e operacional. Centraliza clientes, projectos, facturação, despesas, folha salarial, dividendos, stock, tarefas, relatórios e área pessoal dos colaboradores.

Ambiente público: [https://abiptom-admin.vercel.app](https://abiptom-admin.vercel.app)

## Visão Geral

A plataforma foi desenhada para fechar o ciclo mensal da ABIPTOM com menos erro manual, mais rastreabilidade e melhor controlo de acesso. O foco actual é suportar a operação real da empresa: emitir facturas, registar recebimentos, relacionar projectos e despesas, calcular folha salarial com base nas facturas pagas e produzir relatórios financeiros úteis.

**Objectivos principais**

- centralizar operação administrativa e financeira
- reduzir folhas paralelas e lançamentos manuais duplicados
- manter histórico auditável de alterações sensíveis
- proteger dados por papel, sessão e RLS
- produzir PDFs profissionais com identidade ABIPTOM
- preparar a empresa para reporting financeiro mais consistente

**Perfis suportados**

| Papel | Responsabilidade |
| --- | --- |
| `ca` | Conselho de Administração, acesso total e configuração crítica |
| `dg` | Direcção Geral, gestão operacional e financeira avançada |
| `coord` | Coordenação, operação diária de clientes, projectos, facturas, despesas, stock e tarefas |
| `staff` | Área pessoal, tarefas, projectos e recibos próprios |

## Screenshots

| Login | Painel administrativo |
| --- | --- |
| ![Página de login](./public/readme/login.png) | ![Painel administrativo](./public/readme/dashboard.png) |

| Clientes | Facturas |
| --- | --- |
| ![Módulo de clientes](./public/readme/clients.png) | ![Módulo de facturas](./public/readme/invoices.png) |

| Relatórios | Stock |
| --- | --- |
| ![Relatório mensal](./public/readme/reports.png) | ![Módulo de stock](./public/readme/stock.png) |

## Funcionalidades Implementadas

### Autenticação e segurança

- login com Supabase Auth
- recuperação de palavra-passe com `/forgot-password`, `/auth/confirm` e `/update-password`
- MFA obrigatório para `ca` e `dg`
- middleware com RBAC por rota
- sincronização entre `auth.users` e `public.users`
- reparação automática de ligação Auth quando o email existe nas duas camadas
- perfil pessoal com edição de dados básicos e avatar
- audit log para operações sensíveis

### Utilizadores e equipa

- criação de utilizadores pela aplicação, com conta Supabase Auth e registo interno
- edição de papel, cargo, salário base, desconto sobre folha e elegibilidade a subsídios dinâmicos
- desactivação de utilizadores sem apagar histórico
- eliminação definitiva apenas quando não existem registos dependentes
- bloqueio de auto-desactivação e auto-eliminação
- suporte a fotografia/avatar em perfil

### Clientes, contactos e projectos

- CRUD de clientes e contactos
- projectos com cliente, serviço, ponto focal, auxiliares, estado, valor previsto e moeda
- catálogo de serviços configurável
- dropdown de serviços ajustado para nomes longos
- percentagens por projecto para PF, auxiliares e rubrica de gestão
- relação directa entre projecto, facturas e despesas

### Facturação

- facturas em rascunho, proforma, definitiva, paga parcial, paga e anulada
- numeração automática ao emitir factura
- ligação opcional da factura ao projecto
- itens com quantidade, preço unitário, IGV e moeda
- pagamentos parciais ou totais com data, método, referência e taxa de câmbio
- edição da data de pagamento quando houve erro operacional
- PDF de factura com logotipo e cor dourada ABIPTOM `#F5B800`
- recibo de pagamento em PDF
- envio de factura por email com anexo PDF
- exportação mensal de facturas em Excel

### Despesas

- despesas por categoria, estado, data, fornecedor, moeda e taxa de câmbio
- ligação opcional a projecto para despesas directas do projecto
- ligação opcional a beneficiário para outros benefícios de colaborador
- regra de consistência: uma despesa não pode estar ligada a projecto e beneficiário ao mesmo tempo
- anulação de despesas em vez de eliminação física
- edição e anulação por `ca`, `dg` e `coord`
- edição da data de pagamento
- exclusão de despesas anuladas nos relatórios e cálculos

### Folha salarial

A política activa é `actual_2024`. A política `guia_2026` fica como esqueleto futuro e não deve ser usada ainda em produção.

Funcionalidades actuais:

- criação de período mensal
- snapshot de projectos do período em `salary_period_projects`
- importação de facturas pagas ligadas a projectos
- cálculo a partir de facturas pagas, projectos, auxiliares, despesas directas e participantes
- participantes editáveis por período
- elegibilidade mensal aos subsídios dinâmicos
- escolha livre do beneficiário da rubrica de gestão
- descontos percentuais por colaborador
- outros benefícios vindos de despesas com beneficiário
- anulação de aprovação para corrigir período confirmado
- eliminação de períodos enquanto ainda estão em `aberto` ou `calculado`
- recibos individuais em PDF com branding ABIPTOM
- valores XOF normalizados como inteiros para evitar diferenças como `19 999,99`

Regras operacionais da política `actual_2024`:

- projecto com 1 auxiliar: PF recebe 30%, auxiliares recebem 15% no total, gestão recebe 5%
- projecto com 2 ou mais auxiliares: PF recebe 25%, auxiliares recebem 20% no total, gestão recebe 5%
- sem PF ou sem auxiliares, a parcela não atribuída fica no bolo da empresa
- despesas ligadas ao projecto reduzem a base antes da distribuição salarial do projecto
- despesas com beneficiário entram como outros benefícios da pessoa
- subsídios dinâmicos usam 22% do saldo base e são divididos apenas pelos participantes elegíveis do mês

### Dividendos

- períodos de dividendos por ano e trimestre
- linhas individuais por sócio
- pagamento de dividendos com estado e data
- integração no relatório P&L

### Stock e tarefas

- itens de stock com movimentos de entrada, saída e ajuste
- tarefas com responsável, estado, prioridade e contexto operacional
- área staff para tarefas próprias

### Relatórios

- P&L mensal e trimestral
- acumulado trimestral por mês
- receitas facturadas e recebidas
- despesas por categoria
- folha salarial bruta e líquida
- dividendos pagos
- cashflow e margem
- exportação PDF com cor e identidade ABIPTOM
- cron mensal para geração automática de relatório

### Backups e operação contínua

- cron diário de backup
- protecção por `CRON_SECRET`
- upload para bucket privado Supabase Storage
- fallback SQL quando `pg_dump` não está disponível no runtime

## Fluxo Financeiro Suportado

```mermaid
flowchart TD
    A["Cliente"] --> B["Projecto"]
    B --> C["Factura"]
    C --> D["Pagamento recebido"]
    B --> E["Despesas directas do projecto"]
    D --> F["Folha salarial"]
    E --> F
    F --> G["Pagamentos PF, auxiliares e gestão"]
    F --> H["Subsídios dinâmicos"]
    F --> I["Outros benefícios"]
    F --> J["Lucro operacional"]
    J --> K["Dividendos"]
```

A folha salarial deve usar o valor bruto pago pelo cliente como base do projecto. Se a despesa directa já foi registada e ligada ao projecto, não se deve introduzir manualmente o valor líquido. O motor subtrai essas despesas automaticamente no cálculo.

## Arquitectura

```mermaid
flowchart LR
    U["Utilizadores internos"] --> N["Next.js 15 App Router"]
    N --> A["Supabase Auth"]
    N --> D["Supabase Postgres + Drizzle"]
    N --> S["Supabase Storage"]
    N --> E["Resend ou SMTP do Supabase Auth"]
    V["Vercel Cron"] --> N
    D --> R["RLS + Audit Log"]
    S --> P["Avatares, comprovativos e backups"]
```

## Stack Tecnológica

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 15, App Router, React 19, TypeScript |
| UI | Tailwind CSS, componentes locais, Lucide |
| Base de dados | Supabase Postgres |
| ORM | Drizzle ORM |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Email aplicacional | Resend |
| Email Auth | SMTP configurado no Supabase Auth, por exemplo cPanel ou Resend SMTP |
| PDF | `@react-pdf/renderer` |
| Exportação | `xlsx` |
| Testes unitários | Vitest |
| Testes E2E | Playwright |
| Deploy | Vercel |

## Estrutura do Projecto

```text
abiptom-admin/
├── public/
│   ├── brand/
│   └── readme/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── admin/
│   │   ├── api/
│   │   └── staff/
│   ├── components/
│   └── lib/
│       ├── auth/
│       ├── backup/
│       ├── cron/
│       ├── db/
│       ├── email/
│       ├── pdf/
│       ├── reports/
│       ├── salary/
│       ├── stock/
│       └── tasks/
├── tests/
├── drizzle.config.ts
├── playwright.config.ts
├── vercel.json
└── README.md
```

## Configuração Local

### Pré-requisitos

- Node.js 20+
- npm 10+
- projecto Supabase configurado
- bucket privado para backups, por exemplo `backups`
- SMTP configurado no Supabase Auth para recuperação de palavra-passe

### Instalação

```bash
npm install
npm run dev
```

A aplicação local fica disponível em `http://localhost:3000` ou noutra porta livre escolhida pelo Next.js.

### Variáveis de ambiente

Criar `.env.local` com as variáveis do ambiente.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL pública do projecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anónima usada pelo cliente web |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave administrativa usada apenas server-side |
| `DATABASE_URL` | Sim | Ligação Postgres de runtime. Em Vercel deve ser Supavisor transaction mode `*.pooler.supabase.com:6543` |
| `DATABASE_DIRECT_URL` | Opcional | Ligação directa para scripts, migrations e ferramentas locais |
| `NEXT_PUBLIC_SITE_URL` | Recomendado | URL canónico da app, por exemplo `https://abiptom-admin.vercel.app` |
| `RESEND_API_KEY` | Sim para email de facturas | Chave da API Resend |
| `RESEND_FROM` | Sim para email de facturas | Remetente, por exemplo `ABIPTOM SARL <info@abiptom.gw>` |
| `CRON_SECRET` | Sim em produção | Segredo para cron jobs |
| `BACKUP_SUPABASE_BUCKET` | Sim para backup remoto | Bucket privado para backups |
| `E2E_CA_EMAIL` | Opcional | Conta CA para Playwright |
| `E2E_CA_PASSWORD` | Opcional | Password da conta CA |
| `E2E_DG_EMAIL` | Opcional | Conta DG para Playwright |
| `E2E_DG_PASSWORD` | Opcional | Password da conta DG |
| `E2E_STAFF_EMAIL` | Opcional | Conta staff para Playwright |
| `E2E_STAFF_PASSWORD` | Opcional | Password da conta staff |
| `PLAYWRIGHT_BASE_URL` | Opcional | URL base alternativa para Playwright |

## Base de Dados

As migrations estão em `src/lib/db/migrations/`.

Migrations relevantes recentes:

| Migration | Objectivo |
| --- | --- |
| `0006_salary_engine_fixes.sql` | descontos na folha, participantes do período, outros benefícios, rubrica de gestão e novos campos salariais |
| `0007_add_salary_period_projects.sql` | snapshot dos projectos seleccionados no período salarial |
| `0008_add_expense_project_link.sql` | relação directa entre despesas e projectos |
| `0009_round_xof_monetary_values.sql` | normalização de valores XOF para inteiros |

Comandos úteis:

```bash
npm run db:migrate
npm run db:seed
```

Em produção, quando uma migration SQL é aplicada manualmente no Supabase SQL Editor, confirmar depois com build local e redeploy.

## Scripts Úteis

| Script | Descrição |
| --- | --- |
| `npm run dev` | arranca o ambiente local |
| `npm run build` | gera build de produção |
| `npm run start` | serve a build |
| `npm run lint` | executa ESLint |
| `npm run test` | corre Vitest |
| `npm run test:e2e` | corre Playwright |
| `npm run db:generate` | gera migrations Drizzle |
| `npm run db:migrate` | aplica migrations |
| `npm run db:push` | sincroniza schema directamente |
| `npm run db:seed` | corre seed de desenvolvimento |

## Qualidade e Validação

Antes de deploy:

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

Playwright:

```bash
npm run test:e2e
```

A suite E2E usa contas configuráveis por variáveis `E2E_*`. Deve ser executada contra ambiente controlado, porque pode criar dados de teste.

## Deploy em Vercel

Checklist mínimo:

- configurar variáveis de ambiente no Vercel
- usar `DATABASE_URL` com Supavisor transaction mode
- não usar a ligação directa `db.<project-ref>.supabase.co:5432` como runtime em Vercel
- manter `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor
- aplicar migrations no Supabase antes do redeploy
- configurar Supabase Auth Site URL e Redirect URLs
- configurar SMTP do Supabase Auth
- criar bucket privado de backups
- definir `CRON_SECRET`
- correr `npm run build` localmente antes do push quando houver alteração estrutural

## Supabase Auth

Configuração recomendada:

- `Site URL`: `https://abiptom-admin.vercel.app`
- Redirect URLs:
  - `https://abiptom-admin.vercel.app/**`
  - `https://*-abiptom-6351s-projects.vercel.app/**`
  - `http://localhost:3000/**`
  - `http://localhost:3001/**`

Template recomendado para reset de palavra-passe:

```html
<a href="https://abiptom-admin.vercel.app/auth/confirm?next=/update-password&token_hash={{ .TokenHash }}&type=recovery">
  Definir nova palavra-passe
</a>
```

## Troubleshooting

### Build falha na Vercel com `getaddrinfo ENOTFOUND db.<project-ref>.supabase.co`

**Problema**

A aplicação em produção estava a usar a connection string directa da Supabase como `DATABASE_URL`. Esse host depende de IPv6 e a Vercel é um ambiente IPv4-only neste cenário.

**Solução**

- abrir Supabase Dashboard
- ir a `Connect`
- copiar a string `Supavisor transaction mode`
- configurar essa string como `DATABASE_URL` no Vercel
- fazer redeploy

A aplicação também valida isto em runtime e devolve erro claro quando detecta ligação directa da Supabase dentro da Vercel.

### README pode subir para o repositório

**Problema**

O README estava desactualizado face ao estado real da aplicação.

**Solução**

Actualizar este ficheiro com funcionalidades, deploy, migrations, troubleshooting e estado actual do produto.

### Utilizador criado no Supabase Auth não aparece em `/admin/users`

**Problema**

Criar a conta manualmente em Supabase Auth cria apenas `auth.users`. A app também precisa de uma linha em `public.users` com role, estado, salário, elegibilidade e ligação `auth_user_id`.

**Solução**

Criar utilizadores sempre em `/admin/users/new`. A app cria a conta Auth e o registo interno de forma sincronizada.

Se a conta já foi criada manualmente:

- apagar a conta manual em Supabase Auth, se for teste
- ou usar o mecanismo de reparação por email quando a linha interna já existe
- confirmar que `public.users.auth_user_id` aponta para o ID correcto de `auth.users`

### Erro `A user with this email address has already been registered`

**Problema**

O email ainda existia em Supabase Auth, mesmo que a app não mostrasse o utilizador.

**Solução**

Eliminar a conta órfã no Auth ou reparar a ligação entre `auth.users` e `public.users`. Depois recriar ou editar pela app.

### Login aceita password mas volta ao login ou fica bloqueado

**Problema**

Conta Auth e `public.users` estavam dessincronizadas, ou os metadados `role`, `active` e `mfa_enabled` não reflectiam a linha interna.

**Solução**

- confirmar que o email existe em `public.users`
- confirmar `auth_user_id`
- usar a reparação automática da app ao abrir o utilizador
- garantir que `user_metadata.role`, `user_metadata.active` e `user_metadata.mfa_enabled` estão coerentes

### Caso Emerson: `User not found` ao editar desconto ou desactivar

**Problema**

O registo interno existia, mas a conta Supabase Auth associada estava ausente ou ligada a outro `auth_user_id`.

**Solução**

A app passou a tentar reparar a ligação por email. Se a conta Auth não existir, recriar o utilizador pelo fluxo correcto ou criar a conta Auth correspondente e voltar a abrir a ficha do utilizador.

### Reset de password enviava link para `localhost:3000`

**Problema**

O Supabase Auth usava `Site URL` ou redirect antigo de desenvolvimento.

**Solução**

Configurar `Site URL` e Redirect URLs no Supabase Auth para produção e localhost. Ver secção `Supabase Auth` deste README.

### Email real funciona, mas não aparece formulário de nova password

**Problema**

O template de recovery não apontava para `/auth/confirm` com `token_hash`, `type=recovery` e `next=/update-password`.

**Solução**

Usar o template recomendado neste README. O formulário de nova password aparece na app em `/update-password`.

### `/login?error=auth-confirm` depois de clicar no email

**Problema**

Token de recovery ou redirect inválido.

**Solução**

Confirmar template do Supabase Auth, Redirect URLs e Site URL. Regenerar o link depois da alteração, porque links antigos continuam com configuração antiga.

### SMTP do cPanel versus Resend

**Problema**

Havia dúvida se o email de recuperação devia usar Resend ou cPanel.

**Solução**

São fluxos diferentes:

- recuperação de password usa SMTP configurado dentro do Supabase Auth
- envio de facturas pela app usa `RESEND_API_KEY` e `RESEND_FROM`

Se já existe mailbox real no cPanel, pode ser usada no SMTP do Supabase Auth. Resend continua útil para emails aplicacionais com anexos.

### `ReferenceError: eq is not defined` em `/admin/salary/new`

**Problema**

Faltava importar `eq` numa página da folha salarial.

**Solução**

Adicionar o import correcto e validar a página com build local.

### Página de folha salarial colada à navegação

**Problema**

Algumas páginas tinham espaçamento inconsistente em relação ao layout principal.

**Solução**

Padronizar containers, padding e largura máxima nas páginas administrativas.

### Sidebar colapsada escondia o logotipo

**Problema**

O estado colapsado mostrava apenas texto parcial e escondia o logo.

**Solução**

Ajustar o comportamento da sidebar para manter uma marca compacta legível.

### Dropdown de serviços cortava nomes longos

**Problema**

O `SelectContent` ficava preso à largura do trigger e os itens longos ficavam ilegíveis.

**Solução**

Ajustar o componente select para usar largura mínima baseada no trigger e permitir expansão quando o conteúdo é maior.

### Facturas PDF estavam verdes em vez de ABIPTOM

**Problema**

A identidade visual dos PDFs não estava alinhada com a marca.

**Solução**

Trocar a cor principal para dourado `#F5B800` e adicionar o logotipo no cabeçalho.

### Valores XOF como `20 000` ficavam `19 999,99`

**Problema**

Alguns cálculos guardavam números decimais para valores XOF, gerando diferenças por arredondamento.

**Solução**

Criar utilitários de normalização XOF e aplicar a migration `0009_round_xof_monetary_values.sql`. XOF deve ser tratado como inteiro.

### Base do projecto na folha salarial gera dúvida

**Problema**

Havia dúvida se a base do projecto deve ser valor bruto recebido ou valor líquido depois de despesas.

**Solução**

Introduzir o valor bruto pago pelo cliente. As despesas directas devem ser registadas em Despesas e ligadas ao projecto. O motor subtrai automaticamente essas despesas.

### Despesas directas e outros benefícios estavam conceptualmente misturados

**Problema**

Nem toda despesa tem o mesmo efeito salarial.

**Solução**

- despesa ligada ao projecto: reduz a base de cálculo do projecto
- despesa ligada a beneficiário: aparece como outros benefícios do colaborador
- despesa sem projecto e sem beneficiário: despesa operacional geral

### Período salarial confirmado precisava de correcção

**Problema**

Foi possível aprovar uma folha antes de corrigir percentagens ou dados.

**Solução**

Adicionar acção de anular aprovação, regressando o período para estado editável de revisão. As linhas ficam não pagas para revisão manual quando se recalcula.

### Relatório trimestral não acumulava como esperado

**Problema**

A leitura trimestral estava pouco clara e os filtros não reflectiam bem o período acumulado.

**Solução**

Adicionar P&L trimestral com breakdown mensal, totais acumulados e PDF com branding ABIPTOM.

### `/admin/profile` devolvia 404

**Problema**

O rodapé/sidebar apontava para perfil, mas a rota não existia ou não estava ligada correctamente.

**Solução**

Adicionar rota de perfil para administração e staff, com edição de dados e avatar.

## Auditoria Técnica de 23 de Abril de 2026

### Correcção aplicada nesta auditoria

- `listUsers()` agora valida sessão e papel `ca` ou `dg` dentro da própria server action. Antes dependia principalmente da protecção da página e do middleware. A defesa passou a existir também na fronteira da função.

### Pontos revistos

- rotas de PDF de facturas exigem sessão e papel autorizado
- exportação mensal de facturas exige `ca` ou `dg`
- rota de seed bloqueia produção e exige `ca` ou `dg` em desenvolvimento
- cron jobs exigem `CRON_SECRET` em produção
- API de utilizadores devolve apenas campos essenciais e exige `ca` ou `dg`
- páginas staff usam `withAuthenticatedDb` para respeitar claims e RLS

### Riscos residuais e próximos hardenings

- ainda existem server actions com `dbAdmin` directo e RBAC aplicacional. Isto é aceitável no estado actual, mas os fluxos financeiros críticos devem continuar a migrar para helpers explícitos de autorização por função.
- `listServices(includeInactive)` não valida sessão. O catálogo não é crítico, mas se serviços inactivos forem considerados sensíveis deve receber RBAC.
- a acção server-side legacy `verifyMfaCode` tem `factorId` vazio e deve ser removida ou corrigida se voltar a ser usada. O fluxo activo de MFA usa componentes cliente.
- a suite E2E ainda não cobre todos os fluxos novos da folha salarial, especialmente anulação de aprovação, descontos percentuais, relação factura-projecto-despesa e recalculo de períodos antigos.
- backups devem ser testados com restore real, não apenas geração de ficheiro.
- qualquer nova API que use `dbAdmin` deve ter teste de acesso negativo por `staff` e `coord` quando aplicável.

## Estado Actual

O produto já cobre o núcleo operacional da ABIPTOM:

- autenticação e perfis
- clientes e contactos
- projectos e serviços
- facturação e pagamentos
- despesas relacionais
- folha salarial `actual_2024`
- recibos e PDFs com marca ABIPTOM
- relatórios P&L mensal e trimestral
- dividendos, stock e tarefas
- portal staff
- cron jobs e backups

## Licença

Produto interno e privado da ABIPTOM SARL.
