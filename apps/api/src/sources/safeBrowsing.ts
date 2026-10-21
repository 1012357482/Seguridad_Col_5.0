import { createHash } from "node:crypto";
import { FuenteNoDisponible, type ResultadoParcial } from "./runSource";

/* Google Safe Browsing v5 por prefijos de hash (hashes.search): la URL nunca se envía en claro
   (Constitución §I). Uso no comercial; atribución "Aviso proporcionado por Google" requerida. */

const AMENAZAS: Record<string, string> = {
  SOCIAL_ENGINEERING: "sitio de engaño (phishing)",
  MALWARE: "sitio con software malicioso",
  UNWANTED_SOFTWARE: "sitio con software no deseado",
  POTENTIALLY_HARMFUL_APPLICATION: "aplicación potencialmente dañina",
};

/** Expresiones host/ruta según la especificación de Safe Browsing (sin query por privacidad). */
export function expresionesUrl(url: string): string[] {
  const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
  const host = u.hostname.toLowerCase().replace(/\.+$/, "");
  const esIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  const hosts = [host];
  if (!esIp) {
    const partes = host.split(".");
    const ultimos = partes.slice(-5);
    for (let i = 1; i < ultimos.length - 1 && hosts.length < 5; i++) {
      const h = ultimos.slice(i).join(".");
      if (!hosts.includes(h)) hosts.push(h);
    }
  }

  const ruta = u.pathname || "/";
  const paths = [ruta, "/"];
  const segmentos = ruta.split("/").filter(Boolean);
  let acumulado = "/";
  for (const s of segmentos.slice(0, 3)) {
    acumulado += `${s}/`;
    if (!paths.includes(acumulado)) paths.push(acumulado);
  }
  const unicos = [...new Set(paths)].slice(0, 6);
  return hosts.flatMap((h) => unicos.map((p) => `${h}${p}`));
}

export async function consultarSafeBrowsing(url: string, apiKey: string | undefined, signal: AbortSignal): Promise<ResultadoParcial> {
  if (!apiKey) throw new FuenteNoDisponible("Google Safe Browsing no está configurado.");
  const completos = expresionesUrl(url).map((e) => createHash("sha256").update(e).digest());
  const prefijos = [...new Set(completos.map((h) => h.subarray(0, 4).toString("base64")))];

  const qs = new URLSearchParams({ key: apiKey });
  for (const p of prefijos) qs.append("hashPrefixes", p);
  const res = await fetch(`https://safebrowsing.googleapis.com/v5/hashes:search?${qs}`, { signal });
  if (!res.ok) throw new FuenteNoDisponible(`Google Safe Browsing respondió ${res.status}.`);
  const data = (await res.json()) as {
    fullHashes?: { fullHash: string; fullHashDetails?: { threatType?: string }[] }[];
  };

  const nuestros = new Set(completos.map((h) => h.toString("base64")));
  const coincidencia = (data.fullHashes ?? []).find((f) => nuestros.has(f.fullHash));
  if (coincidencia) {
    const tipo = coincidencia.fullHashDetails?.[0]?.threatType ?? "SOCIAL_ENGINEERING";
    return {
      resultado: "coincide",
      detalle: `Google Safe Browsing lo identifica como ${AMENAZAS[tipo] ?? "sitio peligroso"}. Aviso proporcionado por Google.`,
    };
  }
  return { resultado: "limpio", detalle: "No aparece en las listas de Google Safe Browsing. Aviso proporcionado por Google." };
}
