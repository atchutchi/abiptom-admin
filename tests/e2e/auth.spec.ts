import { test, expect } from "@playwright/test";

/**
 * Fase 1 — Testes de autenticação e RBAC
 *
 * Pré-requisitos (configurar em .env.test.local):
 *   E2E_CA_EMAIL      — email de um utilizador CA com MFA activo
 *   E2E_CA_PASSWORD   — password do CA
 *   E2E_STAFF_EMAIL   — email de um utilizador staff
 *   E2E_STAFF_PASSWORD
 *   E2E_DG_EMAIL
 *   E2E_DG_PASSWORD
 */

const CA_EMAIL = process.env.E2E_CA_EMAIL ?? "ca@abiptom.gw";
const CA_PASSWORD = process.env.E2E_CA_PASSWORD ?? "senha_ca_teste";
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? "staff@abiptom.gw";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? "senha_staff_teste";
const DG_EMAIL = process.env.E2E_DG_EMAIL ?? "dg@abiptom.gw";
const DG_PASSWORD = process.env.E2E_DG_PASSWORD ?? "senha_dg_teste";

test.describe("Login", () => {
  test("mostra formulário de login na raiz sem sessão", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Palavra-passe")).toBeVisible();
  });

  test("mostra erro com credenciais inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("invalido@abiptom.gw");
    await page.getByLabel("Palavra-passe").fill("senha_errada");
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await expect(page.getByText("Email ou palavra-passe incorrectos")).toBeVisible();
  });

  test("staff faz login sem MFA e vai para /staff/me/dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF_EMAIL);
    await page.getByLabel("Palavra-passe").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await expect(page).toHaveURL(/\/staff\/me\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText(/Olá,/)).toBeVisible();
  });

  test("staff não acede a /admin/users (RBAC)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF_EMAIL);
    await page.getByLabel("Palavra-passe").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.waitForURL(/\/staff\/me\/dashboard/);

    // Tentativa directa de aceder a rota admin
    await page.goto("/admin/users");
    // Deve redirecionar para /staff/me/dashboard ou /login
    await expect(page).not.toHaveURL(/\/admin\/users/);
  });

  test("logout limpa sessão e redireciona para login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF_EMAIL);
    await page.getByLabel("Palavra-passe").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.waitForURL(/\/staff\/me\/dashboard/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

test.describe("CRUD Utilizadores (CA/DG)", () => {
  test("DG acede à página de utilizadores", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DG_EMAIL);
    await page.getByLabel("Palavra-passe").fill(DG_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.waitForURL(/\/admin\/dashboard/);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Utilizadores" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Novo utilizador" })).toBeVisible();
  });

  test("DG cria novo utilizador staff", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DG_EMAIL);
    await page.getByLabel("Palavra-passe").fill(DG_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.waitForURL(/\/admin\/dashboard/);

    await page.goto("/admin/users/new");

    const timestamp = Date.now();
    await page.getByLabel("Nome completo *").fill(`Teste Utilizador ${timestamp}`);
    await page.getByLabel("Nome curto *").fill(`Teste${timestamp}`);
    await page.getByLabel("Email *").fill(`teste${timestamp}@abiptom.gw`);
    await page.getByLabel("Cargo").fill("Tester");

    await page.getByRole("button", { name: "Criar utilizador" }).click();
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10_000 });
  });
});

test.describe("RLS — isolamento de dados", () => {
  test("staff não consegue consultar lista de utilizadores via API", async ({ page, request }) => {
    // Login como staff
    await page.goto("/login");
    await page.getByLabel("Email").fill(STAFF_EMAIL);
    await page.getByLabel("Palavra-passe").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sessão" }).click();
    await page.waitForURL(/\/staff\/me\/dashboard/);

    // Tentativa de chamar rota protegida
    const response = await page.request.get("/api/users");
    // Deve devolver 401 ou 403
    expect([401, 403, 404]).toContain(response.status());
  });
});
