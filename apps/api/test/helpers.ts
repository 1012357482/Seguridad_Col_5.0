import { randomUUID } from "node:crypto";
import type { AiProvider } from "../src/ai/types";
import { loadConfig } from "../src/config";
import { buildServer } from "../src/server";

export async function crearApp(env: Record<string, string> = {}, ai?: AiProvider | null) {
  const config = loadConfig({
    NODE_ENV: "test",
    DB_PATH: ":memory:",
    AI_PROVIDER: "mock",
    SOURCE_TIMEOUT_MS: "800",
    AI_TIMEOUT_MS: "1500",
    ...env,
  });
  const app = await buildServer({ config, ai, logger: false });
  await app.ready();
  return app;
}

export type App = Awaited<ReturnType<typeof crearApp>>;

export const nuevoCliente = () => randomUUID();

export async function consentir(app: App, clientId: string, alcance: "analisis_ia" | "transcripcion" = "analisis_ia") {
  const r = await app.inject({
    method: "POST",
    url: "/api/consentimientos",
    headers: { "x-client-id": clientId },
    payload: { alcance, textoVersion: "test" },
  });
  return r.json().consentId as string;
}

export async function analizar(app: App, clientId: string, texto: string, extra: Record<string, unknown> = {}) {
  const consentId = await consentir(app, clientId);
  return app.inject({
    method: "POST",
    url: "/api/analisis",
    headers: { "x-client-id": clientId },
    payload: { consentId, tipo: "texto", texto, ...extra },
  });
}
