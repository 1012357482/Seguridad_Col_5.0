import { FuenteNoDisponible, type ResultadoParcial } from "./runSource";

/* Antigüedad del dominio vía RDAP público (rdap.org redirige al registro autoritativo). */
export const DIAS_DOMINIO_NUEVO = 30;

export function describirAntiguedad(dias: number): string {
  if (dias < 1) return "hoy";
  if (dias < 60) return `hace ${dias} día${dias === 1 ? "" : "s"}`;
  if (dias < 730) return `hace ${Math.round(dias / 30)} meses`;
  return `hace ${Math.floor(dias / 365)} años`;
}

export async function consultarRdap(dominio: string, signal: AbortSignal, ahora = Date.now()): Promise<ResultadoParcial> {
  const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(dominio)}`, {
    headers: { accept: "application/rdap+json" },
    redirect: "follow",
    signal,
  });
  if (res.status === 404) return { resultado: "sin_datos", detalle: "El registro de dominios no tiene datos de este dominio." };
  if (!res.ok) throw new FuenteNoDisponible(`RDAP respondió ${res.status}.`);
  const data = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
  const registro = data.events?.find((e) => e.eventAction === "registration")?.eventDate;
  if (!registro) return { resultado: "sin_datos", detalle: "El registro no publica la fecha de creación del dominio." };
  const dias = Math.floor((ahora - Date.parse(registro)) / 86_400_000);
  if (dias < DIAS_DOMINIO_NUEVO) {
    return {
      resultado: "senal",
      detalle: `El dominio se registró ${describirAntiguedad(dias)}: los sitios falsos suelen ser muy recientes.`,
    };
  }
  return { resultado: "limpio", detalle: `El dominio se registró ${describirAntiguedad(dias)}.` };
}
