import type { FastifyInstance } from "fastify";
import type { AppDeps } from "../deps";
import { HttpProblem } from "../errors";
import { requireOwner } from "../plugins/clientId";
import { limiteAnalisis } from "./analisis";

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_SEG = 180;

/* El audio se procesa en memoria y nunca se escribe en disco ni en la base (FR-001b). */
export function registerTranscripciones(app: FastifyInstance, deps: AppDeps) {
  app.post("/api/transcripciones", { config: { rateLimit: limiteAnalisis(deps) } }, async (req) => {
    const owner = requireOwner(req);
    if (!req.isMultipart()) throw new HttpProblem(400, "Formato inválido", "Envía el audio como multipart/form-data.");

    let consentId: string | undefined;
    let audio: { buffer: Buffer; filename: string; mime: string } | undefined;
    for await (const part of req.parts()) {
      if (part.type === "field" && part.fieldname === "consentId") consentId = String(part.value);
      else if (part.type === "file" && part.fieldname === "audio") {
        audio = { buffer: await part.toBuffer(), filename: part.filename || "audio.webm", mime: part.mimetype };
      } else if (part.type === "file") {
        await part.toBuffer();
      }
    }

    if (!consentId || !deps.consents.consumir(consentId, owner, "transcripcion")) {
      throw new HttpProblem(400, "Consentimiento inválido", "Se requiere un consentimiento de transcripción sin usar.");
    }
    if (!audio || !audio.buffer.length) throw new HttpProblem(400, "Falta el audio", "Adjunta un archivo en el campo 'audio'.");
    if (!/^(audio|video)\//.test(audio.mime)) throw new HttpProblem(415, "Tipo no soportado", "El archivo debe ser de audio.");
    if (!deps.ai?.transcribe || !deps.ai.sttModel) {
      throw new HttpProblem(503, "Transcripción no disponible", "Escribe o dicta lo que escuchaste en el flujo 'Me llamaron'.");
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), Math.max(deps.config.AI_TIMEOUT_MS, 30_000));
    try {
      const r = await deps.ai.transcribe(audio.buffer, audio.filename, audio.mime, ac.signal);
      const texto = r.text.trim();
      if (!texto) throw new HttpProblem(422, "No se reconoció voz", "No pudimos entender el audio. Intenta con otro o cuéntanos qué te dijeron.");
      const truncado = r.durationSec > MAX_AUDIO_SEG || texto.length > 5000;
      return { texto: texto.slice(0, 5000), duracionSeg: r.durationSec, truncado };
    } catch (e) {
      if (e instanceof HttpProblem) throw e;
      req.log.warn({ err: (e as Error).message }, "fallo de transcripción");
      throw new HttpProblem(503, "Transcripción no disponible", "El servicio de transcripción no respondió. Intenta de nuevo o escribe el relato.");
    } finally {
      clearTimeout(timer);
    }
  });
}
