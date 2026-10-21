import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { requireOwner } from "../plugins/clientId";

const Body = z.object({
  indicador: z.string().trim().min(3).max(253),
  tipo: z.enum(["dominio", "numero"]),
  modalidad: z.string().max(40).optional(),
  entidad: z.string().max(80).optional(),
});

export function registerReportes(app: FastifyInstance, deps: AppDeps) {
  app.post("/api/reportes", async (req, reply) => {
    const owner = requireOwner(req);
    const body = Body.parse(req.body);
    const nuevo = deps.reports.reportar({ ...body, reporterHash: owner });
    const conteo = deps.reports.contar(body.indicador, body.tipo);
    return reply.code(nuevo ? 201 : 200).send({ nuevo, ...conteo });
  });
}
