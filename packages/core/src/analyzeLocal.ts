import { entidadImitada, entidadesMencionadas, type Entidad } from "./entidades";
import { extraerEnlaces, hostDe } from "./extract";
import { QUE_HACER, canalesDenuncia, pasosUrgentes } from "./guidance";
import { PATRONES_MODALIDAD, VERSION_REGLAS, aplicarReglas } from "./rules";
import type { EvidenciaTipo, IaEstado, Modalidad, Motivo, Nivel, RelatoLlamada, Veredicto } from "./types";

export interface EvidenciaLocal {
  tipo: EvidenciaTipo;
  texto: string;
  relato?: RelatoLlamada;
}

export const UMBRAL_ALTO = 5;
export const UMBRAL_MEDIO = 2;

export function nivelDesdePuntos(puntos: number): Nivel {
  if (puntos >= UMBRAL_ALTO) return "alto";
  if (puntos >= UMBRAL_MEDIO) return "medio";
  return "bajo";
}

/** Escala 0–100 para el medidor: 0–33 bajo, 34–66 medio, 67–100 alto. */
export function puntajeDesdePuntos(puntos: number): number {
  if (puntos <= 0) return 0;
  if (puntos < UMBRAL_MEDIO) return Math.round((puntos / UMBRAL_MEDIO) * 33);
  if (puntos < UMBRAL_ALTO) return 34 + Math.round(((puntos - UMBRAL_MEDIO) / (UMBRAL_ALTO - UMBRAL_MEDIO)) * 32);
  return Math.min(100, 67 + Math.round(((puntos - UMBRAL_ALTO) / 7) * 33));
}

export const BANDA_MIN: Record<Nivel, number> = { bajo: 0, medio: 34, alto: 67 };

export const sumarPuntos = (motivos: Motivo[]) => motivos.reduce((s, m) => s + (m.puntos ?? 0), 0);

export function categoriasDe(motivos: Motivo[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of motivos) out[m.categoria] = (out[m.categoria] ?? 0) + (m.puntos ?? 1);
  return out;
}

export function modalidadHeuristica(texto: string, nivel: Nivel, relato?: RelatoLlamada, entidad?: Entidad): Modalidad {
  if (nivel === "bajo") return "ninguna";
  const t = `${texto} ${relato?.quienDijoSer ?? ""} ${relato?.notas ?? ""}`;
  if (PATRONES_MODALIDAD.EXTORSION.test(t)) return "extorsion";
  if (relato) return "vishing";
  if (PATRONES_MODALIDAD.INVERSION.test(t)) return "falsa_inversion";
  if (PATRONES_MODALIDAD.EMPLEO.test(t)) return "falso_empleo";
  if (PATRONES_MODALIDAD.PREMIO.test(t)) return "falso_premio";
  if (entidad?.tipo === "autoridad" || PATRONES_MODALIDAD.AUTORIDAD.test(t)) return "suplantacion_autoridad";
  if (entidad) return "suplantacion_bancaria";
  if (/\b(compra|env[ií]o|vendo|marketplace|producto|pedido)\b/i.test(t)) return "compra_falsa";
  return "otro";
}

export function entidadDe(texto: string, enlaces: string[], relato?: RelatoLlamada): Entidad | undefined {
  for (const e of enlaces) {
    const imitada = entidadImitada(hostDe(e));
    if (imitada) return imitada;
  }
  return entidadesMencionadas(`${texto} ${relato?.quienDijoSer ?? ""}`)[0];
}

export function queHacerPara(nivel: Nivel): string[] {
  return [...QUE_HACER[nivel]];
}

/** Veredicto solo con reglas: sin conexión, sin consentimiento o como base del análisis del servidor. */
export function analyzeLocal(evidencia: EvidenciaLocal, iaEstado: IaEstado = "sin_consentimiento"): Veredicto {
  const textoRelato = evidencia.relato
    ? [evidencia.relato.quienDijoSer, evidencia.relato.notas].filter(Boolean).join(". ")
    : "";
  const texto = [evidencia.texto, textoRelato].filter(Boolean).join("\n");
  const enlaces = extraerEnlaces(texto);
  const motivos = aplicarReglas({ texto, enlaces, relato: evidencia.relato });
  const puntos = sumarPuntos(motivos);
  const nivel = nivelDesdePuntos(puntos);
  const entidad = entidadDe(texto, enlaces, evidencia.relato);

  return {
    nivel,
    puntaje: puntajeDesdePuntos(puntos),
    modalidad: modalidadHeuristica(texto, nivel, evidencia.relato, entidad),
    motivos,
    categorias: categoriasDe(motivos),
    queHacer: queHacerPara(nivel),
    urgente: pasosUrgentes(evidencia.relato),
    denuncia: canalesDenuncia(entidad),
    fuentes: [],
    entidad: entidad?.nombre,
    ia: { estado: iaEstado },
    versionReglas: VERSION_REGLAS,
    generadoEn: new Date().toISOString(),
  };
}

