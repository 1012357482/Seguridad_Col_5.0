import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* Auditoría de accesibilidad (WCAG 2.1 A/AA) en las páginas principales. */
for (const ruta of ["", "analizar", "me-llamaron", "entidad", "permisos", "privacidad"]) {
  test(`sin violaciones graves de accesibilidad en /${ruta}`, async ({ page }) => {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(graves.map((v) => `${v.id}: ${v.nodes.length} nodo(s)`)).toEqual([]);
  });
}
