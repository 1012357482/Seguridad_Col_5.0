/* Prueba de humo del proveedor de IA configurado (no corre en CI normal).
   Ejecuta 5 mensajes del conjunto dorado contra la API, mide latencia p50/p95 y valida el formato.
   Uso: SMOKE_API_URL=http://localhost:8787 npm run smoke:ai -w @itf/api */
import { redactPII, Veredicto } from "@itf/core";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const API = process.env.SMOKE_API_URL ?? "http://localhost:8787";
const P95_TEXTO_MS = 15_000;

const golden = JSON.parse(readFileSync(new URL("../../../packages/core/test/fixtures/golden.json", import.meta.url), "utf8")).casos as {
  id: string;
  texto: string;
}[];
const muestra = ["f01", "f09", "f14", "l02", "l06"].map((id) => golden.find((c) => c.id === id)!);

const percentil = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil((p / 100) * xs.length) - 1)];

const tiempos: number[] = [];
let invalidos = 0;
for (const c of muestra) {
  const headers = { "content-type": "application/json", "x-client-id": randomUUID() };
  const { consentId } = await fetch(`${API}/api/consentimientos`, {
    method: "POST",
    headers,
    body: JSON.stringify({ alcance: "analisis_ia", textoVersion: "smoke" }),
  }).then((r) => r.json());
  const t0 = performance.now();
  const res = await fetch(`${API}/api/analisis`, {
    method: "POST",
    headers,
    body: JSON.stringify({ consentId, tipo: "texto", texto: redactPII(c.texto).texto }),
  });
  const ms = performance.now() - t0;
  tiempos.push(ms);
  const v = Veredicto.safeParse(await res.json());
  if (!v.success) invalidos++;
  console.log(`${c.id}\t${res.status}\t${Math.round(ms)} ms\tnivel=${v.success ? v.data.nivel : "?"}\tia=${v.success ? v.data.ia.estado : "?"}`);
}

const p50 = percentil(tiempos, 50);
const p95 = percentil(tiempos, 95);
console.log(`p50=${Math.round(p50)} ms  p95=${Math.round(p95)} ms  respuestas inválidas=${invalidos}`);
if (p95 > P95_TEXTO_MS || invalidos > 0) {
  console.error(`✗ Fuera de meta (p95 ≤ ${P95_TEXTO_MS} ms y 0 inválidas).`);
  process.exit(1);
}
console.log("✓ Proveedor dentro de la meta de latencia.");
