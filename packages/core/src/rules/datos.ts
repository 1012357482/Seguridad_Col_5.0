import { algunoCoincide, motivoRegla, type Regla } from "./types";

// Migrado de PATRONES_DATOS (legacy/index.html).
const PATRONES_DATOS = [
  /\bclave\b/i,
  /contrase[nñ]a/i,
  /c[oó]digo/i,
  /\btoken\b/i,
  /\botp\b/i,
  /n[uú]mero de (tarjeta|cuenta)/i,
  /c[eé]dula/i,
  /datos (personales|bancarios)/i,
  /\bcvv\b|c[oó]digo de seguridad|fecha de vencimiento/i,
  /usuario y (clave|contrase[nñ]a)/i,
];

// Verbos de solicitud: la diferencia entre "tu código es 1234" (aviso) y "envíanos tu código" (fraude).
const SOLICITUD =
  /\b(env[ií]e|env[ií]a|env[ií]anos|comparta|comp[aá]rteme|confirme|confirma|ingrese|ingresa|digite|digita|actualice|actualiza|ind[ií]que|ind[ií]canos|resp[oó]nda|responde|suministre|valide|valida|verifique|verifica|reg[ií]stra|d[ií]ctame|dicte|p[aá]same|reenv[ií]a|reenv[ií]e|escriba|escribe|proporcione)\b/i;

// Frases de protección típicas de mensajes legítimos.
const PROTECCION = /\b(no (lo |la |los )?compart(as|a|an)|nunca (te |le )?(pediremos|solicitaremos|pedimos)|no (lo |la )?reveles|no lo entregues)\b/i;

export const reglaDatos: Regla = ({ texto, enlaces }) => {
  if (!algunoCoincide(PATRONES_DATOS, texto)) return [];
  if (PROTECCION.test(texto) && !enlaces.length) return [];
  if (SOLICITUD.test(texto) || enlaces.length > 0) {
    return [motivoRegla("datos", "Pide claves, códigos o datos personales o financieros.", 3)];
  }
  return [];
};
