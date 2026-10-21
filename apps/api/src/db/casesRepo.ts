import { canonical, FORMATO_COMPROBANTE, sha256Hex, type Caso, type Comprobante, type EvidenciaTipo, type Veredicto } from "@itf/core";
import { nuevoIdCaso } from "../registry/caseId";
import type { Firmador } from "../registry/keys";
import { transaction, type Db } from "./index";

/* Registro de casos encadenado y firmado (FR-014–FR-019). Inmutable: sin UPDATE. */

interface Fila {
  id: string;
  creado_en: string;
  huella_evidencia: string;
  tipo_evidencia: string;
  veredicto_json: string;
  previa_owner: string;
  previa_global: string;
  hash_entrada: string;
  firma: string;
  clave_id: string;
}

export const filaACaso = (f: Fila): Caso => ({
  id: f.id,
  creadoEn: f.creado_en,
  huellaEvidencia: f.huella_evidencia,
  tipoEvidencia: f.tipo_evidencia as EvidenciaTipo,
  veredicto: JSON.parse(f.veredicto_json) as Veredicto,
  previaOwner: f.previa_owner,
  previaGlobal: f.previa_global,
  hashEntrada: f.hash_entrada,
});

export function createCasesRepo(db: Db, firmador: Firmador) {
  const ultimoOwner = db.prepare("SELECT hash_entrada FROM cases WHERE owner_hash = ? ORDER BY seq DESC LIMIT 1");
  const ultimoGlobal = db.prepare("SELECT hash_entrada FROM cases ORDER BY seq DESC LIMIT 1");
  const insertar = db.prepare(
    `INSERT INTO cases (id, owner_hash, creado_en, huella_evidencia, tipo_evidencia, veredicto_json, consent_id,
                        previa_owner, previa_global, hash_entrada, firma, clave_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const SELECT = "SELECT id, creado_en, huella_evidencia, tipo_evidencia, veredicto_json, previa_owner, previa_global, hash_entrada, firma, clave_id FROM cases";
  const porOwner = db.prepare(`${SELECT} WHERE owner_hash = ? ORDER BY seq ASC`);
  const todos = db.prepare(`${SELECT} ORDER BY seq ASC`);
  const porId = db.prepare(`${SELECT} WHERE id = ?`);
  const porHuella = db.prepare(`${SELECT} WHERE owner_hash = ? AND huella_evidencia = ? ORDER BY seq DESC LIMIT 1`);
  const hashesOwner = db.prepare("SELECT hash_entrada FROM cases WHERE owner_hash = ?");
  const borrarOwner = db.prepare("DELETE FROM cases WHERE owner_hash = ?");
  const registrarBorrado = db.prepare("INSERT OR IGNORE INTO deleted_ranges (hash_entrada, borrado_en) VALUES (?, ?)");
  const borrados = db.prepare("SELECT hash_entrada FROM deleted_ranges");

  const comprobanteDe = (f: Fila): Comprobante => ({
    formato: FORMATO_COMPROBANTE,
    caso: filaACaso(f),
    firma: f.firma,
    claveId: f.clave_id,
    clavePublicaPem: firmador.publicPem,
  });

  return {
    async crear(args: {
      ownerHash: string;
      huellaEvidencia: string;
      tipoEvidencia: EvidenciaTipo;
      veredicto: Veredicto;
      consentId?: string;
    }): Promise<Comprobante> {
      // El hash se calcula fuera de la transacción (WebCrypto es asíncrono); la cadena se relee dentro.
      for (let intento = 0; intento < 3; intento++) {
        const previaOwner = (ultimoOwner.get(args.ownerHash) as { hash_entrada: string } | undefined)?.hash_entrada ?? "INICIO";
        const previaGlobal = (ultimoGlobal.get() as { hash_entrada: string } | undefined)?.hash_entrada ?? "INICIO";
        const base = {
          id: nuevoIdCaso(),
          creadoEn: new Date().toISOString(),
          huellaEvidencia: args.huellaEvidencia,
          tipoEvidencia: args.tipoEvidencia,
          veredicto: args.veredicto,
          previaOwner,
          previaGlobal,
        };
        const hashEntrada = await sha256Hex(canonical(base));
        const firma = firmador.firmar(hashEntrada);
        const insertado = transaction(db, () => {
          const po = (ultimoOwner.get(args.ownerHash) as { hash_entrada: string } | undefined)?.hash_entrada ?? "INICIO";
          const pg = (ultimoGlobal.get() as { hash_entrada: string } | undefined)?.hash_entrada ?? "INICIO";
          if (po !== previaOwner || pg !== previaGlobal) return false; // otro caso entró en medio: reintentar
          insertar.run(
            base.id, args.ownerHash, base.creadoEn, base.huellaEvidencia, base.tipoEvidencia, JSON.stringify(base.veredicto),
            args.consentId ?? null, previaOwner, previaGlobal, hashEntrada, firma, firmador.claveId,
          );
          return true;
        });
        if (insertado) {
          return {
            formato: FORMATO_COMPROBANTE,
            caso: { ...base, hashEntrada },
            firma,
            claveId: firmador.claveId,
            clavePublicaPem: firmador.publicPem,
          };
        }
      }
      throw new Error("No se pudo encadenar el caso (concurrencia)");
    },
    listarOwner(ownerHash: string) {
      return (porOwner.all(ownerHash) as unknown as Fila[]).map((f) => ({ caso: filaACaso(f), firma: f.firma }));
    },
    listarTodos() {
      return (todos.all() as unknown as Fila[]).map((f) => ({ caso: filaACaso(f), firma: f.firma }));
    },
    comprobante(id: string): Comprobante | undefined {
      const f = porId.get(id) as Fila | undefined;
      return f ? comprobanteDe(f) : undefined;
    },
    hashDe(id: string): string | undefined {
      return (porId.get(id) as Fila | undefined)?.hash_entrada;
    },
    buscarPorHuella(ownerHash: string, huella: string): Caso | undefined {
      const f = porHuella.get(ownerHash, huella) as Fila | undefined;
      return f ? filaACaso(f) : undefined;
    },
    borrarHistorial(ownerHash: string): number {
      return transaction(db, () => {
        const ahora = new Date().toISOString();
        for (const { hash_entrada } of hashesOwner.all(ownerHash) as { hash_entrada: string }[]) {
          registrarBorrado.run(hash_entrada, ahora);
        }
        return Number(borrarOwner.run(ownerHash).changes);
      });
    },
    hashesBorrados(): Set<string> {
      return new Set((borrados.all() as { hash_entrada: string }[]).map((r) => r.hash_entrada));
    },
  };
}

export type CasesRepo = ReturnType<typeof createCasesRepo>;
