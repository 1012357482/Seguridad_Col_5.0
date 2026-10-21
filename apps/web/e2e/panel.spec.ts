import { expect, test } from "@playwright/test";

/* US4 · quickstart V14–V15: gráficos legibles a 360 px y sin desbordes. */
test("el resultado muestra medidor y desglose; el panel muestra KPIs y tendencias", async ({ page }) => {
  await page.goto("analizar");
  await page.getByRole("button", { name: "Cargar ejemplo" }).click();
  await page.getByRole("button", { name: /Analizar/ }).click();
  await page.getByRole("button", { name: /Aceptar y analizar/ }).click();
  await expect(page.getByRole("img", { name: /Desglose de señales por categoría/ })).toBeVisible();
  await expect(page.locator(".grafico svg").first()).toBeVisible();

  await page.goto("panel");
  await expect(page.getByRole("heading", { name: "Panorama del fraude reportado" })).toBeVisible();
  await expect(page.locator(".kpi")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Modalidades más frecuentes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Entidades más suplantadas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Casos por semana" })).toBeVisible();
});

test("sin desbordamiento horizontal en ninguna sección", async ({ page }) => {
  for (const ruta of ["", "analizar", "me-llamaron", "entidad", "registro", "panel", "permisos", "privacidad"]) {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde, `desborde en /${ruta}`).toBeLessThanOrEqual(1);
  }
});
