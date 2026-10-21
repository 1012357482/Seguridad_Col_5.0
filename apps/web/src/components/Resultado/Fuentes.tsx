import type { SourceCheck } from "@itf/core";
import { useState } from "react";
import { api } from "../../services/apiClient";
import { NOMBRE_FUENTE, horaBogota } from "../../textos";

const ICONO: Record<SourceCheck["resultado"], string> = { coincide: "⛔", senal: "⚠️", limpio: "✓", sin_datos: "–" };

/* Fuentes abiertas consultadas, con estado y hora (FR-005, FR-012). Los indicadores se muestran
   como texto plano: nunca como enlaces que se puedan abrir (FR-011). */
export function Fuentes({ fuentes, modalidad, entidad }: { fuentes: SourceCheck[]; modalidad: string; entidad?: string }) {
  const [reportados, setReportados] = useState<Record<string, string>>({});
  if (!fuentes.length) return null;

  const indicadores = [...new Map(fuentes.filter((f) => f.fuente !== "rdap").map((f) => [f.indicador, f])).keys()];
  const noDisponibles = fuentes.filter((f) => f.estado !== "ok");

  async function reportar(indicador: string) {
    const tipo = /^\+?\d[\d\s]{4,}$/.test(indicador) ? "numero" : "dominio";
    try {
      const r = await api<{ nuevo: boolean; reportantes: number }>("/api/reportes", { body: { indicador, tipo, modalidad, entidad } });
      setReportados((s) => ({ ...s, [indicador]: r.nuevo ? `Reportado. ${r.reportantes} persona(s) lo han reportado.` : "Ya lo habías reportado." }));
    } catch {
      setReportados((s) => ({ ...s, [indicador]: "No se pudo reportar ahora." }));
    }
  }

  return (
    <section className="tarjeta" aria-labelledby="titulo-fuentes">
      <h3 id="titulo-fuentes">Fuentes abiertas consultadas</h3>
      <ul className="lista-limpia">
        {fuentes.map((f, i) => (
          <li className="fila" key={`${f.fuente}-${f.indicador}-${i}`}>
            <span>
              <span aria-hidden="true">{f.estado === "ok" ? ICONO[f.resultado] : "⏳"}</span> <strong>{NOMBRE_FUENTE[f.fuente]}</strong>
              <span className="mono" style={{ display: "block" }}>{f.indicador}</span>
              <span className="ayuda">{f.detalle}</span>
            </span>
            <span className="chip" title="Hora de consulta (Colombia)">{horaBogota(f.consultadoEn)}</span>
          </li>
        ))}
      </ul>
      {noDisponibles.length > 0 && (
        <p className="aviso">
          No se pudo consultar: {[...new Set(noDisponibles.map((f) => NOMBRE_FUENTE[f.fuente]))].join(", ")}. El análisis siguió con las demás fuentes.
        </p>
      )}
      <h3 style={{ marginTop: 14 }}>¿Te llegó a ti? Repórtalo</h3>
      <p className="ayuda" style={{ marginTop: 0 }}>Solo se guarda el dominio o el número. Se muestra como alerta cuando 5 personas distintas lo reportan en 72 horas.</p>
      {indicadores.map((ind) => (
        <div className="fila" key={ind}>
          <span className="mono">{ind}</span>
          {reportados[ind] ? (
            <span className="ayuda">{reportados[ind]}</span>
          ) : (
            <button type="button" className="btn pequeno secundario" onClick={() => reportar(ind)}>
              Reportar
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
