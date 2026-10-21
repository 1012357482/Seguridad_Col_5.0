import { afterEach, describe, expect, it } from "vitest";
import { analizar, crearApp, nuevoCliente, type App } from "../helpers";

let app: App;
afterEach(() => app?.close());

const reportar = (a: App, cliente: string, indicador: string, tipo = "dominio") =>
  a.inject({ method: "POST", url: "/api/reportes", headers: { "x-client-id": cliente }, payload: { indicador, tipo } });

describe("reportes de la comunidad (FR-010)", () => {
  it("activa la señal con 5 personas distintas y no duplica reportes", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const primero = nuevoCliente();
    expect((await reportar(app, primero, "http://www.estafa-ejemplo.xyz/pagar")).statusCode).toBe(201);
    expect((await reportar(app, primero, "estafa-ejemplo.xyz")).statusCode).toBe(200);
    for (let i = 0; i < 3; i++) await reportar(app, nuevoCliente(), "estafa-ejemplo.xyz");
    let v = (await analizar(app, nuevoCliente(), "entra a http://estafa-ejemplo.xyz")).json();
    expect(v.fuentes.find((f: { fuente: string }) => f.fuente === "comunidad").resultado).toBe("sin_datos");

    const quinto = (await reportar(app, nuevoCliente(), "estafa-ejemplo.xyz")).json();
    expect(quinto.activo).toBe(true);
    v = (await analizar(app, nuevoCliente(), "entra a http://estafa-ejemplo.xyz")).json();
    const motivo = v.motivos.find((m: { origen: string; fuente?: string }) => m.origen === "fuente" && m.fuente === "Reportes de la comunidad");
    expect(motivo.texto).toContain("5 personas distintas");
    expect(motivo.consultadoEn).toBeTruthy();
  });
});

describe("POST /api/entidades/verificar", () => {
  it("sin canales cargados responde sin_datos (nunca 'falso')", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const r = (await app.inject({ method: "POST", url: "/api/entidades/verificar", payload: { valor: "BANCOLOMBIA" } })).json();
    expect(r.resultado).toBe("sin_datos");
    expect(r.entidad).toBe("Bancolombia");
  });

  it("incluye reportes de la comunidad para un número", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    await reportar(app, nuevoCliente(), "310 555 6677", "numero");
    const r = (await app.inject({ method: "POST", url: "/api/entidades/verificar", payload: { valor: "+57 3105556677" } })).json();
    expect(r.reportesComunidad).toBe(1);
  });
});
