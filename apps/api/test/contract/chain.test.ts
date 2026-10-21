import { analyzeLocal, huellaEvidencia, type Comprobante } from "@itf/core";
import { afterEach, describe, expect, it } from "vitest";
import { crearApp, nuevoCliente, type App } from "../helpers";

let app: App;
afterEach(() => app?.close());

async function guardar(a: App, cliente: string, texto: string): Promise<Comprobante> {
  const veredicto = analyzeLocal({ tipo: "texto", texto });
  const r = await a.inject({
    method: "POST",
    url: "/api/casos",
    headers: { "x-client-id": cliente },
    payload: { huellaEvidencia: await huellaEvidencia(texto), tipoEvidencia: "texto", veredicto },
  });
  expect(r.statusCode).toBe(201);
  return r.json();
}

const cadena = async (a: App, cliente: string) =>
  (await a.inject({ url: "/api/casos", headers: { "x-client-id": cliente } })).json().cadena;

describe("cadena y firma de casos (SC-004)", () => {
  it("una cadena sin alterar es íntegra", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    for (const t of ["uno", "dos", "tres"]) await guardar(app, c, t);
    expect(await cadena(app, c)).toMatchObject({ ok: true, verificados: 3 });
  });

  it("detecta un veredicto alterado directamente en la base", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    await guardar(app, c, "uno");
    const segundo = await guardar(app, c, "dos");
    await guardar(app, c, "tres");
    app.deps.db.prepare("UPDATE cases SET veredicto_json = json_set(veredicto_json, '$.puntaje', 99) WHERE id = ?").run(segundo.caso.id);
    const r = await cadena(app, c);
    expect(r.ok).toBe(false);
    expect(r.rotoEn).toBe(segundo.caso.id);
    expect(r.motivo).toContain("alterado");
  });

  it("detecta un caso eliminado sin pasar por 'Borrar historial'", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    await guardar(app, c, "uno");
    const segundo = await guardar(app, c, "dos");
    const tercero = await guardar(app, c, "tres");
    app.deps.db.prepare("DELETE FROM cases WHERE id = ?").run(segundo.caso.id);
    const r = await cadena(app, c);
    expect(r.ok).toBe(false);
    expect(r.rotoEn).toBe(tercero.caso.id);
  });

  it("el borrado declarado de otra persona no rompe la cadena global", async () => {
    app = await crearApp();
    const a = nuevoCliente();
    const b = nuevoCliente();
    await guardar(app, a, "a1");
    await guardar(app, b, "b1");
    await guardar(app, a, "a2");
    await app.inject({ method: "DELETE", url: "/api/casos", headers: { "x-client-id": b } });
    const global = (await app.inject({ url: "/api/casos/cadena-global" })).json();
    expect(global.ok).toBe(true);
    expect(await cadena(app, a)).toMatchObject({ ok: true });
  });

  it("un comprobante sigue siendo verificable cuando el caso ya no está en la base", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    const comp = await guardar(app, c, "mensaje");
    await app.inject({ method: "DELETE", url: "/api/casos", headers: { "x-client-id": c } });
    const r = (await app.inject({ method: "POST", url: "/api/comprobantes/verificar", payload: comp })).json();
    expect(r).toMatchObject({ formatoValido: true, hashValido: true, firmaValida: true, claveCoincide: true, enBaseDeDatos: false });
  });

  it("un comprobante alterado no pasa la verificación", async () => {
    app = await crearApp();
    const comp = await guardar(app, nuevoCliente(), "mensaje");
    comp.caso.veredicto.puntaje = 99;
    const r = (await app.inject({ method: "POST", url: "/api/comprobantes/verificar", payload: comp })).json();
    expect(r.hashValido).toBe(false);
  });
});
