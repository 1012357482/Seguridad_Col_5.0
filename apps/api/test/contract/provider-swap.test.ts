import { huellaEvidencia, Veredicto } from "@itf/core";
import { afterEach, describe, expect, it } from "vitest";
import { MockProvider } from "../../src/ai/mock";
import { analizar, crearApp, nuevoCliente, type App } from "../helpers";

let app: App;
afterEach(() => app?.close());

const TEXTO = "Ganaste un premio de $5.000.000, confirma tu clave en http://premio.click";

describe("cambio de proveedor solo por configuración (US5, SC-005)", () => {
  for (const [id, modelo] of [
    ["proveedor-a", "modelo-a"],
    ["proveedor-b", "modelo-b"],
  ]) {
    it(`${id}: mismo formato de veredicto y el caso registra proveedor/modelo`, async () => {
      app = await crearApp({}, new MockProvider("none", id, modelo));
      const c = nuevoCliente();
      const consentimiento = await app.inject({
        method: "POST",
        url: "/api/consentimientos",
        headers: { "x-client-id": c },
        payload: { alcance: "analisis_ia", textoVersion: "t" },
      });
      const consentId = consentimiento.json().consentId;
      const r = await app.inject({
        method: "POST",
        url: "/api/analisis",
        headers: { "x-client-id": c },
        payload: { consentId, tipo: "texto", texto: TEXTO },
      });
      const v = Veredicto.parse(r.json());
      expect(v.ia).toMatchObject({ estado: "usada", proveedor: id, modelo });

      const caso = await app.inject({
        method: "POST",
        url: "/api/casos",
        headers: { "x-client-id": c },
        payload: { huellaEvidencia: await huellaEvidencia(TEXTO), tipoEvidencia: "texto", veredicto: v, consentId },
      });
      expect(caso.json().caso.veredicto.ia).toMatchObject({ proveedor: id, modelo });
    });
  }

  it("la fábrica crea el adaptador compatible con OpenAI para proveedores reales", async () => {
    const { createAiProvider } = await import("../../src/ai/factory");
    const { loadConfig } = await import("../../src/config");
    for (const p of ["groq", "gemini", "openrouter"] as const) {
      const ai = createAiProvider(loadConfig({ NODE_ENV: "test", AI_PROVIDER: p, AI_API_KEY: "x", AI_MODEL: "m" }));
      expect(ai?.id).toBe(p);
      expect(ai?.model).toBe("m");
    }
  });

  it("analizar con el proveedor por defecto sigue funcionando", async () => {
    app = await crearApp();
    expect((await analizar(app, nuevoCliente(), TEXTO)).statusCode).toBe(200);
  });
});
