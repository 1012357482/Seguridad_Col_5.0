import { dominioRegistrable, redactPII, type SourceCheck } from "@itf/core";
import { z } from "zod";
import type { ToolDef } from "../ai/types";
import { consultarComunidad } from "../sources/comunidad";
import { consultarRdap } from "../sources/rdap";
import { runSource } from "../sources/runSource";
import { revisarRemitente, revisarUrl, type FuentesDeps } from "./planner";

/* Herramientas de SOLO LECTURA que el agente puede invocar de forma autónoma (FR-009). */

export const HERRAMIENTAS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "consultar_reputacion_url",
      description: "Consulta listas públicas de phishing/malware (Google Safe Browsing, URLhaus) y reportes de la comunidad para un enlace.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_antiguedad_dominio",
      description: "Consulta en el registro público de dominios (RDAP) cuándo se creó un dominio.",
      parameters: { type: "object", properties: { dominio: { type: "string" } }, required: ["dominio"] },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_canal_entidad",
      description: "Compara un remitente o número con los canales oficiales publicados por entidades y con reportes de la comunidad.",
      parameters: { type: "object", properties: { valor: { type: "string" } }, required: ["valor"] },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_reportes_comunidad",
      description: "Cuenta cuántas personas distintas reportaron un dominio o número en las últimas 72 horas.",
      parameters: {
        type: "object",
        properties: { indicador: { type: "string" }, tipo: { type: "string", enum: ["dominio", "numero"] } },
        required: ["indicador", "tipo"],
      },
    },
  },
];

const Args = {
  consultar_reputacion_url: z.object({ url: z.string().min(3).max(500) }),
  consultar_antiguedad_dominio: z.object({ dominio: z.string().min(3).max(253) }),
  verificar_canal_entidad: z.object({ valor: z.string().min(2).max(100) }),
  consultar_reportes_comunidad: z.object({ indicador: z.string().min(2).max(253), tipo: z.enum(["dominio", "numero"]) }),
};

export async function ejecutarHerramienta(nombre: string, argumentos: string, deps: FuentesDeps): Promise<SourceCheck[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(argumentos || "{}");
  } catch {
    return [];
  }
  const t = deps.config.SOURCE_TIMEOUT_MS;
  switch (nombre) {
    case "consultar_reputacion_url": {
      const a = Args.consultar_reputacion_url.safeParse(raw);
      // La URL viene del modelo: se vuelven a ocultar parámetros por privacidad.
      return a.success ? Promise.all(revisarUrl(redactPII(a.data.url).texto, deps)) : [];
    }
    case "consultar_antiguedad_dominio": {
      const a = Args.consultar_antiguedad_dominio.safeParse(raw);
      if (!a.success) return [];
      const d = dominioRegistrable(a.data.dominio.toLowerCase());
      return [await runSource("rdap", d, (s) => consultarRdap(d, s), t)];
    }
    case "verificar_canal_entidad": {
      const a = Args.verificar_canal_entidad.safeParse(raw);
      return a.success ? Promise.all(revisarRemitente(a.data.valor, deps)) : [];
    }
    case "consultar_reportes_comunidad": {
      const a = Args.consultar_reportes_comunidad.safeParse(raw);
      if (!a.success) return [];
      const { indicador, tipo } = a.data;
      return [await runSource("comunidad", indicador, async () => consultarComunidad(deps.reports, indicador, tipo), t)];
    }
    default:
      return [];
  }
}
