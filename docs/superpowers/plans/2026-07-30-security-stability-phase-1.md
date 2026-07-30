# Security and Stability Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir vulnerabilidades conhecidas, adicionar protecções HTTP, centralizar autorização, limitar abuso, melhorar auditoria e validar recuperação de backups sem introduzir MFA.

**Architecture:** A fase cria módulos pequenos em `src/lib/security` e `src/lib/auth` e mantém Supabase Auth como fonte de autenticação. Os limites de utilização serão persistidos em PostgreSQL para funcionarem em Vercel. As acções existentes passam a usar um contrato comum de autorização e os eventos sensíveis passam pelo registo de auditoria.

**Tech Stack:** Next.js 15.5, React 19, TypeScript, Supabase Auth, PostgreSQL, Drizzle ORM, Vitest, Playwright, Vercel.

## Global Constraints

- Não implementar MFA.
- Não implementar Facebook, Instagram, TikTok, LinkedIn ou publicação automática.
- Não implementar WhatsApp nesta fase.
- Preservar as alterações locais já existentes na folha salarial.
- Não alterar fórmulas salariais ou regras financeiras.
- Não apagar dados existentes.
- Usar migrações aditivas e reversíveis.
- Toda a nova regra deve começar por um teste que falha.
- Cada tarefa termina com verificação e commit isolado.
- Não guardar emails, endereços IP ou tokens em texto simples na tabela de limites.

---

## File Structure

### Novos ficheiros

- `src/lib/security/headers.ts`: composição dos cabeçalhos HTTP e da Content Security Policy.
- `src/lib/security/rate-limit.ts`: regras puras de limites, hashing de identificadores e tipos públicos.
- `src/lib/security/rate-limit-db.ts`: persistência PostgreSQL dos limites.
- `src/lib/security/events.ts`: registo normalizado de eventos de segurança.
- `src/lib/auth/session.ts`: leitura da sessão e associação ao utilizador interno sem dependência circular das acções de autenticação.
- `src/lib/auth/authorization.ts`: autorização central por sessão e papel.
- `src/lib/backup/restore-safety.ts`: validação pura do destino e do ficheiro de restauro.
- `src/app/admin/settings/audit/page.tsx`: consulta do histórico para `ca`.
- `src/lib/db/migrations/0014_security_hardening.sql`: tabelas e índices de segurança.
- `tests/unit/security/headers.test.ts`: contrato dos cabeçalhos.
- `tests/unit/security/rate-limit.test.ts`: transições de janela, bloqueio e recuperação.
- `tests/unit/auth/authorization.test.ts`: matriz de autorização.
- `tests/unit/security/events.test.ts`: sanitização dos eventos.
- `tests/e2e/security.spec.ts`: acesso negativo, cabeçalhos e login limitado.
- `scripts/verify-backup-restore.ts`: validação de um dump numa base isolada.
- `docs/operations/backup-restore.md`: procedimento de restauro.

### Ficheiros modificados

- `package.json`, `package-lock.json`, `pnpm-lock.yaml`: actualização corrigida de Next.js e dependências transitivas.
- `next.config.ts`: cabeçalhos, lint obrigatório e configuração de segurança.
- `.env.example`: `SECURITY_RATE_LIMIT_SECRET` e parâmetros documentados.
- `src/lib/db/schema.ts`: `security_rate_limits` e novos campos de auditoria.
- `src/lib/db/audit.ts`: escrita sanitizada e contexto do pedido.
- `src/lib/auth/actions.ts`: login e recuperação protegidos no servidor.
- `src/components/forms/LoginForm.tsx`: submissão através da acção protegida.
- `src/components/forms/ForgotPasswordForm.tsx`: submissão através da acção protegida.
- `src/app/api/invoices/export/route.ts`: limite e autorização comum.
- `src/app/api/reports/pl/route.ts`: limite e autorização comum.
- `src/app/api/reports/monthly/route.ts`: limite e autorização comum.
- `src/app/api/users/route.ts`: autorização comum.
- `src/app/api/salary/receipt/[lineId]/route.ts`: autorização comum.
- `src/app/api/invoices/pdf/[id]/route.ts`: autorização comum.
- `src/app/api/invoices/payments/[paymentId]/receipt/route.ts`: autorização comum.
- `src/lib/users/actions.ts`: autorização e auditoria.
- `src/lib/invoices/actions.ts`: autorização e auditoria.
- `src/lib/expenses/actions.ts`: autorização e auditoria.
- `src/lib/salary/actions.ts`: autorização comum sem alterar cálculos.
- `src/lib/dividends/actions.ts`: autorização e auditoria.
- `src/lib/stock/actions.ts`: autorização e auditoria.
- `src/lib/tasks/actions.ts`: autorização e auditoria.
- `src/lib/projects/actions.ts`: autorização e auditoria.
- `src/lib/services/actions.ts`: autorização e auditoria.
- `src/app/admin/settings/page.tsx`: ligação para a auditoria visível apenas a `ca`.
- `README.md`: estado real da segurança sem alegar MFA.

---

### Task 0: Isolar a correcção existente da folha salarial

**Files:**
- Modify: `src/app/admin/salary/new/page.tsx`
- Modify: `src/components/forms/SalaryNewPeriodForm.tsx`
- Modify: `src/lib/salary/actions.ts`
- Modify: `src/lib/salary/project-selection.ts`
- Modify: `tests/unit/salary/project-selection.test.ts`

**Interfaces:**
- Consumes: alterações locais já verificadas para identificar projectos de facturas pagas.
- Produces: um commit autónomo da correcção salarial antes de começar a segurança.

- [ ] **Step 1: Rever apenas o diff salarial existente**

Run:

```powershell
git diff -- src/app/admin/salary/new/page.tsx src/components/forms/SalaryNewPeriodForm.tsx src/lib/salary/actions.ts src/lib/salary/project-selection.ts tests/unit/salary/project-selection.test.ts
```

Expected: o diff limita-se à identificação dos projectos ausentes, aos avisos legíveis e aos testes dessa correcção.

- [ ] **Step 2: Repetir a verificação já definida para a correcção**

Run:

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
git diff --check
```

Expected: testes, lint, TypeScript e verificação do diff passam.

- [ ] **Step 3: Criar um commit isolado**

```powershell
git add src/app/admin/salary/new/page.tsx src/components/forms/SalaryNewPeriodForm.tsx src/lib/salary/actions.ts src/lib/salary/project-selection.ts tests/unit/salary/project-selection.test.ts
git commit -m "fix: identifica projectos ausentes na importacao salarial"
```

### Task 1: Patch de dependências e gates do build

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `pnpm-lock.yaml`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: versão actual `next@15.5.19`.
- Produces: Next.js e `eslint-config-next` na mesma versão corrigida da linha 15.5 e build que não ignora lint.

- [ ] **Step 1: Registar o estado vulnerável**

Run:

```powershell
$env:PATH='C:\Users\binta\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:PATH
npm.cmd audit --omit=dev --json
```

Expected: saída com vulnerabilidade elevada para `next@15.5.19` e correcção disponível sem mudança de versão principal.

- [ ] **Step 2: Actualizar as dependências declaradas**

Alterar `package.json` para:

```json
"next": "15.5.22",
"eslint-config-next": "15.5.22"
```

Actualizar também o override transitivo de PostCSS apenas se a resolução de `15.5.22` não instalar uma versão corrigida.

- [ ] **Step 3: Regenerar os dois locks sem remover dependências do projecto**

Run:

```powershell
$env:CI='true'
npm.cmd install --package-lock-only
pnpm.cmd install --lockfile-only
```

Expected: `package-lock.json` e `pnpm-lock.yaml` resolvem Next.js 15.5.22 e versões transitivas corrigidas.

- [ ] **Step 4: Activar lint no build**

Remover de `next.config.ts`:

```ts
eslint: { ignoreDuringBuilds: true },
```

- [ ] **Step 5: Verificar dependências e build**

Run:

```powershell
npm.cmd audit --omit=dev
npm.cmd run lint
npm.cmd run build
```

Expected: zero vulnerabilidades elevadas de produção, lint sem erros e build concluído.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json pnpm-lock.yaml next.config.ts
git commit -m "fix: actualiza dependencias criticas e gates do build"
```

### Task 2: Cabeçalhos HTTP e Content Security Policy

**Files:**
- Create: `src/lib/security/headers.ts`
- Create: `tests/unit/security/headers.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: origens públicas do próprio site e Supabase.
- Produces: `buildSecurityHeaders(): Array<{ key: string; value: string }>`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `tests/unit/security/headers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("buildSecurityHeaders", () => {
  it("bloqueia enquadramento e reduz capacidades do navegador", () => {
    const headers = Object.fromEntries(
      buildSecurityHeaders().map(({ key, value }) => [key, value]),
    );

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
  });
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run:

```powershell
npm.cmd test -- tests/unit/security/headers.test.ts
```

Expected: FAIL porque `@/lib/security/headers` ainda não existe.

- [ ] **Step 3: Implementar o gerador mínimo**

Criar `src/lib/security/headers.ts` com uma política que permita os recursos próprios, ligações HTTPS ao Supabase configurado, imagens `data:` e `blob:` e bloqueie objectos e enquadramento. Não usar `unsafe-eval` em produção.

```ts
export function buildSecurityHeaders() {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https: wss:",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
```

- [ ] **Step 4: Ligar os cabeçalhos ao Next.js**

Adicionar a `next.config.ts`:

```ts
async headers() {
  return [{ source: "/(.*)", headers: buildSecurityHeaders() }];
}
```

- [ ] **Step 5: Verificar teste, build e produção local**

Run:

```powershell
npm.cmd test -- tests/unit/security/headers.test.ts
npm.cmd run build
```

Depois iniciar localmente e confirmar com `Invoke-WebRequest` que os quatro cabeçalhos existem e que login, imagens, PDFs e Supabase continuam funcionais.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/security/headers.ts tests/unit/security/headers.test.ts next.config.ts
git commit -m "feat: adiciona cabecalhos de seguranca"
```

### Task 3: Contrato central de autorização

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/authorization.ts`
- Create: `tests/unit/auth/authorization.test.ts`
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/lib/auth/rbac.ts`

**Interfaces:**
- Consumes: `getCurrentUser()` e `UserRole`.
- Produces: `authorizeRoles(allowedRoles: readonly UserRole[]): Promise<AuthorizationResult>` e `isRoleAllowed(role, allowedRoles): boolean`.

- [ ] **Step 1: Escrever os testes da matriz**

```ts
import { describe, expect, it } from "vitest";
import { isRoleAllowed } from "@/lib/auth/authorization";

describe("isRoleAllowed", () => {
  it("restringe financas a ca e dg", () => {
    expect(isRoleAllowed("ca", ["ca", "dg"])).toBe(true);
    expect(isRoleAllowed("dg", ["ca", "dg"])).toBe(true);
    expect(isRoleAllowed("coord", ["ca", "dg"])).toBe(false);
    expect(isRoleAllowed("staff", ["ca", "dg"])).toBe(false);
  });
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `npm.cmd test -- tests/unit/auth/authorization.test.ts`

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implementar os tipos e o helper puro**

```ts
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

type InternalUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>["dbUser"]
>;

export type AuthorizationResult =
  | { success: true; user: User; dbUser: InternalUser }
  | { success: false; error: "Nao autenticado" | "Nao autorizado" };

export function isRoleAllowed(
  role: UserRole,
  allowedRoles: readonly UserRole[],
) {
  return allowedRoles.includes(role);
}
```

`authorizeRoles` deve chamar `getCurrentUser`, rejeitar utilizador ausente ou inactivo e comparar apenas o papel interno.

Mover a implementação actual de `getCurrentUser` de `src/lib/auth/actions.ts` para `src/lib/auth/session.ts`. Manter uma reexportação assíncrona compatível em `actions.ts` durante esta fase para evitar uma migração ampla sem relação com a segurança. Assim, `authorization.ts` não cria uma dependência circular quando `loginAction` passar a consumir limites e eventos.

- [ ] **Step 4: Executar os testes**

Run:

```powershell
npm.cmd test -- tests/unit/auth/authorization.test.ts tests/unit/auth/rbac.test.ts tests/unit/auth/session-gate.test.ts
```

Expected: PASS sem introduzir MFA.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/auth/session.ts src/lib/auth/authorization.ts src/lib/auth/actions.ts src/lib/auth/rbac.ts tests/unit/auth/authorization.test.ts
git commit -m "refactor: centraliza autorizacao por papel"
```

### Task 4: Limites persistentes e identificadores protegidos

**Files:**
- Create: `src/lib/db/migrations/0014_security_hardening.sql`
- Modify: `src/lib/db/schema.ts`
- Create: `src/lib/security/rate-limit.ts`
- Create: `src/lib/security/rate-limit-db.ts`
- Create: `tests/unit/security/rate-limit.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `SECURITY_RATE_LIMIT_SECRET`, acção, email normalizado, IP e utilizador autenticado.
- Produces: `hashRateLimitSubject(value: string): string`, `nextRateLimitState(input): RateLimitDecision` e `consumeRateLimit(input): Promise<RateLimitDecision>`.

- [ ] **Step 1: Escrever os testes de janela e bloqueio**

```ts
import { describe, expect, it } from "vitest";
import { nextRateLimitState } from "@/lib/security/rate-limit";

describe("nextRateLimitState", () => {
  it("bloqueia quando o limite e atingido", () => {
    const decision = nextRateLimitState({
      attempts: 4,
      limit: 5,
      windowStartedAt: new Date("2026-07-30T10:00:00Z"),
      now: new Date("2026-07-30T10:01:00Z"),
      windowMs: 15 * 60_000,
      blockMs: 15 * 60_000,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.attempts).toBe(5);
    expect(decision.blockedUntil?.toISOString()).toBe("2026-07-30T10:16:00.000Z");
  });
});
```

Adicionar casos para janela expirada, bloqueio ainda activo e recuperação após o bloqueio.

- [ ] **Step 2: Executar e confirmar a falha**

Run: `npm.cmd test -- tests/unit/security/rate-limit.test.ts`

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Criar a migração aditiva**

Criar `security_rate_limits` com:

```sql
CREATE TABLE IF NOT EXISTS security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action varchar(80) NOT NULL,
  subject_hash varchar(64) NOT NULL,
  window_started_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action, subject_hash)
);

CREATE INDEX IF NOT EXISTS security_rate_limits_blocked_idx
  ON security_rate_limits (blocked_until);
```

- [ ] **Step 4: Implementar hashing e transição pura**

Usar HMAC SHA-256 com `SECURITY_RATE_LIMIT_SECRET`. A função deve lançar erro em produção quando o segredo não estiver configurado e deve aceitar um segredo explícito nos testes.

- [ ] **Step 5: Implementar persistência atómica**

`consumeRateLimit` deve usar transacção e bloqueio da linha ou `INSERT ... ON CONFLICT ... DO UPDATE` para impedir duas instâncias da Vercel de ultrapassarem o limite em paralelo.

- [ ] **Step 6: Actualizar schema e ambiente de exemplo**

Adicionar a `.env.example`:

```dotenv
SECURITY_RATE_LIMIT_SECRET=gerar-um-segredo-aleatorio-com-pelo-menos-32-bytes
```

- [ ] **Step 7: Verificar testes e migração**

Run:

```powershell
npm.cmd test -- tests/unit/security/rate-limit.test.ts
npm.cmd run build
git diff --check -- src/lib/db/schema.ts src/lib/db/migrations/0014_security_hardening.sql
```

Expected: testes e build passam e a migração manual é estritamente aditiva. Não executar `db:generate` sobre uma migração manual já criada para evitar SQL duplicado.

- [ ] **Step 8: Commit**

```powershell
git add .env.example src/lib/db/schema.ts src/lib/db/migrations/0014_security_hardening.sql src/lib/security/rate-limit.ts src/lib/security/rate-limit-db.ts tests/unit/security/rate-limit.test.ts
git commit -m "feat: adiciona limites persistentes de seguranca"
```

### Task 5: Proteger login, recuperação e exportações

**Files:**
- Modify: `src/lib/auth/actions.ts`
- Modify: `src/components/forms/LoginForm.tsx`
- Modify: `src/components/forms/ForgotPasswordForm.tsx`
- Modify: `src/app/api/invoices/export/route.ts`
- Modify: `src/app/api/reports/pl/route.ts`
- Modify: `src/app/api/reports/monthly/route.ts`
- Modify: `tests/e2e/auth.spec.ts`
- Create: `tests/e2e/security.spec.ts`

**Interfaces:**
- Consumes: `consumeRateLimit`, `authorizeRoles` e cabeçalhos do pedido.
- Produces: `loginAction(previousState, formData)`, `requestPasswordResetAction(previousState, formData)` e respostas HTTP 429 com `Retry-After`.

- [ ] **Step 1: Criar o teste E2E de bloqueio**

Adicionar um teste que submete credenciais inválidas até ao limite e verifica mensagem genérica sem revelar se o email existe.

```ts
await expect(page.getByText("Demasiadas tentativas. Tenta novamente mais tarde.")).toBeVisible();
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `npm.cmd run test:e2e -- tests/e2e/security.spec.ts`

Expected: FAIL porque o login actual comunica directamente com Supabase e não aplica o limite da aplicação.

- [ ] **Step 3: Mover login para acção do servidor**

`loginAction` deve:

1. Normalizar email.
2. Obter IP de `x-forwarded-for` usando apenas o primeiro endereço válido.
3. Consumir limites separados para IP e HMAC do email.
4. Chamar `signInWithPassword`.
5. Devolver sempre mensagem genérica em falhas de credenciais.
6. Redireccionar usando o papel interno.

A instrumentação destes resultados com `recordSecurityEvent` pertence à Task 6 e será feita depois de o contrato do evento estar testado.

- [ ] **Step 4: Mover recuperação para acção do servidor**

Aplicar limite mais restrito e devolver sempre:

```text
Se existir uma conta com esse email, enviámos um link para redefinir a palavra-passe.
```

- [ ] **Step 5: Proteger exportações**

Aplicar limite por utilizador e IP. Quando bloqueado, devolver:

```ts
return NextResponse.json(
  { error: "Demasiados pedidos. Tenta novamente mais tarde." },
  { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
);
```

- [ ] **Step 6: Executar testes**

Run:

```powershell
npm.cmd test
npm.cmd run test:e2e -- tests/e2e/auth.spec.ts tests/e2e/security.spec.ts
```

Expected: login válido continua funcional, mensagens não enumeram contas e pedidos excessivos recebem bloqueio.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/auth/actions.ts src/components/forms/LoginForm.tsx src/components/forms/ForgotPasswordForm.tsx src/app/api/invoices/export/route.ts src/app/api/reports/pl/route.ts src/app/api/reports/monthly/route.ts tests/e2e/auth.spec.ts tests/e2e/security.spec.ts
git commit -m "feat: limita autenticacao e exportacoes"
```

### Task 6: Eventos de segurança e consulta de auditoria

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/migrations/0014_security_hardening.sql`
- Modify: `src/lib/db/audit.ts`
- Create: `src/lib/security/events.ts`
- Create: `tests/unit/security/events.test.ts`
- Create: `src/app/admin/settings/audit/page.tsx`
- Modify: `src/app/admin/settings/page.tsx`

**Interfaces:**
- Consumes: actor opcional, acção, resultado, entidade, pedido e detalhes.
- Produces: `recordSecurityEvent(input): Promise<void>` e lista paginada de auditoria para `ca`.

- [ ] **Step 1: Escrever teste de sanitização**

```ts
import { describe, expect, it } from "vitest";
import { sanitizeAuditDetails } from "@/lib/security/events";

describe("sanitizeAuditDetails", () => {
  it("remove segredos e credenciais", () => {
    expect(
      sanitizeAuditDetails({
        email: "user@example.com",
        password: "secret",
        token: "token-value",
        result: "denied",
      }),
    ).toEqual({ email: "user@example.com", result: "denied" });
  });
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `npm.cmd test -- tests/unit/security/events.test.ts`

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Alargar auditoria**

Adicionar campos `resultado`, `severidade` e `request_id` à tabela `audit_log` através de `ADD COLUMN IF NOT EXISTS`.

- [ ] **Step 4: Implementar sanitização e escrita**

Remover recursivamente as chaves `password`, `token`, `secret`, `authorization`, `cookie`, `serviceRoleKey` e equivalentes sem distinção de maiúsculas.

- [ ] **Step 5: Criar a página de auditoria**

A página deve:

1. Autorizar apenas `ca` no servidor.
2. Paginar sem carregar a tabela completa.
3. Filtrar por utilizador, acção, entidade, resultado, severidade e intervalo de datas.
4. Não mostrar tokens, cookies ou corpos de pedidos.
5. Mostrar actor, acção, alvo, resultado, data, IP mascarado e identificador do pedido.

- [ ] **Step 6: Ligar eventos aos fluxos críticos**

Registar login válido, login inválido, bloqueio, recuperação pedida, exportação, acesso negado, alteração de papel, alteração salarial, pagamento, anulação e eliminação.

- [ ] **Step 7: Verificar**

Run:

```powershell
npm.cmd test -- tests/unit/security/events.test.ts
npm.cmd run lint
npm.cmd run build
```

Expected: testes, lint e build passam e `coord`, `dg` e `staff` não abrem a página de auditoria.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/db/schema.ts src/lib/db/migrations/0014_security_hardening.sql src/lib/db/audit.ts src/lib/security/events.ts tests/unit/security/events.test.ts src/app/admin/settings/audit/page.tsx src/app/admin/settings/page.tsx
git commit -m "feat: melhora eventos e consulta de auditoria"
```

### Task 7: Aplicar autorização comum nas fronteiras críticas

**Files:**
- Modify: `src/lib/users/actions.ts`
- Modify: `src/lib/invoices/actions.ts`
- Modify: `src/lib/expenses/actions.ts`
- Modify: `src/lib/salary/actions.ts`
- Modify: `src/lib/dividends/actions.ts`
- Modify: `src/lib/stock/actions.ts`
- Modify: `src/lib/tasks/actions.ts`
- Modify: `src/lib/projects/actions.ts`
- Modify: `src/lib/services/actions.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/salary/receipt/[lineId]/route.ts`
- Modify: `src/app/api/invoices/pdf/[id]/route.ts`
- Modify: `src/app/api/invoices/payments/[paymentId]/receipt/route.ts`
- Modify: `tests/unit/auth/authorization.test.ts`
- Modify: `tests/e2e/security.spec.ts`

**Interfaces:**
- Consumes: `authorizeRoles` e `recordSecurityEvent`.
- Produces: uma validação explícita dentro de cada acção e rota que usa `dbAdmin`.

- [ ] **Step 1: Criar matriz de operações e papéis**

Codificar em teste a seguinte matriz mínima:

```ts
const permissions = {
  usersWrite: ["ca", "dg"],
  salaryWrite: ["ca", "dg"],
  dividendsWrite: ["ca", "dg"],
  reportsRead: ["ca", "dg"],
  invoicesWrite: ["ca", "dg", "coord"],
  expensesWrite: ["ca", "dg", "coord"],
  projectsWrite: ["ca", "dg", "coord"],
  tasksManage: ["ca", "dg", "coord"],
  stockWrite: ["ca", "dg", "coord"],
  servicesWrite: ["ca", "dg", "coord"],
} as const;
```

- [ ] **Step 2: Executar e confirmar falhas nas fronteiras ainda não migradas**

Run: `npm.cmd test -- tests/unit/auth/authorization.test.ts`

Expected: FAIL nos contratos que ainda dependem apenas de verificações locais duplicadas.

- [ ] **Step 3: Migrar um módulo de cada vez**

Para cada módulo:

1. Substituir verificações duplicadas pelo helper comum.
2. Manter a mensagem pública já usada pelo formulário.
3. Registar acesso negado.
4. Executar os testes do módulo antes de avançar.
5. Não alterar consultas ou cálculos sem relação com autorização.

- [ ] **Step 4: Proteger leitura de recibos**

Manter a regra existente: `ca` e `dg` podem ler recibos administrativos e cada colaborador só pode ler o próprio recibo.

- [ ] **Step 5: Executar suite completa**

Run:

```powershell
npm.cmd test
npm.cmd run test:e2e -- tests/e2e/security.spec.ts
npm.cmd run lint
npm.cmd run build
```

Expected: os quatro papéis mantêm acessos legítimos e os acessos negativos devolvem 401, 403 ou redireccionamento adequado.

- [ ] **Step 6: Commit**

```powershell
git add src/lib src/app/api tests/unit/auth/authorization.test.ts tests/e2e/security.spec.ts
git commit -m "refactor: aplica autorizacao nas fronteiras criticas"
```

### Task 8: Restauro verificável de backup

**Files:**
- Create: `scripts/verify-backup-restore.ts`
- Create: `src/lib/backup/restore-safety.ts`
- Create: `docs/operations/backup-restore.md`
- Modify: `package.json`
- Test: `tests/unit/backup/restore-safety.test.ts`

**Interfaces:**
- Consumes: caminho explícito de dump e `BACKUP_RESTORE_DATABASE_URL` que aponta para base isolada.
- Produces: comando `npm run backup:verify-restore` com relatório de tabelas e contagens.

- [ ] **Step 1: Escrever teste de segurança do destino**

```ts
import { describe, expect, it } from "vitest";
import { assertSafeRestoreTarget } from "@/lib/backup/restore-safety";

describe("assertSafeRestoreTarget", () => {
  it("recusa restaurar sobre DATABASE_URL", () => {
    expect(() =>
      assertSafeRestoreTarget("postgresql://prod", "postgresql://prod"),
    ).toThrow("A base de restauro tem de ser isolada");
  });
});
```

- [ ] **Step 2: Executar e confirmar a falha**

Run: `npm.cmd test -- tests/unit/backup/restore-safety.test.ts`

Expected: FAIL porque o módulo de validação ainda não existe.

- [ ] **Step 3: Implementar validação e restauro**

Implementar as validações puras em `src/lib/backup/restore-safety.ts`. O script deve importar esse módulo e recusar:

1. URL ausente.
2. URL igual a `DATABASE_URL` ou `DATABASE_DIRECT_URL`.
3. Ficheiro fora do caminho explicitamente indicado.
4. Dump vazio.

Depois deve restaurar numa base isolada, verificar as tabelas essenciais e devolver contagens sem imprimir credenciais.

- [ ] **Step 4: Documentar procedimento**

O documento deve incluir criação da base isolada, execução, verificação, eliminação segura da base temporária e periodicidade trimestral.

- [ ] **Step 5: Verificar sem tocar em produção**

Run:

```powershell
npm.cmd test -- tests/unit/backup/restore-safety.test.ts
npm.cmd run backup:verify-restore -- --help
```

Expected: teste passa e a ajuda não apresenta segredos.

- [ ] **Step 6: Commit**

```powershell
git add scripts/verify-backup-restore.ts src/lib/backup/restore-safety.ts tests/unit/backup/restore-safety.test.ts package.json
git add -f docs/operations/backup-restore.md
git commit -m "feat: adiciona verificacao segura de restauro"
```

### Task 9: Verificação final e documentação do estado real

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-30-security-stability-phase-1.md`

**Interfaces:**
- Consumes: todas as tarefas anteriores.
- Produces: evidência final de testes, build, audit, cabeçalhos e acessos por papel.

- [ ] **Step 1: Corrigir documentação de MFA**

Substituir qualquer afirmação de MFA obrigatório por uma descrição factual de login por palavra-passe e decisão explícita de não exigir MFA nesta fase.

- [ ] **Step 2: Executar verificação completa**

Run:

```powershell
npm.cmd audit --omit=dev
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
git diff --check
```

Expected: zero vulnerabilidades elevadas de produção, zero testes falhados, lint e build sem erros e diff sem espaços inválidos.

- [ ] **Step 3: Verificar cabeçalhos localmente**

Run:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:3000/login' -UseBasicParsing | Select-Object -ExpandProperty Headers
```

Expected: Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` presentes.

- [ ] **Step 4: Rever alterações sensíveis**

Confirmar manualmente:

1. Nenhum segredo entrou no Git.
2. MFA não foi introduzido.
3. Fórmulas salariais não mudaram.
4. Alterações locais da correcção de facturas foram preservadas.
5. Migrações são aditivas.
6. Logs não contêm palavras-passe, tokens ou cookies.

- [ ] **Step 5: Commit final da fase**

```powershell
git add README.md docs/superpowers/plans/2026-07-30-security-stability-phase-1.md
git commit -m "docs: actualiza estado de seguranca da aplicacao"
```

## Execution Notes

1. A revogação administrativa de sessões não será implementada nesta fase se a API Supabase disponível exigir o token da sessão do próprio utilizador. Essa limitação deve ser registada no README sem simular a funcionalidade.
2. A aplicação tem alterações locais não comprometidas na folha salarial. Qualquer tarefa que toque em `src/lib/salary/actions.ts` deve preservar esse diff e rever a combinação antes do commit.
3. A migração `0014_security_hardening.sql` deve ser aplicada primeiro num ambiente de teste com cópia sanitizada do esquema.
4. A política CSP deve começar em `Content-Security-Policy-Report-Only` se a verificação local revelar recursos legítimos bloqueados. Só passa a bloqueio depois de corrigir as origens necessárias.
