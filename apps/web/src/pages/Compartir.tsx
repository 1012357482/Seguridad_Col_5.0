import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { leerCompartido } from "../sw/shareTarget";

/* Destino de "Compartir" (Android con la PWA instalada): precarga Analizar con el texto o el audio. */
export default function Compartir() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [vacio, setVacio] = useState(false);

  useEffect(() => {
    (async () => {
      const desdeSw = params.get("pendiente") ? await leerCompartido().catch(() => null) : null;
      const texto = desdeSw?.texto ?? ["title", "text", "url"].map((k) => params.get(k)).filter(Boolean).join("\n");
      if (texto || desdeSw?.audio) {
        navigate("/analizar", { replace: true, state: { texto, audio: desdeSw?.audio } });
      } else {
        setVacio(true);
      }
    })();
  }, [navigate, params]);

  return (
    <div className="tarjeta">
      {vacio ? (
        <>
          <p>No recibimos contenido para analizar.</p>
          <Link to="/analizar">Pegar un mensaje</Link>
        </>
      ) : (
        <p className="ayuda"><span className="cargando" aria-hidden="true" /> Preparando lo que compartiste…</p>
      )}
    </div>
  );
}
