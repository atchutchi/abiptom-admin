import { test, expect } from "@playwright/test";
import { E2E_USERS } from "./credentials";
import { createSupabaseAdminClient } from "./supabase-admin";

/**
 * Fase 1 — Testes de autenticação e RBAC
 *
 * Variáveis opcionais:
 *   E2E_CA_EMAIL      — email de um utilizador CA de teste
 *   E2E_CA_PASSWORD   — password do CA
 *   E2E_STAFF_EMAIL   — email de um utilizador staff de teste
 *   E2E_STAFF_PASSWORD
 *   E2E_DG_EMAIL
 *   E2E_DG_PASSWORD
 */

const STAFF_EMAIL = E2E_USERS.staff.email;
const STAFF_PASSWORD = E2E_USERS.staff.password;
const DG_EMAIL = E2E_USERS.dg.email;
const DG_PASSWORD = E2E_USERS.dg.password;

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

  test("mostra link de recuperação de palavra-passe", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: "Esqueceste-te da palavra-passe?" })
    ).toBeVisible();
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

test.describe("Recuperação de palavra-passe", () => {
  test("update-password sem sessão mostra instrução para novo link", async ({
    page,
  }) => {
    await page.goto("/update-password");
    await expect(
      page.getByText("Este link de recuperação é inválido, já expirou ou foi usado.")
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Pedir novo link" })
    ).toBeVisible();
  });

  test("staff redefine a palavra-passe com link de recovery", async ({
    page,
    baseURL,
  }) => {
    const supabaseAdmin = createSupabaseAdminClient();
    const redirectTo = `${baseURL}/auth/confirm?next=/update-password`;
    const newPassword = `SenhaNova_${Date.now()}!`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: STAFF_EMAIL,
      options: { redirectTo },
    });

    expect(error).toBeNull();
    expect(data.properties?.action_link).toBeTruthy();
    expect(data.user?.id).toBeTruthy();

    try {
      await page.goto(data.properties!.action_link);
      await expect(page).toHaveURL(/\/update-password/, { timeout: 20_000 });

      await page.getByLabel("Nova palavra-passe").fill(newPassword);
      await page.getByLabel("Confirmar palavra-passe").fill(newPassword);
      await page.getByRole("button", { name: "Actualizar palavra-passe" }).click();

      await expect(page).toHaveURL(/\/login\?notice=password-reset-success/, {
        timeout: 10_000,
      });
      await expect(
        page.getByText("Palavra-passe actualizada. Inicia sessão com as novas credenciais.")
      ).toBeVisible();

      await page.getByLabel("Email").fill(STAFF_EMAIL);
      await page.getByLabel("Palavra-passe").fill(newPassword);
      await page.getByRole("button", { name: "Iniciar sessão" }).click();
      await expect(page).toHaveURL(/\/staff\/me\/dashboard/, { timeout: 10_000 });
    } finally {
      if (data.user?.id) {
        await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
          password: STAFF_PASSWORD,
          email_confirm: true,
          user_metadata: {
            role: "staff",
            mfa_enabled: false,
            active: true,
          },
        });
      }
    }
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
  test("staff não consegue consultar lista de utilizadores via API", async ({ page }) => {
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
