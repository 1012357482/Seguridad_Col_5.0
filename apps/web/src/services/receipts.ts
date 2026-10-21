import { canonical, Comprobante, hexToBytes, sha256Hex } from "@itf/core";
import { api } from "./apiClient";

/* Comprobantes de caso (contracts/case-receipt.md): descarga y verificación en el navegador. */

export function descargarComprobante(c: Comprobante) {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-${c.caso.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ResultadoVerificacion {
  formatoValido: boolean;
  hashValido: boolean;
  firmaValida: boolean | null;
  enBaseDeDatos: boolean | null;
  dondeSeVerifico: "dispositivo" | "servidor";
}

function pemADer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function firmaEnNavegador(c: Comprobante): Promise<boolean | null> {
  try {
    const clave = await crypto.subtle.importKey("spki", pemADer(c.clavePublicaPem), { name: "Ed25519" }, false, ["verify"]);
    const firma = Uint8Array.from(atob(c.firma), (ch) => ch.charCodeAt(0));
    return await crypto.subtle.verify({ name: "Ed25519" }, clave, firma, hexToBytes(c.caso.hashEntrada));
  } catch {
    return null; // el navegador no soporta Ed25519 en WebCrypto
  }
}

export async function verificarComprobante(raw: unknown): Promise<ResultadoVerificacion> {
  const p = Comprobante.safeParse(raw);
  if (!p.success) return { formatoValido: false, hashValido: false, firmaValida: false, enBaseDeDatos: null, dondeSeVerifico: "dispositivo" };
  const c = p.data;
  const { hashEntrada, ...resto } = c.caso;
  const hashValido = (await sha256Hex(canonical(resto))) === hashEntrada;
  const firmaLocal = await firmaEnNavegador(c);
  try {
    const s = await api<{ firmaValida: boolean; hashValido: boolean; enBaseDeDatos: boolean }>("/api/comprobantes/verificar", { body: c });
    return { formatoValido: true, hashValido: hashValido && s.hashValido, firmaValida: s.firmaValida, enBaseDeDatos: s.enBaseDeDatos, dondeSeVerifico: "servidor" };
  } catch {
    return { formatoValido: true, hashValido, firmaValida: firmaLocal, enBaseDeDatos: null, dondeSeVerifico: "dispositivo" };
  }
}

const CLAVE_ULTIMOS = "itf.comprobantes";

/** Copia local de los últimos comprobantes (por si el servidor de prueba se reinicia). */
export function recordarComprobante(c: Comprobante) {
  try {
    const lista: Comprobante[] = JSON.parse(localStorage.getItem(CLAVE_ULTIMOS) ?? "[]");
    localStorage.setItem(CLAVE_ULTIMOS, JSON.stringify([c, ...lista.filter((x) => x.caso.id !== c.caso.id)].slice(0, 20)));
  } catch {
    /* sin almacenamiento local */
  }
}

export function comprobantesRecordados(): Comprobante[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ULTIMOS) ?? "[]");
  } catch {
    return [];
  }
}

export function olvidarComprobantes() {
  try {
    localStorage.removeItem(CLAVE_ULTIMOS);
  } catch {
    /* nada */
  }
}
