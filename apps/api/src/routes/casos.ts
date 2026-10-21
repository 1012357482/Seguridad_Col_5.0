import { EvidenciaTipo, Veredicto } from "@itf/core";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../deps";
import { HttpProblem } from "../errors";
import { requireOwner } from "../plugins/clientId";
import { verificarCadena, verificarComprobante } from "../registry/verify";

const Crear = z.object({
  huellaEvidencia: z.string().regex(/^[a-f0-9]{64}$/),
  tipoEvidencia: EvidenciaTipo,
  veredicto: Veredicto,
  consentId: z.string().uuid().optional(),
});

const Huella = z.object({ huella: z.string().regex(/^[a-f0-9]{64}$/) });

export function registerCasos(app: FastifyInstance, deps: AppDeps) {
  app.post("/api/casos", async (req, reply) => {
    const owner = requireOwner(req);
    const body = Crear.parse(req.body);
    if (body.veredicto.ia.estado === "usada" && (!body.consentId || !deps.consents.existe(body.consentId, owner))) {
      throw new HttpProblem(400, "Falta el consentimiento", "Un caso analizado con IA debe referenciar el consentimiento de ese análisis.");
    }
    const comprobante = await deps.cases.crear({ ownerHash: owner, ...body });
    return reply.code(201).send(comprobante);
  });

  app.get("/api/casos", async (req) => {
    const owner = requireOwner(req);
    const filas = deps.cases.listarOwner(owner);
    const cadena = await verificarCadena(filas, deps.firmador.publicPem, "previaOwner", deps.cases.hashesBorrados());
    return { casos: filas.map((f) => f.caso).reverse(), cadena };
  });

  app.delete("/api/casos", async (req, reply) => {
    const owner = requireOwner(req);
    deps.cases.borrarHistorial(owner);
    return reply.code(204).send();
  });

  app.get("/api/casos/cadena-global", async () => {
    const filas = deps.cases.listarTodos();
    return verificarCadena(filas, deps.firmador.publicPem, "previaGlobal", deps.cases.hashesBorrados());
  });

  app.get<{ Params: { id: string } }>("/api/casos/:id", async (req) => {
    const c = deps.cases.comprobante(req.params.id.toUpperCase());
    if (!c) {
      throw new HttpProblem(404, "Caso no encontrado", "No existe o se perdió en una actualización del servicio (versión de prueba). Usa tu comprobante descargado.");
    }
    return c;
  });

  app.post("/api/casos/comprobar", async (req) => {
    const owner = requireOwner(req);
    const { huella } = Huella.parse(req.body);
    const caso = deps.cases.buscarPorHuella(owner, huella);
    return caso ? { coincide: true, casoId: caso.id, creadoEn: caso.creadoEn, nivel: caso.veredicto.nivel } : { coincide: false };
  });

  app.post("/api/comprobantes/verificar", async (req) => verificarComprobante(req.body, (id) => deps.cases.hashDe(id)));

  app.get("/api/clave-publica", async () => ({
    claveId: deps.firmador.claveId,
    pem: deps.firmador.publicPem,
    efimera: deps.firmador.efimera,
  }));
}
