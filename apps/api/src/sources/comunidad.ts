import type { ReportsRepo, TipoIndicador } from "../db/reportsRepo";
import { UMBRAL_REPORTANTES, VENTANA_HORAS } from "../db/reportsRepo";
import type { ResultadoParcial } from "./runSource";

export function consultarComunidad(repo: ReportsRepo, indicador: string, tipo: TipoIndicador): ResultadoParcial {
  const { reportantes, activo } = repo.contar(indicador, tipo);
  if (activo) {
    return {
      resultado: "coincide",
      detalle: `Reportado por ${reportantes} personas distintas en las últimas ${VENTANA_HORAS} horas.`,
    };
  }
  if (reportantes > 0) {
    return {
      resultado: "sin_datos",
      detalle: `${reportantes} reporte(s) reciente(s); se muestra como señal desde ${UMBRAL_REPORTANTES} personas distintas.`,
    };
  }
  return { resultado: "limpio", detalle: "Sin reportes recientes de la comunidad." };
}
