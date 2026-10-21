import { analyzeLocal, huellaEvidencia } from "@itf/core";
import { afterEach, describe, expect, it } from "vitest";
import { analizar, crearApp, nuevoCliente, type App } from "../helpers";

let app: App;
afterEach(() => app?.close());

const TEXTO = "Ganaste un premio, envía tu clave a http://premio.click";

describe("rutas de casos", () => {
  it("crea, lista, consulta por ID, comprueba huella y borra", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const c = nuevoCliente();
    const h = { "x-client-id": c };
    const veredicto = analyzeLocal({ tipo: "texto", texto: TEXTO });
    const huella = await huellaEvidencia(TEXTO);

    const creado = await app.inject({ method: "POST", url: "/api/casos", headers: h, payload: { huellaEvidencia: huella, tipoEvidencia: "texto", veredicto } });
    expect(creado.statusCode).toBe(201);
    const comp = creado.json();
    expect(comp.caso.id).toMatch(/^IF-\d{8}-[0-9A-Z]{6}$/);
    expect(comp.formato).toBe("identifica-tu-fraude/comprobante@1");

    const lista = (await app.inject({ url: "/api/casos", headers: h })).json();
    expect(lista.casos).toHaveLength(1);
    expect(lista.cadena.ok).toBe(true);

    expect((await app.inject({ url: `/api/casos/${comp.caso.id}` })).json().caso.hashEntrada).toBe(comp.caso.hashEntrada);
    expect((await app.inject({ url: "/api/casos/IF-00000000-XXXXXX" })).statusCode).toBe(404);

    const si = (await app.inject({ method: "POST", url: "/api/casos/comprobar", headers: h, payload: { huella } })).json();
    expect(si).toMatchObject({ coincide: true, casoId: comp.caso.id });
    const otraPersona = (await app.inject({ method: "POST", url: "/api/casos/comprobar", headers: { "x-client-id": nuevoCliente() }, payload: { huella } })).json();
    expect(otraPersona.coincide).toBe(false);

    expect((await app.inject({ method: "DELETE", url: "/api/casos", headers: h })).statusCode).toBe(204);
    expect((await app.inject({ url: "/api/casos", headers: h })).json().casos).toHaveLength(0);
  });

  it("un caso analizado con IA exige el consentimiento de ese análisis", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    const veredicto = (await analizar(app, c, TEXTO)).json();
    expect(veredicto.ia.estado).toBe("usada");
    const huellaEvidencia_ = "a".repeat(64);
    const sin = await app.inject({ method: "POST", url: "/api/casos", headers: { "x-client-id": c }, payload: { huellaEvidencia: huellaEvidencia_, tipoEvidencia: "texto", veredicto } });
    expect(sin.statusCode).toBe(400);
  });

  it("lo guardado y las estadísticas no contienen el texto de la evidencia (SC-009)", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const secreto = "Mensaje único zzqx-4471 con premio, envía tu clave a http://premio.click";
    for (let i = 0; i < 3; i++) {
      const c = nuevoCliente();
      await app.inject({
        method: "POST",
        url: "/api/casos",
        headers: { "x-client-id": c },
        payload: { huellaEvidencia: await huellaEvidencia(secreto), tipoEvidencia: "texto", veredicto: analyzeLocal({ tipo: "texto", texto: secreto }) },
      });
    }
    const filas = JSON.stringify(app.deps.db.prepare("SELECT * FROM cases").all());
    expect(filas).not.toContain("zzqx-4471");
    const stats = (await app.inject({ url: "/api/estadisticas" })).json();
    expect(JSON.stringify(stats)).not.toContain("zzqx-4471");
    expect(stats.totales.casos).toBe(3);
    expect(stats.porModalidad[0]).toMatchObject({ modalidad: "falso_premio", casos: 3 });
  });

  it("publica la clave pública", async () => {
    app = await crearApp();
    const k = (await app.inject({ url: "/api/clave-publica" })).json();
    expect(k.pem).toContain("BEGIN PUBLIC KEY");
    expect(k.claveId).toHaveLength(16);
  });
});
