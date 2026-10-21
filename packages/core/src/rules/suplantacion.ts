import { entidadesMencionadas } from "../entidades";
import { motivoRegla, type Regla } from "./types";

// Migrado de PATRONES_SUPLANTACION (legacy/index.html) y separado por modalidad.
const AUTORIDAD = /\b(dian|fiscal[ií]a|polic[ií]a|superfinanciera|migraci[oó]n|juzgado|registradur[ií]a|sim[ií]t|tr[aá]nsito)\b/i;
const PREMIO = /\b(premio|ganaste|ganador(a)?|sorteo|reembolso|devoluci[oó]n de (dinero|impuestos)|subsidio|bono|beneficiario)\b/i;
const EMPLEO = /\b(trabajo desde casa|empleo|vacante|ingresos extra|gana (hasta )?\$|me gusta|likes|calificar (productos|hoteles)|tareas pagadas)\b/i;
const INVERSION = /\b(inversi[oó]n|invierte|rentabilidad|cripto|bitcoin|usdt|duplica|triplica|ganancias garantizadas|forex)\b/i;
const EXTORSION = /\b(secuestr\w*|te tenemos|sabemos d[oó]nde|tu familia|si no pagas|vamos a publicar|video [ií]ntimo|amenaza|extorsi[oó]n|grupo armado)\b/i;
const PAGO = /\b(pago anticipado|consigna(r|ci[oó]n)? (a|en|el valor)|transfi[eé]re(nos)?|env[ií]a(nos)? (el )?dinero|gastos de env[ií]o|recarga de|anticipo|giro)\b/i;

export const reglaSuplantacion: Regla = ({ texto }) => {
  const motivos = [];
  const entidades = entidadesMencionadas(texto);
  if (entidades.length || AUTORIDAD.test(texto)) {
    motivos.push(motivoRegla("suplantacion", "Menciona una entidad o autoridad. Verifícala por un canal oficial.", 1));
  }
  if (PREMIO.test(texto)) {
    motivos.push(motivoRegla("suplantacion", "Ofrece premios, reembolsos o subsidios inesperados.", 2));
  }
  if (EMPLEO.test(texto) && /\$|pago|gana|dinero/i.test(texto)) {
    motivos.push(motivoRegla("suplantacion", "Ofrece dinero fácil por tareas sencillas o empleo no solicitado.", 2));
  }
  if (INVERSION.test(texto)) {
    motivos.push(motivoRegla("suplantacion", "Promete ganancias de inversión altas o garantizadas.", 2));
  }
  if (EXTORSION.test(texto)) {
    motivos.push(motivoRegla("urgencia", "Contiene amenazas o intimidación para exigir dinero.", 3));
  }
  if (PAGO.test(texto)) {
    motivos.push(motivoRegla("datos", "Pide pagos, transferencias o anticipos.", 2));
  }
  return motivos;
};

export const PATRONES_MODALIDAD = { AUTORIDAD, PREMIO, EMPLEO, INVERSION, EXTORSION, PAGO };
