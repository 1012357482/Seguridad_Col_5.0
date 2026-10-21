import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useConsentimiento } from "../components/ConsentDialog";
import { EvidenceInput } from "../components/EvidenceInput/EvidenceInput";
import { Resultado } from "../components/Resultado/Resultado";
import { useAnalisis } from "../hooks/useAnalisis";

export default function Analizar() {
  const { pedir, dialogo } = useConsentimiento();
  const a = useAnalisis(pedir);
  const location = useLocation();
  const compartido = (location.state ?? {}) as { texto?: string; audio?: File };
  const resultadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (a.veredicto) resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [a.veredicto?.generadoEn]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <EvidenceInput
        ocupado={a.provisional}
        textoInicial={compartido.texto}
        audioInicial={compartido.audio}
        pedirConsentimiento={pedir}
        onAnalizar={(tipo, texto) => a.analizar({ tipo, texto })}
      />
      <div ref={resultadoRef}>
        {a.veredicto && <Resultado veredicto={a.veredicto} provisional={a.provisional} aviso={a.aviso} evidencia={a.evidencia} consentId={a.consentId} />}
      </div>
      {dialogo}
    </>
  );
}
