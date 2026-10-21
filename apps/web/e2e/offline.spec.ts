import { expect, test } from "@playwright/test";

/* FR-029c · quickstart V17: sin conexión → veredicto local y aviso. */
test("sin conexión analiza con reglas locales y lo avisa", async ({ page, context }) => {
  await page.goto("analizar");
  await expect(page.getByRole("button", { name: "Cargar ejemplo" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Cargar ejemplo" }).click();
  await page.getByRole("button", { name: /Analizar/ }).click();
  await expect(page.getByRole("heading", { name: "Riesgo alto" })).toBeVisible();
  await expect(page.getByText(/Sin conexión: analizamos con las reglas de tu dispositivo/)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.setOffline(false);
});

/* FR-029b · V16: lo compartido por GET llega precargado a Analizar. */
test("compartir precarga el texto en Analizar", async ({ page }) => {
  await page.goto("compartir?text=" + encodeURIComponent("Ganaste un premio, reclámalo ya"));
  await expect(page).toHaveURL(/\/analizar$/);
  await expect(page.getByLabel("Mensaje o enlace sospechoso")).toHaveValue("Ganaste un premio, reclámalo ya");
});

/* US7 · V7: relato con entrega de dinero → pasos urgentes primero. */
test("'Me llamaron' con dinero entregado muestra pasos urgentes primero", async ({ page }) => {
  await page.goto("me-llamaron");
  await page.getByRole("textbox", { name: "¿Quién dijo ser?" }).fill("Asesor de seguridad del banco");
  await page.getByLabel("Transferir o mover dinero").check();
  await page.getByRole("radio", { name: "Sí" }).check();
  await page.getByLabel("Envié dinero").check();
  await page.getByRole("button", { name: /Analizar la llamada/ }).click();
  await page.getByRole("button", { name: /Aceptar y analizar/ }).click();
  await expect(page.getByRole("heading", { name: "Haz esto ahora" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Riesgo alto" })).toBeVisible();
  await expect(page.getByText(/Llamada falsa \(vishing\)/)).toBeVisible();
});
