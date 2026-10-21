import { normalizarNumero } from "@itf/core";
import type { Db } from "./index";

/* Reportes de la comunidad: reemplazan los REPORTES_SIMULADOS del prototipo (FR-010).
   Se guarda solo el dominio o el número, nunca la URL completa. */

export const UMBRAL_REPORTANTES = 5;
export const VENTANA_HORAS = 72;

export type TipoIndicador = "dominio" | "numero";

export function normalizarIndicador(valor: string, tipo: TipoIndicador): string {
  if (tipo === "numero") return normalizarNumero(valor);
  let v = valor.trim().toLowerCase();
  try {
    v = new URL(/^https?:\/\//.test(v) ? v : `http://${v}`).hostname;
  } catch {
    /* se deja tal cual */
  }
  return v.replace(/^www\./, "").replace(/\.+$/, "");
}

export function createReportsRepo(db: Db) {
  const insertar = db.prepare(
    `INSERT OR IGNORE INTO community_reports (indicador, tipo, reporter_hash, modalidad, entidad, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const contarStmt = db.prepare(
    `SELECT COUNT(DISTINCT reporter_hash) AS n FROM community_reports WHERE indicador = ? AND creado_en >= ?`,
  );

  return {
    /** true si es un reporte nuevo; false si esa persona ya lo había reportado. */
    reportar(args: { indicador: string; tipo: TipoIndicador; reporterHash: string; modalidad?: string; entidad?: string }): boolean {
      const r = insertar.run(
        normalizarIndicador(args.indicador, args.tipo),
        args.tipo,
        args.reporterHash,
        args.modalidad ?? null,
        args.entidad ?? null,
        new Date().toISOString(),
      );
      return Number(r.changes) > 0;
    },
    contar(indicador: string, tipo: TipoIndicador, ahora = Date.now()) {
      const desde = new Date(ahora - VENTANA_HORAS * 3_600_000).toISOString();
      const { n } = contarStmt.get(normalizarIndicador(indicador, tipo), desde) as { n: number };
      return { reportantes: Number(n), activo: Number(n) >= UMBRAL_REPORTANTES };
    },
  };
}

export type ReportsRepo = ReturnType<typeof createReportsRepo>;
