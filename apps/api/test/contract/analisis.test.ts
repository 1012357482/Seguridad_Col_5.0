import { Veredicto } from "@itf/core";
import { afterEach, describe, expect, it } from "vitest";
import { MockProvider } from "../../src/ai/mock";
import { analizar, consentir, crearApp, nuevoCliente, type App } from "../helpers";

const EJEMPLO =
  "Estimado cliente, su cuenta Bancolombia será bloqueada hoy por actividad inusual. Para desbloquearla confirme su clave y código en http://bancolombia-seguro.xyz/validar";

let app: App;
afterEach(() => app?.close());

describe("POST /api/analisis", () => {
  it("devuelve un veredicto válido con motivos de reglas e IA", async () => {
    app = await crearApp();
    const r = await analizar(app, nuevoCliente(), EJEMPLO);
    expect(r.statusCode).toBe(200);
    const v = Veredicto.parse(r.json());
    expect(v.nivel).toBe("alto");
    expect(v.motivos.length).toBeGreaterThanOrEqual(3);
    expect(v.ia.estado).toBe("usada");
    expect(v.motivos.some((m) => m.origen === "regla")).toBe(true);
    expect(v.motivos.some((m) => m.origen === "ia")).toBe(true);
    expect(v.fuentes.length).toBeGreaterThan(0);
  });

  it("sin consentimiento válido → 400", async () => {
    app = await crearApp();
    const r = await app.inject({
      method: "POST",
      url: "/api/analisis",
      headers: { "x-client-id": nuevoCliente() },
      payload: { consentId: "00000000-0000-4000-8000-000000000000", tipo: "texto", texto: "hola" },
    });
    expect(r.statusCode).toBe(400);
    expect(r.headers["content-type"]).toContain("application/problem+json");
  });

  it("el consentimiento es de un solo uso y de un solo dispositivo", async () => {
    app = await crearApp();
    const cliente = nuevoCliente();
    const consentId = await consentir(app, cliente);
    const cuerpo = { consentId, tipo: "texto", texto: "hola" };
    const otro = await app.inject({ method: "POST", url: "/api/analisis", headers: { "x-client-id": nuevoCliente() }, payload: cuerpo });
    expect(otro.statusCode).toBe(400);
    const primero = await app.inject({ method: "POST", url: "/api/analisis", headers: { "x-client-id": cliente }, payload: cuerpo });
    expect(primero.statusCode).toBe(200);
    const segundo = await app.inject({ method: "POST", url: "/api/analisis", headers: { "x-client-id": cliente }, payload: cuerpo });
    expect(segundo.statusCode).toBe(400);
  });

  it("sin X-Client-Id → 400", async () => {
    app = await crearApp();
    const r = await app.inject({ method: "POST", url: "/api/consentimientos", payload: { alcance: "analisis_ia", textoVersion: "t" } });
    expect(r.statusCode).toBe(400);
  });

  it("si la IA no responde, entrega el veredicto por reglas (SC-003)", async () => {
    app = await crearApp({ AI_TIMEOUT_MS: "1000" }, new MockProvider("timeout"));
    const r = await analizar(app, nuevoCliente(), EJEMPLO);
    expect(r.statusCode).toBe(200);
    const v = r.json();
    expect(v.ia.estado).toBe("no_disponible");
    expect(v.nivel).toBe("alto");
  });

  it("con AI_PROVIDER=none el análisis funciona solo con reglas", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const r = await analizar(app, nuevoCliente(), EJEMPLO);
    expect(r.json().ia.estado).toBe("desactivada");
  });

  it("el servidor vuelve a ocultar datos personales antes de la IA", async () => {
    let recibido = "";
    const espia = new MockProvider();
    const original = espia.chat.bind(espia);
    espia.chat = async (req, signal) => {
      recibido = JSON.stringify(req.messages);
      return original(req, signal);
    };
    app = await crearApp({}, espia);
    await analizar(app, nuevoCliente(), "Mi tarjeta es 4111 1111 1111 1111 y mi cédula 1020304050");
    expect(recibido).not.toMatch(/4111 1111|1020304050/);
    expect(recibido).toContain("DATO OCULTO");
  });

  it("límite de uso: la petición 21 en 10 minutos recibe 429", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const cliente = nuevoCliente();
    let ultimo = 0;
    for (let i = 0; i < 21; i++) ultimo = (await analizar(app, cliente, "hola")).statusCode;
    expect(ultimo).toBe(429);
  });
});

describe("configuración", () => {
  it("rechaza AI_PROVIDER=mock en producción (Constitución §II)", async () => {
    await expect(crearApp({ NODE_ENV: "production", OWNER_SALT: "x" })).rejects.toThrow(/mock no está permitido/);
  });

  it("GET /api/config expone proveedor y versión de reglas", async () => {
    app = await crearApp();
    const c = (await app.inject({ url: "/api/config" })).json();
    expect(c.ia.proveedor).toBe("mock");
    expect(c.versionReglas).toBeTruthy();
  });
});
