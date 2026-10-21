import { algunoCoincide, motivoRegla, type Regla } from "./types";

// Migrado de PATRONES_URGENCIA (legacy/index.html) y ampliado.
const PATRONES_URGENCIA = [
  /bloque(ad[ao]|o|ar[aá]?)/i,
  /suspend(ida|ido|er|eremos)/i,
  /urgente/i,
  /hoy mismo/i,
  /[uú]ltim[ao]s? (horas|minutos|oportunidad|aviso)/i,
  /inmediatamente|de inmediato/i,
  /\bvence\b|vencimiento/i,
  /caducar|caduca/i,
  /ser[aá] (cancelad|eliminad|desactivad|cerrad)/i,
  /en las pr[oó]ximas \d+/i,
  /embargo|multa|sanci[oó]n/i,
];

export const reglaUrgencia: Regla = ({ texto }) =>
  algunoCoincide(PATRONES_URGENCIA, texto)
    ? [motivoRegla("urgencia", "Usa lenguaje de urgencia o amenaza para presionar una acción rápida.", 2)]
    : [];

const PATRONES_ACCION = /\b(ingrese|ingresa|haga clic|haz clic|click|clic aqu[ií]|responda|responde|confirme|confirma|actualice|actualiza)\b/i;

export const reglaAccionInmediata: Regla = ({ texto, enlaces }) =>
  enlaces.length > 0 && PATRONES_ACCION.test(texto)
    ? [motivoRegla("urgencia", "Te pide hacer clic o responder de inmediato.", 1)]
    : [];
