import type { Fuente, SourceCheck } from "@itf/core";

export type ResultadoParcial = Pick<SourceCheck, "resultado" | "detalle"> & { estado?: SourceCheck["estado"] };

export class FuenteNoDisponible extends Error {}

/**
 * Ejecuta una consulta a una fuente abierta con límite de tiempo. Nunca lanza:
 * una fuente caída se reporta como no_disponible/timeout y el análisis sigue (FR-012).
 */
export async function runSource(
  fuente: Fuente,
  indicador: string,
  fn: (signal: AbortSignal) => Promise<ResultadoParcial>,
  timeoutMs = 4000,
): Promise<SourceCheck> {
  const consultadoEn = new Date().toISOString();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fn(ac.signal);
    return { fuente, indicador, consultadoEn, estado: r.estado ?? "ok", resultado: r.resultado, detalle: r.detalle };
  } catch (e) {
    const timeout = ac.signal.aborted;
    return {
      fuente,
      indicador,
      consultadoEn,
      estado: timeout ? "timeout" : "no_disponible",
      resultado: "sin_datos",
      detalle: timeout ? "La fuente no respondió a tiempo." : e instanceof FuenteNoDisponible ? e.message : "La fuente no se pudo consultar.",
    };
  } finally {
    clearTimeout(timer);
  }
}
