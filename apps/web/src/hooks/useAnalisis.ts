import { analyzeLocal, extraerNumeros, redactPII, type EvidenciaTipo, type RelatoLlamada, type Veredicto } from "@itf/core";
import { useCallback, useRef, useState } from "react";
import type { AlcanceConsentimiento } from "../components/ConsentDialog";
import { api, ApiError, estaEnLinea, SinConexionError } from "../services/apiClient";
import { cargarConfig } from "../services/config";
import { leerPermisos } from "../services/permisos";

export interface Evidencia {
  tipo: EvidenciaTipo;
  texto: string;
  relato?: RelatoLlamada;
}

export interface EstadoAnalisis {
  veredicto: Veredicto | null;
  /** true mientras se muestra el veredicto local y se espera el del servidor. */
  provisional: boolean;
  aviso: string | null;
  /** Evidencia original (solo en memoria, para calcular la huella si se guarda el caso). */
  evidencia: Evidencia | null;
  consentId: string | null;
}

type Pedir = (alcance: AlcanceConsentimiento, ocultos: number, vistaPrevia?: string) => Promise<boolean>;

const INICIAL: EstadoAnalisis = { veredicto: null, provisional: false, aviso: null, evidencia: null, consentId: null };

function redactarRelato(r?: RelatoLlamada): RelatoLlamada | undefined {
  if (!r) return undefined;
  return { ...r, notas: redactPII(r.notas).texto, quienDijoSer: redactPII(r.quienDijoSer).texto };
}

/* Flujo de análisis: veredicto local inmediato → consentimiento → análisis en el servidor.
   Si no hay conexión, consentimiento o servicio, el veredicto local se mantiene (Constitución §III). */
export function useAnalisis(pedirConsentimiento: Pedir) {
  const [estado, setEstado] = useState<EstadoAnalisis>(INICIAL);
  const turno = useRef(0);

  const analizar = useCallback(
    async (evidencia: Evidencia) => {
      const mio = ++turno.current;
      const local = analyzeLocal(evidencia, "sin_consentimiento");
      setEstado({ veredicto: local, provisional: true, aviso: null, evidencia, consentId: null });

      if (!estaEnLinea()) {
        setEstado((e) => ({ ...e, provisional: false, aviso: "Sin conexión: analizamos con las reglas de tu dispositivo. La IA, las fuentes abiertas y el registro estarán disponibles al reconectarte." }));
        return;
      }

      const redaccion = redactPII(evidencia.texto);
      const ocultos = redaccion.ocultos.reduce((s, o) => s + o.cantidad, 0);
      const acepta = await pedirConsentimiento("analisis_ia", ocultos, redaccion.texto || undefined);
      if (mio !== turno.current) return;
      if (!acepta) {
        setEstado((e) => ({ ...e, provisional: false, aviso: "Analizado solo en tu dispositivo, con reglas. No se envió nada." }));
        return;
      }

      try {
        const config = await cargarConfig();
        const { consentId } = await api<{ consentId: string }>("/api/consentimientos", {
          body: { alcance: "analisis_ia", textoVersion: config?.textoConsentimientoVersion ?? "desconocida" },
        });
        const veredicto = await api<Veredicto>("/api/analisis", {
          body: {
            consentId,
            tipo: evidencia.tipo,
            texto: redaccion.texto,
            numeros: [...extraerNumeros(evidencia.texto), evidencia.relato?.numeroOrigen].filter(Boolean).slice(0, 5),
            relato: redactarRelato(evidencia.relato),
            consultarEnlaces: leerPermisos().verificadorEnlaces,
          },
          timeoutMs: 45_000,
        });
        if (mio !== turno.current) return;
        setEstado({ veredicto, provisional: false, aviso: null, evidencia, consentId });
      } catch (e) {
        if (mio !== turno.current) return;
        const aviso =
          e instanceof SinConexionError
            ? "Perdiste la conexión: mostramos el análisis de tu dispositivo."
            : e instanceof ApiError && e.status === 429
              ? `${e.detalle ?? "Alcanzaste el límite de uso."} Mientras tanto, mostramos el análisis de tu dispositivo.`
              : "No pudimos conectar con el servicio. Mostramos el análisis hecho en tu dispositivo con reglas.";
        setEstado((s) => ({ ...s, provisional: false, aviso }));
      }
    },
    [pedirConsentimiento],
  );

  const limpiar = useCallback(() => {
    turno.current++;
    setEstado(INICIAL);
  }, []);

  return { ...estado, analizar, limpiar };
}
