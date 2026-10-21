/* Huellas SHA-256 con WebCrypto: funcionan igual en el navegador y en Node 22. */

/** Normaliza un texto antes de calcular su huella: NFC, sin bordes, espacios colapsados. */
export function normalize(texto: string): string {
  return texto.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function sha256Hex(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return bytesToHex(buf);
}

/** Huella de la evidencia original revisada por la persona (contracts/case-receipt.md). */
export function huellaEvidencia(texto: string): Promise<string> {
  return sha256Hex(normalize(texto));
}
