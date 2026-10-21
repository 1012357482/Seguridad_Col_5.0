import { canonical, Comprobante, sha256Hex, type Caso } from "@itf/core";
import { createHash, createPublicKey } from "node:crypto";
import { verificarFirma } from "./keys";

/* Verificación de cadena y comprobantes (contracts/case-receipt.md). */

export async function hashDeCaso(caso: Omit<Caso, "hashEntrada"> & { hashEntrada?: string }): Promise<string> {
  const resto: Record<string, unknown> = { ...caso };
  delete resto.hashEntrada;
  return sha256Hex(canonical(resto));
}

export interface FilaCaso {
  caso: Caso;
  firma: string;
}

export interface ResultadoCadena {
  ok: boolean;
  verificados: number;
  rotoEn?: string;
  motivo?: string;
}

/** Recalcula huellas, valida firmas y enlaces de una cadena (orden de creación). */
export async function verificarCadena(
  filas: FilaCaso[],
  publicPem: string,
  campo: "previaOwner" | "previaGlobal",
  borrados: Set<string>,
): Promise<ResultadoCadena> {
  let anterior: string | null = null;
  for (const { caso, firma } of filas) {
    if ((await hashDeCaso(caso)) !== caso.hashEntrada) {
      return { ok: false, verificados: filas.length, rotoEn: caso.id, motivo: "el contenido del caso no coincide con su huella (fue alterado)." };
    }
    if (!verificarFirma(publicPem, caso.hashEntrada, firma)) {
      return { ok: false, verificados: filas.length, rotoEn: caso.id, motivo: "la firma del caso no es válida." };
    }
    const previa = caso[campo];
    const esperado = anterior ?? "INICIO";
    // Un enlace a un caso borrado con "Borrar todo mi historial" es un hueco declarado, no una alteración.
    if (previa !== esperado && !borrados.has(previa)) {
      return {
        ok: false,
        verificados: filas.length,
        rotoEn: caso.id,
        motivo: "el caso no está encadenado con el anterior (falta o se alteró una entrada).",
      };
    }
    anterior = caso.hashEntrada;
  }
  return { ok: true, verificados: filas.length };
}

export interface ResultadoComprobante {
  formatoValido: boolean;
  hashValido: boolean;
  firmaValida: boolean;
  claveCoincide: boolean;
  enBaseDeDatos: boolean;
}

export async function verificarComprobante(
  raw: unknown,
  buscarHash: (id: string) => string | undefined,
): Promise<ResultadoComprobante> {
  const p = Comprobante.safeParse(raw);
  if (!p.success) return { formatoValido: false, hashValido: false, firmaValida: false, claveCoincide: false, enBaseDeDatos: false };
  const { caso, firma, clavePublicaPem, claveId } = p.data;
  const hashValido = (await hashDeCaso(caso)) === caso.hashEntrada;
  const firmaValida = verificarFirma(clavePublicaPem, caso.hashEntrada, firma);
  let claveCoincide = false;
  try {
    const der = createPublicKey(clavePublicaPem).export({ type: "spki", format: "der" });
    claveCoincide = createHash("sha256").update(der).digest("hex").slice(0, 16) === claveId;
  } catch {
    claveCoincide = false;
  }
  return { formatoValido: true, hashValido, firmaValida, claveCoincide, enBaseDeDatos: buscarHash(caso.id) === caso.hashEntrada };
}
