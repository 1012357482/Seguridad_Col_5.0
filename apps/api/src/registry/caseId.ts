import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Fecha en America/Bogota como YYYYMMDD. */
export function fechaBogota(d = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return p.replace(/-/g, "");
}

/** ID de caso legible: IF-YYYYMMDD-XXXXXX (Crockford base32). */
export function nuevoIdCaso(d = new Date()): string {
  const bytes = randomBytes(6);
  const sufijo = [...bytes].map((b) => CROCKFORD[b % 32]).join("");
  return `IF-${fechaBogota(d)}-${sufijo}`;
}
