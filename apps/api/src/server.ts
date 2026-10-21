import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import { existsSync } from "node:fs";
import { ZodError } from "zod";
import { createAiProvider } from "./ai/factory";
import type { AiProvider } from "./ai/types";
import { corsOrigins, type Config } from "./config";
import { createCasesRepo } from "./db/casesRepo";
import { createConsentsRepo } from "./db/consentsRepo";
import { openDb } from "./db/index";
import { createReportsRepo } from "./db/reportsRepo";
import type { AppDeps } from "./deps";
import { HttpProblem } from "./errors";
import { clientIdPlugin } from "./plugins/clientId";
import { crearFirmador } from "./registry/keys";
import { registerAnalisis } from "./routes/analisis";
import { registerCasos } from "./routes/casos";
import { registerConsentimientos } from "./routes/consentimientos";
import { registerEntidades } from "./routes/entidades";
import { registerEstadisticas } from "./routes/estadisticas";
import { registerReportes } from "./routes/reportes";
import { registerSistema } from "./routes/sistema";
import { MAX_AUDIO_BYTES, registerTranscripciones } from "./routes/transcripciones";

declare module "fastify" {
  interface FastifyInstance {
    deps: AppDeps;
  }
}

export interface BuildOptions {
  config: Config;
  /** Permite inyectar un proveedor en pruebas. */
  ai?: AiProvider | null;
  logger?: boolean;
}

export function crearDeps(config: Config, ai?: AiProvider | null): AppDeps {
  const db = openDb(config.DB_PATH);
  const firmador = crearFirmador(config.CASE_SIGNING_KEY);
  return {
    config,
    db,
    ai: ai === undefined ? createAiProvider(config) : ai,
    consents: createConsentsRepo(db),
    cases: createCasesRepo(db, firmador),
    reports: createReportsRepo(db),
    firmador,
  };
}

export async function buildServer(opts: BuildOptions) {
  const { config } = opts;
  const deps = crearDeps(config, opts.ai);

  const app = Fastify({
    bodyLimit: 256 * 1024,
    trustProxy: true,
    logger:
      opts.logger === false
        ? false
        : {
            level: config.NODE_ENV === "test" ? "warn" : "info",
            // Nunca registrar el identificador del dispositivo ni cuerpos de petición (Constitución §I).
            redact: ['req.headers["x-client-id"]', "req.body"],
          },
  });

  app.decorate("deps", deps);
  if (deps.firmador.efimera) app.log.warn("CASE_SIGNING_KEY no definida: se usa una clave efímera (solo desarrollo).");

  await app.register(helmet, {
    // CSP pensada para servir también la PWA (ECharts en canvas, Tesseract desde jsDelivr con WASM y workers).
    contentSecurityPolicy: config.SERVE_WEB
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'wasm-unsafe-eval'", "https://cdn.jsdelivr.net", "blob:"],
            workerSrc: ["'self'", "blob:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://tessdata.projectnaptha.com", "blob:", "data:"],
            imgSrc: ["'self'", "data:", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: corsOrigins(config),
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["content-type", "x-client-id"],
    maxAge: 86400,
  });
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_GLOBAL,
    timeWindow: "10 minutes",
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      title: "Demasiadas solicitudes",
      detail: `Alcanzaste el límite de uso. Intenta de nuevo en ${Math.ceil(ctx.ttl / 60000)} minuto(s).`,
    }),
  });
  await app.register(multipart, { limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 4 } });
  await app.register(clientIdPlugin, { salt: config.OWNER_SALT });

  app.setErrorHandler((err: FastifyError | HttpProblem | ZodError, req, reply) => {
    let status = 500;
    let title = "Error interno";
    let detail: string | undefined = "Ocurrió un problema inesperado. Intenta de nuevo.";
    if (err instanceof HttpProblem) {
      ({ status, title, detail } = err);
    } else if (err instanceof ZodError) {
      status = 400;
      title = "Solicitud inválida";
      detail = err.issues.map((i) => `${i.path.join(".") || "cuerpo"}: ${i.message}`).join("; ");
    } else if ((err as FastifyError).statusCode && (err as FastifyError).statusCode! < 500) {
      status = (err as FastifyError).statusCode!;
      const e = err as FastifyError & { title?: string; detail?: string };
      title = e.title ?? (status === 413 ? "Archivo demasiado grande" : "Solicitud inválida");
      detail = e.detail ?? (status === 413 ? "El audio supera 25 MB." : e.message);
    } else {
      req.log.error({ err }, "error no controlado");
    }
    reply.code(status).type("application/problem+json").send({ title, detail, status });
  });

  registerSistema(app, deps);
  registerConsentimientos(app, deps);
  registerAnalisis(app, deps);
  registerTranscripciones(app, deps);
  registerEntidades(app, deps);
  registerReportes(app, deps);
  registerCasos(app, deps);
  registerEstadisticas(app, deps);

  if (config.SERVE_WEB && existsSync(config.WEB_DIST)) {
    await app.register(fastifyStatic, { root: config.WEB_DIST, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) return reply.sendFile("index.html");
      reply.code(404).type("application/problem+json").send({ title: "No encontrado", status: 404 });
    });
  }

  app.addHook("onClose", async () => deps.db.close());
  return app;
}
