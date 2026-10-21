/* Dictado: Web Speech API cuando existe (Chrome/Android, Safari); si no, grabación con
   MediaRecorder y transcripción en el servidor (con consentimiento). */

interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type Constructor = new () => ReconocimientoVoz;

const constructorVoz = (): Constructor | undefined => {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const hayDictadoNativo = () => typeof window !== "undefined" && !!constructorVoz();
export const hayGrabacion = () => typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;

export interface SesionDictado {
  detener(): void;
}

/** Dictado nativo: devuelve el texto final por partes. */
export function iniciarDictado(onTexto: (t: string) => void, onFin: (error?: string) => void): SesionDictado {
  const C = constructorVoz();
  if (!C) {
    onFin("no_soportado");
    return { detener() {} };
  }
  const r = new C();
  r.lang = "es-CO";
  r.interimResults = false;
  r.continuous = true;
  r.onresult = (e) => {
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) onTexto(res[0].transcript);
    }
  };
  r.onerror = (e) => onFin(e.error);
  r.onend = () => onFin();
  r.start();
  return { detener: () => r.stop() };
}

/** Grabación de audio para transcribir en el servidor. */
export async function grabarAudio(): Promise<{ detener: () => Promise<File> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const trozos: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
  rec.start();
  return {
    detener: () =>
      new Promise<File>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const mime = rec.mimeType || "audio/webm";
          resolve(new File(trozos, `dictado.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`, { type: mime }));
        };
        rec.stop();
      }),
  };
}
