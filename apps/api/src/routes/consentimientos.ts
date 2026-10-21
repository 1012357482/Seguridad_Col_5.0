import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { requireOwner } from "../plugins/clientId";

const Body = z.object({
  alcance: z.enum(["analisis_ia", "transcripcion"]),
  textoVersion: z.string().min(1).max(40),
});

export function registerConsentimientos(app: FastifyInstance, deps: AppDeps) {
  app.post("/api/consentimientos", async (req, reply) => {
    const owner = requireOwner(req);
    const body = Body.parse(req.body);
    const consentId = deps.consents.crear(owner, body.alcance, deps.ai?.id ?? "none", body.textoVersion);
    return reply.code(201).send({ consentId });
  });
}
