import { expect, test } from "@playwright/test";

test.describe("Protecções HTTP", () => {
  test("aplica cabeçalhos de segurança ao login", async ({ request }) => {
    const response = await request.get("/login");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
});

test.describe("Limites de autenticação", () => {
  test("bloqueia tentativas repetidas sem revelar se a conta existe", async ({
    page,
  }) => {
    const email = `inexistente-${Date.now()}@abiptom.gw`;

    await page.goto("/login");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Palavra-passe").fill("credencial-invalida");
      await page.getByRole("button", { name: "Iniciar sessão" }).click();

      const expectedMessage =
        attempt < 5
          ? "Email ou palavra-passe incorrectos."
          : "Demasiadas tentativas. Tenta novamente mais tarde.";
      await expect(page.getByText(expectedMessage)).toBeVisible();
    }
  });
});
