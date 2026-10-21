import { useEffect, useRef, useState } from "react";
import { useOnline } from "../../hooks/useOnline";
import { api, ApiError } from "../../services/apiClient";
import { cargarConfig } from "../../services/config";
import type { AlcanceConsentimiento } from "../ConsentDialog";

const MAX_BYTES = 25 * 1024 * 1024;

interface Props {
  onTranscripcion: (texto: string) => void;
  pedirConsentimiento: (alcance: AlcanceConsentimiento, ocultos: number) => Promise<boolean>;
  audioInicial?: File;
}

/** Envía un audio a transcribir con consentimiento. El audio no se guarda (FR-001b). */
export async function transcribirAudio(
  archivo: File,
  pedirConsentimiento: Props["pedirConsentimiento"],
): Promise<{ texto: string; truncado: boolean } | { error: string }> {
  if (archivo.size > MAX_BYTES) return { error: "El audio supera 25 MB. Usa uno más corto o cuéntanos qué te dijeron en 'Me llamaron'." };
  if (!(await pedirConsentimiento("transcripcion", 0))) return { error: "No se envió el audio. Puedes escribir lo que escuchaste." };
  try {
    const config = await cargarConfig();
    const { consentId } = await api<{ consentId: string }>("/api/consentimientos", {
      body: { alcance: "transcripcion", textoVersion: config?.textoConsentimientoVersion ?? "desconocida" },
    });
    const form = new FormData();
    form.append("consentId", consentId);
    form.append("audio", archivo, archivo.name || "audio");
    const r = await api<{ texto: string; truncado: boolean }>("/api/transcripciones", { form, timeoutMs: 90_000 });
    return { texto: r.texto, truncado: r.truncado };
  } catch (e) {
    return { error: e instanceof ApiError ? (e.detalle ?? e.titulo) : "No pudimos transcribir el audio." };
  }
}

export function AudioInput({ onTranscripcion, pedirConsentimiento, audioInicial }: Props) {
  const enLinea = useOnline();
  const [estado, setEstado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const procesado = useRef<File | null>(null);

  async function procesar(archivo: File) {
    setOcupado(true);
    setEstado("Transcribiendo el audio…");
    const r = await transcribirAudio(archivo, pedirConsentimiento);
    setOcupado(false);
    if ("error" in r) return setEstado(r.error);
    onTranscripcion(r.texto);
    setEstado(
      r.truncado
        ? "Audio transcrito (era largo: se analizará solo una parte). Revisa el texto antes de analizar."
        : "Audio transcrito. Revisa y corrige el texto antes de analizar.",
    );
  }

  useEffect(() => {
    if (audioInicial && procesado.current !== audioInicial) {
      procesado.current = audioInicial;
      void procesar(audioInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioInicial]);

  return (
    <>
      <label className="btn secundario" style={{ cursor: ocupado ? "progress" : "pointer", opacity: enLinea ? 1 : 0.6 }}>
        🎙️ Subir audio
        <input
          type="file"
          accept="audio/*,.ogg,.opus,.m4a,.mp3"
          className="sr-only"
          disabled={!enLinea || ocupado}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void procesar(f);
          }}
        />
      </label>
      {estado && (
        <p className="ayuda" role="status" aria-live="polite" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {ocupado && <span className="cargando" aria-hidden="true" />} {estado}
        </p>
      )}
    </>
  );
}
