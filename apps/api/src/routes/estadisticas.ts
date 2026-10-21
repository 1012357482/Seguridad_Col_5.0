import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../deps";

/* Tendencias agregadas y anónimas (FR-028). Solo grupos con ≥ K casos (SC-009). */
export const K_MINIMO = 3;
const CACHE_MS = 5 * 60_000;

export function calcularEstadisticas(deps: AppDeps) {
  const db = deps.db;
  const totales = db
    .prepare(
      `SELECT COUNT(*) AS casos,
              SUM(json_extract(veredicto_json, '$.nivel') = 'alto') AS alto,
              SUM(json_extract(veredicto_json, '$.nivel') = 'medio') AS medio,
              SUM(json_extract(veredicto_json, '$.nivel') = 'bajo') AS bajo
       FROM cases`,
    )
    .get() as Record<string, number | null>;

  const agrupar = (expr: string, alias: string) =>
    db
      .prepare(
        `SELECT ${expr} AS ${alias}, COUNT(*) AS casos FROM cases
         WHERE ${expr} IS NOT NULL AND ${expr} NOT IN ('ninguna', '')
         GROUP BY ${alias} HAVING COUNT(*) >= ? ORDER BY casos DESC LIMIT 10`,
      )
      .all(K_MINIMO) as Record<string, string | number>[];

  const porSemana = db
    .prepare(
      `SELECT strftime('%Y-W%W', creado_en) AS semana, COUNT(*) AS casos FROM cases
       GROUP BY semana HAVING COUNT(*) >= ? ORDER BY semana ASC LIMIT 26`,
    )
    .all(K_MINIMO) as { semana: string; casos: number }[];

  return {
    totales: {
      casos: Number(totales.casos ?? 0),
      alto: Number(totales.alto ?? 0),
      medio: Number(totales.medio ?? 0),
      bajo: Number(totales.bajo ?? 0),
    },
    porModalidad: agrupar("json_extract(veredicto_json, '$.modalidad')", "modalidad"),
    porEntidad: agrupar("json_extract(veredicto_json, '$.entidad')", "entidad"),
    porSemana,
    kMinimo: K_MINIMO,
    generadoEn: new Date().toISOString(),
  };
}

export function registerEstadisticas(app: FastifyInstance, deps: AppDeps) {
  let cache: { en: number; datos: ReturnType<typeof calcularEstadisticas> } | null = null;
  app.get("/api/estadisticas", async (_req, reply) => {
    if (!cache || Date.now() - cache.en > CACHE_MS) cache = { en: Date.now(), datos: calcularEstadisticas(deps) };
    reply.header("cache-control", "public, max-age=300");
    return cache.datos;
  });
}
