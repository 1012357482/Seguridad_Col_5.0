import { AVISO_ORIENTACION, type Veredicto } from "@itf/core";
import { useEffect, useRef } from "react";
import type { Evidencia } from "../../hooks/useAnalisis";
import { NIVEL, NOMBRE_MODALIDAD, ORIGEN, horaBogota } from "../../textos";
import { RiskGauge } from "../charts/RiskGauge";
import { SignalBreakdown } from "../charts/SignalBreakdown";
import { Fuentes } from "./Fuentes";
import { GuardarCaso } from "./GuardarCaso";

interface Props {
  veredicto: Veredicto;
  provisional: boolean;
  aviso: string | null;
  evidencia: Evidencia | null;
  consentId: string | null;
}

const AVISO_IA: Partial<Record<Veredicto["ia"]["estado"], string>> = {
  no_disponible: "El análisis de IA no estuvo disponible esta vez: el resultado se basa en reglas y fuentes abiertas.",
  desactivada: "El servicio no tiene IA activa: el resultado se basa en reglas y fuentes abiertas.",
};

export function Resultado({ veredicto: v, provisional, aviso, evidencia, consentId }: Props) {
  const nivel = NIVEL[v.nivel];
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!provisional) titulo.current?.focus();
  }, [provisional, v]);

  return (
    <div aria-live="polite">
      {v.urgente.length > 0 && (
        <section className="urgente" aria-labelledby="titulo-urgente">
          <h3 id="titulo-urgente">Haz esto ahora</h3>
          <ol>
            {v.urgente.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </section>
      )}

      <section className={`veredicto ${v.nivel}`} aria-labelledby="titulo-veredicto">
        <div className="veredicto-cabecera">
          <span className="veredicto-icono" aria-hidden="true">{nivel.icono}</span>
          <div>
            <h2 id="titulo-veredicto" className="veredicto-titulo" tabIndex={-1} ref={titulo}>
              {nivel.titulo}
            </h2>
            <p className="veredicto-sub">
              {NOMBRE_MODALIDAD[v.modalidad]}
              {v.entidad && v.nivel !== "bajo" ? ` · posible suplantación de ${v.entidad}` : ""}
            </p>
          </div>
        </div>
        <RiskGauge puntaje={v.puntaje} nivel={v.nivel} />
        <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{nivel.resumen}</p>
        {provisional && (
          <p className="ayuda" role="status">
            <span className="cargando" aria-hidden="true" /> Análisis preliminar en tu dispositivo. Esperando tu decisión o consultando IA y fuentes…
          </p>
        )}
      </section>

      {aviso && <div className="banner info" role="status">{aviso}</div>}
      {!provisional && AVISO_IA[v.ia.estado] && <div className="banner alerta" role="status">{AVISO_IA[v.ia.estado]}</div>}
      {v.discrepancia && <div className="banner info">⚖️ {v.discrepancia}</div>}

      <section className="tarjeta" aria-labelledby="titulo-motivos">
        <h3 id="titulo-motivos">Por qué</h3>
        {v.motivos.length ? (
          <ul className="lista-limpia">
            {v.motivos.map((m, i) => (
              <li className="motivo" key={i}>
                <span className="chip" title={`Origen: ${ORIGEN[m.origen].nombre}`}>
                  <i className="punto" style={{ background: `var(${ORIGEN[m.origen].variable})` }} aria-hidden="true" />
                  {ORIGEN[m.origen].nombre}
                </span>
                <span className="motivo-texto">
                  {m.texto}
                  {m.fuente && (
                    <span className="motivo-meta" style={{ display: "block" }}>
                      {m.fuente}
                      {m.consultadoEn ? ` · consultado a las ${horaBogota(m.consultadoEn)}` : ""}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ok">No encontramos señales de alerta en este contenido.</p>
        )}
        {v.motivos.length > 0 && (
          <>
            <h3 style={{ marginTop: 14 }}>Peso de cada señal</h3>
            <SignalBreakdown motivos={v.motivos} />
          </>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="titulo-que-hacer">
        <h3 id="titulo-que-hacer">Qué hacer</h3>
        <ul className="lista">
          {v.queHacer.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section className="tarjeta" aria-labelledby="titulo-denuncia">
        <h3 id="titulo-denuncia">Dónde denunciar</h3>
        <ul className="lista">
          {v.denuncia.map((d) => (
            <li key={d.url}>
              <a href={d.url} target="_blank" rel="noopener noreferrer">
                {d.nombre}
              </a>
              {d.detalle && <span className="ayuda"> — {d.detalle}</span>}
            </li>
          ))}
        </ul>
        <p className="aviso">Enlaces a sitios oficiales. Antes de enviar datos, confirma que la dirección siga vigente.</p>
      </section>

      {!provisional && <Fuentes fuentes={v.fuentes} modalidad={v.modalidad} entidad={v.entidad} />}

      {!provisional && evidencia && <GuardarCaso veredicto={v} evidencia={evidencia} consentId={consentId} />}

      <p className="aviso" style={{ textAlign: "center" }}>
        {AVISO_ORIENTACION} Reglas v{v.versionReglas}
        {v.ia.estado === "usada" && v.ia.proveedor ? ` · IA: ${v.ia.proveedor} (${v.ia.modelo})` : ""}
      </p>
    </div>
  );
}
