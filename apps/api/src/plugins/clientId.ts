import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { HttpProblem } from "../errors";

/* Identificador anónimo del dispositivo (UUID v4 en la cabecera X-Client-Id).
   El servidor solo conserva SHA-256(uuid + sal): no hay cuentas ni datos personales. */

declare module "fastify" {
  interface FastifyRequest {
    ownerHash: string | null;
  }
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const hashOwner = (clientId: string, salt: string) =>
  createHash("sha256").update(`${clientId.toLowerCase()}:${salt}`).digest("hex");

export const clientIdPlugin = fp(async (app: FastifyInstance, opts: { salt: string }) => {
  app.decorateRequest("ownerHash", null);
  app.addHook("onRequest", async (req) => {
    const raw = req.headers["x-client-id"];
    const id = Array.isArray(raw) ? raw[0] : raw;
    req.ownerHash = id && UUID_V4.test(id) ? hashOwner(id, opts.salt) : null;
  });
});

export function requireOwner(req: FastifyRequest): string {
  if (!req.ownerHash) {
    throw new HttpProblem(400, "Identificador de dispositivo inválido", "Falta la cabecera X-Client-Id con un UUID v4.");
  }
  return req.ownerHash;
}
