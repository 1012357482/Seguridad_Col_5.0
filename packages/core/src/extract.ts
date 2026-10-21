/* Extracción de indicadores (enlaces, dominios, números) desde el texto de la evidencia. */

const URL_RE = /\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi;
// Dominios "sueltos" sin esquema, p. ej. "bancolombia-seguro.xyz/validar"
const DOMINIO_SUELTO_RE =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|co|net|org|xyz|top|click|zip|mov|gq|tk|ml|cf|info|online|site|shop|live|link|app|me|io|ly|gl|gd|vip|club|lat)(?:\.co)?(?:\/[^\s<>"']*)?/gi;

export function extraerEnlaces(texto: string): string[] {
  const encontrados = new Set<string>();
  for (const m of texto.match(URL_RE) ?? []) encontrados.add(limpiarFinal(m));
  const sinUrls = texto.replace(URL_RE, " ");
  for (const m of sinUrls.match(DOMINIO_SUELTO_RE) ?? []) {
    // Evitar correos electrónicos (la parte después de @)
    const idx = sinUrls.indexOf(m);
    if (idx > 0 && sinUrls[idx - 1] === "@") continue;
    encontrados.add(limpiarFinal(m));
  }
  return [...encontrados].slice(0, 10);
}

function limpiarFinal(u: string): string {
  return u.replace(/[.,;:!?)\]]+$/, "");
}

export function hostDe(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Sufijos de segundo nivel frecuentes (aproximación al Public Suffix List).
const SUFIJOS_2N = new Set([
  "com.co", "gov.co", "net.co", "org.co", "edu.co", "mil.co", "nom.co",
  "co.uk", "com.br", "com.mx", "com.ar", "com.pe", "com.ec", "com.ve",
]);

/** Dominio registrable (p. ej. "pagos.bancolombia.com.co" → "bancolombia.com.co"). */
export function dominioRegistrable(host: string): string {
  const partes = host.toLowerCase().split(".").filter(Boolean);
  if (partes.length <= 2) return partes.join(".");
  const ult2 = partes.slice(-2).join(".");
  return SUFIJOS_2N.has(ult2) ? partes.slice(-3).join(".") : ult2;
}

const NUMERO_RE = /(?:\+?57[\s-]?)?(?:3\d{2}[\s-]?\d{3}[\s-]?\d{4}|60\d[\s-]?\d{7}|01[\s-]?8000[\s-]?\d{3}[\s-]?\d{3})\b/g;

/** Números telefónicos colombianos presentes en el texto (indicadores, no datos de la persona). */
export function extraerNumeros(texto: string): string[] {
  return [...new Set((texto.match(NUMERO_RE) ?? []).map(normalizarNumero))].slice(0, 5);
}

/** Normaliza a E.164 (+57…) cuando es posible; los códigos cortos se dejan en dígitos. */
export function normalizarNumero(valor: string): string {
  const d = valor.replace(/\D/g, "");
  if (/^57\d{10}$/.test(d)) return `+${d}`;
  if (/^(3|60)\d{8,9}$/.test(d) && d.length === 10) return `+57${d}`;
  return d;
}
