import { reglaDatos } from "./datos";
import { reglaEnlaces } from "./enlaces";
import { reglaManipulacion } from "./manipulacion";
import { reglaSuplantacion } from "./suplantacion";
import type { ContextoReglas, Regla } from "./types";
import { reglaAccionInmediata, reglaUrgencia } from "./urgencia";
import { reglaVoz } from "./voz";

/** Versión del motor de reglas; se registra en cada veredicto y caso. */
export const VERSION_REGLAS = "1.0.0";

export const REGLAS: Regla[] = [
  reglaUrgencia,
  reglaDatos,
  reglaSuplantacion,
  reglaEnlaces,
  reglaAccionInmediata,
  reglaManipulacion,
  reglaVoz,
];

export function aplicarReglas(ctx: ContextoReglas) {
  const motivos = REGLAS.flatMap((r) => r(ctx));
  // Sin duplicados exactos (p. ej. dos enlaces http)
  const vistos = new Set<string>();
  return motivos.filter((m) => (vistos.has(m.texto) ? false : (vistos.add(m.texto), true)));
}

export { analizarEnlace } from "./enlaces";
export { PATRONES_MODALIDAD } from "./suplantacion";
export type { ContextoReglas } from "./types";
