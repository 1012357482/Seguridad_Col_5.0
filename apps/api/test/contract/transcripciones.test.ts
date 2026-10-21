import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { consentir, crearApp, nuevoCliente, type App } from "../helpers";

let app: App;
afterEach(() => app?.close());

function multipart(campos: Record<string, string>, archivo?: { nombre: string; tipo: string; datos: Buffer }) {
  const limite = "----itf" + Math.random().toString(16).slice(2);
  const partes: Buffer[] = [];
  for (const [k, v] of Object.entries(campos)) {
    partes.push(Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  if (archivo) {
    partes.push(
      Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="audio"; filename="${archivo.nombre}"\r\nContent-Type: ${archivo.tipo}\r\n\r\n`),
      archivo.datos,
      Buffer.from("\r\n"),
    );
  }
  partes.push(Buffer.from(`--${limite}--\r\n`));
  return { payload: Buffer.concat(partes), headers: { "content-type": `multipart/form-data; boundary=${limite}` } };
}

async function enviar(a: App, cliente: string, campos: Record<string, string>, archivo?: { nombre: string; tipo: string; datos: Buffer }) {
  const m = multipart(campos, archivo);
  return a.inject({ method: "POST", url: "/api/transcripciones", headers: { ...m.headers, "x-client-id": cliente }, payload: m.payload });
}

const audio = (bytes: number) => ({ nombre: "nota.ogg", tipo: "audio/ogg", datos: Buffer.alloc(bytes, 7) });

describe("POST /api/transcripciones", () => {
  it("transcribe con consentimiento y no deja archivos en disco", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    const antes = readdirSync(tmpdir()).length;
    const r = await enviar(app, c, { consentId: await consentir(app, c, "transcripcion") }, audio(64_000));
    expect(r.statusCode).toBe(200);
    expect(r.json().texto).toContain("código");
    expect(readdirSync(tmpdir()).length).toBeLessThanOrEqual(antes);
  });

  it("sin consentimiento → 400", async () => {
    app = await crearApp();
    expect((await enviar(app, nuevoCliente(), {}, audio(64_000))).statusCode).toBe(400);
  });

  it("un consentimiento de análisis no sirve para transcribir", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    expect((await enviar(app, c, { consentId: await consentir(app, c, "analisis_ia") }, audio(64_000))).statusCode).toBe(400);
  });

  it("audio sin voz → 422", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    expect((await enviar(app, c, { consentId: await consentir(app, c, "transcripcion") }, audio(100))).statusCode).toBe(422);
  });

  it("archivo mayor a 25 MB → 413", async () => {
    app = await crearApp();
    const c = nuevoCliente();
    const r = await enviar(app, c, { consentId: await consentir(app, c, "transcripcion") }, audio(25 * 1024 * 1024 + 10));
    expect(r.statusCode).toBe(413);
  });

  it("sin proveedor de IA → 503 con alternativa", async () => {
    app = await crearApp({ AI_PROVIDER: "none" });
    const c = nuevoCliente();
    const r = await enviar(app, c, { consentId: await consentir(app, c, "transcripcion") }, audio(64_000));
    expect(r.statusCode).toBe(503);
    expect(r.json().detail).toContain("Me llamaron");
  });
});
