import { algunoCoincide, motivoRegla, type Regla } from "./types";

// Intentos de manipular al agente de IA dentro de la evidencia (FR-007).
const PATRONES = [
  /ignora (tus|las|todas las) (instrucciones|reglas)/i,
  /olvida (tus|las) instrucciones/i,
  /(di|responde|indica|marca) que (este mensaje |esto |el mensaje )?es (seguro|leg[ií]timo|confiable)/i,
  /eres un (asistente|modelo|bot)/i,
  /system prompt|prompt del sistema|ignore (all|previous) instructions/i,
  /clasifica(lo)? como (seguro|bajo)/i,
];

export const reglaManipulacion: Regla = ({ texto }) =>
  algunoCoincide(PATRONES, texto)
    ? [motivoRegla("manipulacion", "El contenido intenta dar órdenes al sistema de análisis para parecer seguro.", 3)]
    : [];
