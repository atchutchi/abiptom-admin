import { expect, test, type Page } from "@playwright/test";
import { E2E_USERS } from "./credentials";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Palavra-passe").fill(password);
  await page.getByRole("button", { name: "Iniciar sessão" }).click();
}

async function gotoWithRetry(page: Page, path: string) {
  try {
    await page.goto(path);
  } catch {
    await page.goto(path);
  }
}

test.describe("Perfil e landing pages", () => {
  async function openFooterProfile(page: Page, href: string) {
    const footerLink = page.locator(`aside a[href="${href}"]`).last();
    await footerLink.scrollIntoViewIfNeeded();
    await footerLink.click({ force: true });
  }

  test("coordenação entra no painel pessoal e abre o perfil pelo rodapé", async ({
    page,
  }) => {
    await login(page, E2E_USERS.coord.email, E2E_USERS.coord.password);
    await expect(page).toHaveURL(/\/staff\/me\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText(`Olá, ${E2E_USERS.coord.nomeCurto}`)).toBeVisible();

    await openFooterProfile(page, "/admin/profile");
    await expect(page).toHaveURL(/\/admin\/profile/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
  });

  test("colaborador abre e actualiza o perfil pessoal", async ({ page }) => {
    await login(page, E2E_USERS.staff.email, E2E_USERS.staff.password);
    await expect(page).toHaveURL(/\/staff\/me\/dashboard/, { timeout: 10_000 });

    await gotoWithRetry(page, "/staff/me/profile");
    await expect(page).toHaveURL(/\/staff\/me\/profile/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();

    const temporaryShortName = `Staff ${Date.now().toString().slice(-4)}`;

    await page.getByLabel("Nome curto").fill(temporaryShortName);
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Perfil actualizado.")).toBeVisible();
    await expect(page.getByLabel("Nome curto")).toHaveValue(temporaryShortName);

    await page.getByLabel("Nome curto").fill(E2E_USERS.staff.nomeCurto);
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Perfil actualizado.")).toBeVisible();
    await expect(page.getByLabel("Nome curto")).toHaveValue(E2E_USERS.staff.nomeCurto);
  });

  test("colaborador actualiza e remove o avatar", async ({ page }) => {
    await login(page, E2E_USERS.staff.email, E2E_USERS.staff.password);
    await expect(page).toHaveURL(/\/staff\/me\/dashboard/, { timeout: 10_000 });

    await gotoWithRetry(page, "/staff/me/profile");
    await expect(page).toHaveURL(/\/staff\/me\/profile/, { timeout: 10_000 });

    await page.getByLabel("Nova fotografia").setInputFiles({
      name: "avatar-test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sW7xZ8AAAAASUVORK5CYII=",
        "base64"
      ),
    });

    await page.getByRole("button", { name: "Actualizar avatar" }).click();
    await expect(page.getByText("Avatar actualizado.")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Avatar removido.")).toBeVisible({
      timeout: 15_000,
    });
  });
});
