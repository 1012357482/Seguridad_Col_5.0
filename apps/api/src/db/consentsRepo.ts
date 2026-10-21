import { randomUUID } from "node:crypto";
import type { Db } from "./index";

/* Consentimiento explícito por análisis (FR-020, SC-011): cada uno se consume una sola vez. */

export type Alcance = "analisis_ia" | "transcripcion";

export function createConsentsRepo(db: Db) {
  const insertar = db.prepare(
    "INSERT INTO consents (id, owner_hash, otorgado_en, alcance, proveedor, texto_version) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const consumirStmt = db.prepare(
    "UPDATE consents SET usado_en = ? WHERE id = ? AND owner_hash = ? AND alcance = ? AND usado_en IS NULL",
  );
  const existeStmt = db.prepare("SELECT 1 AS ok FROM consents WHERE id = ? AND owner_hash = ?");

  return {
    crear(ownerHash: string, alcance: Alcance, proveedor: string, textoVersion: string): string {
      const id = randomUUID();
      insertar.run(id, ownerHash, new Date().toISOString(), alcance, proveedor, textoVersion);
      return id;
    },
    /** true si el consentimiento existía, era de esta persona y no se había usado. */
    consumir(id: string, ownerHash: string, alcance: Alcance): boolean {
      return Number(consumirStmt.run(new Date().toISOString(), id, ownerHash, alcance).changes) === 1;
    },
    existe(id: string, ownerHash: string): boolean {
      return !!existeStmt.get(id, ownerHash);
    },
  };
}

export type ConsentsRepo = ReturnType<typeof createConsentsRepo>;
