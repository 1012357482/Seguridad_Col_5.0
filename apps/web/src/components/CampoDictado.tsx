import { useRef, useState } from "react";
import { useOnline } from "../hooks/useOnline";
import { grabarAudio, hayDictadoNativo, hayGrabacion, iniciarDictado, type SesionDictado } from "../services/speech";
import type { AlcanceConsentimiento } from "./ConsentDialog";
import { transcribirAudio } from "./EvidenceInput/AudioInput";

interface Props {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  multilinea?: boolean;
  placeholder?: string;
  pedirConsentimiento: (alcance: AlcanceConsentimiento, ocultos: number) => Promise<boolean>;
}

/* Campo de texto con botón de dictado (Web Speech o grabación + transcripción con consentimiento). */
export function CampoDictado({ id, etiqueta, valor, onCambio, multilinea, placeholder, pedirConsentimiento }: Props) {
  const enLinea = useOnline();
  const [activo, setActivo] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const sesion = useRef<SesionDictado | null>(null);
  const grabacion = useRef<{ detener: () => Promise<File> } | null>(null);
  const valorRef = useRef(valor);
  valorRef.current = valor;

  const nativo = hayDictadoNativo();
  const disponible = nativo || (hayGrabacion() && enLinea);

  async function alternar() {
    if (activo) {
      setActivo(false);
      if (sesion.current) {
        sesion.current.detener();
        sesion.current = null;
      }
      if (grabacion.current) {
        const archivo = await grabacion.current.detener();
        grabacion.current = null;
        setEstado("Transcribiendo…");
        const r = await transcribirAudio(archivo, pedirConsentimiento);
        if ("error" in r) setEstado(r.error);
        else {
          onCambio(`${valorRef.current} ${r.texto}`.trim());
          setEstado(null);
        }
      }
      return;
    }
    setEstado(null);
    if (nativo) {
      sesion.current = iniciarDictado(
        (t) => onCambio(`${valorRef.current} ${t}`.trim()),
        (error) => {
          setActivo(false);
          if (error && error !== "aborted" && error !== "no-speech") setEstado("No se pudo usar el micrófono. Escribe el texto.");
        },
      );
      setActivo(true);
    } else {
      try {
        grabacion.current = await grabarAudio();
        setActivo(true);
        setEstado("Grabando… toca de nuevo para terminar.");
      } catch {
        setEstado("No se pudo usar el micrófono. Escribe el texto.");
      }
    }
  }

  const props = {
    id,
    value: valor,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onCambio(e.target.value),
  };

  return (
    <div>
      <label className="campo" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="con-dictado">
        {multilinea ? <textarea {...props} maxLength={2000} /> : <input type="text" {...props} maxLength={200} style={{ paddingRight: 96 }} />}
        {disponible && (
          <button type="button" className={`btn-dictado ${activo ? "activo" : ""}`} onClick={alternar} aria-pressed={activo} aria-label={activo ? "Detener dictado" : `Dictar: ${etiqueta}`}>
            {activo ? "⏹ Detener" : "🎤 Dictar"}
          </button>
        )}
      </div>
      {estado && (
        <p className="ayuda" role="status">
          {estado}
        </p>
      )}
    </div>
  );
}
