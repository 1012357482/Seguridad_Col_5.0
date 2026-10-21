import { normalizarNumero, verificarCanal } from "@itf/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { revisarRemitente } from "../agent/planner";
import type { AppDeps } from "../deps";

const Body = z.object({ valor: z.string().trim().min(2).max(100) });

export function registerEntidades(app: FastifyInstance, deps: AppDeps) {
  app.post("/api/entidades/verificar", async (req) => {
    const { valor } = Body.parse(req.body);
    const canal = verificarCanal(valor);
    const fuentes = await Promise.all(revisarRemitente(valor, { config: deps.config, reports: deps.reports }));
    const tipo = /\d{5,}/.test(valor.replace(/\D/g, "")) ? "numero" : "dominio";
    const { reportantes } = deps.reports.contar(tipo === "numero" ? normalizarNumero(valor) : valor, tipo);
    return {
      resultado: canal.resultado,
      entidad: canal.entidad?.nombre,
      reportesComunidad: reportantes,
      fuentes,
    };
  });
}
