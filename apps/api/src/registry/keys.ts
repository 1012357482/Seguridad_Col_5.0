import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { hexToBytes } from "@itf/core";

/* Firma Ed25519 de casos: el comprobante es verificable aunque la base SQLite se borre. */

export interface Firmador {
  claveId: string;
  publicPem: string;
  efimera: boolean;
  firmar(hashEntradaHex: string): string;
}

export function claveIdDe(pub: KeyObject): string {
  const der = pub.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex").slice(0, 16);
}

export function crearFirmador(pemPrivada?: string): Firmador {
  let privada: KeyObject;
  let efimera = false;
  if (pemPrivada) {
    privada = createPrivateKey(pemPrivada.replace(/\\n/g, "\n"));
    if (privada.asymmetricKeyType !== "ed25519") throw new Error("CASE_SIGNING_KEY debe ser una clave Ed25519.");
  } else {
    privada = generateKeyPairSync("ed25519").privateKey;
    efimera = true;
  }
  const publica = createPublicKey(privada);
  return {
    claveId: claveIdDe(publica),
    publicPem: publica.export({ type: "spki", format: "pem" }).toString(),
    efimera,
    firmar: (hashEntradaHex) => sign(null, hexToBytes(hashEntradaHex), privada).toString("base64"),
  };
}

export function verificarFirma(publicPem: string, hashEntradaHex: string, firmaB64: string): boolean {
  try {
    return verify(null, hexToBytes(hashEntradaHex), createPublicKey(publicPem), Buffer.from(firmaB64, "base64"));
  } catch {
    return false;
  }
}
