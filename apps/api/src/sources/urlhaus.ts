import { FuenteNoDisponible, type ResultadoParcial } from "./runSource";

/* URLhaus (abuse.ch): hosts que distribuyen malware. Solo se envía el dominio. */
export async function consultarUrlhaus(host: string, authKey: string | undefined, signal: AbortSignal): Promise<ResultadoParcial> {
  if (!authKey) throw new FuenteNoDisponible("URLhaus no está configurado.");
  const res = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
    method: "POST",
    headers: { "Auth-Key": authKey, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ host }),
    signal,
  });
  if (!res.ok) throw new FuenteNoDisponible(`URLhaus respondió ${res.status}.`);
  const data = (await res.json()) as { query_status: string; url_count?: string | number; urls_online?: string | number };
  if (data.query_status === "ok") {
    const n = Number(data.url_count ?? 0);
    return {
      resultado: "coincide",
      detalle: `URLhaus registra ${n || "varias"} dirección(es) maliciosa(s) en este dominio.`,
    };
  }
  if (data.query_status === "no_results") return { resultado: "limpio", detalle: "Sin registros de malware en URLhaus." };
  throw new FuenteNoDisponible(`URLhaus: ${data.query_status}.`);
}
