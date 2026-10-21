import type { Comprobante as TComprobante } from "@itf/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../services/apiClient";
import { comprobantesRecordados, descargarComprobante } from "../services/receipts";
import { NIVEL, NOMBRE_MODALIDAD, fechaBogota } from "../textos";
import { NOMBRE_CATEGORIA } from "../components/charts/SignalBreakdown";

/* Vista imprimible del comprobante (FR-017): datos legibles, QR con el ID y leyendas. */
export default function Comprobante() {
  const { id = "" } = useParams();
  const [c, setC] = useState<TComprobante | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const local = comprobantesRecordados().find((x) => x.caso.id === id);
    if (local) setC(local);
    api<TComprobante>(`/api/casos/${encodeURIComponent(id)}`)
      .then(setC)
      .catch((e) => {
        if (!local) setError(e instanceof ApiError ? (e.detalle ?? e.titulo) : "No se pudo cargar el caso.");
      });
  }, [id]);

  useEffect(() => {
    if (!c) return;
    const url = `${window.location.origin}${import.meta.env.BASE_URL}comprobante/${c.caso.id}`;
    import("qrcode").then((q) => q.toDataURL(url, { margin: 1, width: 160 }).then(setQr)).catch(() => setQr(null));
  }, [c]);

  if (error) {
    return (
      <div className="tarjeta">
        <p className="alerta">{error}</p>
        <Link to="/registro">Volver al registro</Link>
      </div>
    );
  }
  if (!c) return <p className="ayuda"><span className="cargando" aria-hidden="true" /> Cargando comprobante…</p>;

  const v = c.caso.veredicto;
  return (
    <article className="tarjeta">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Comprobante de caso</h2>
          <p className="mono" style={{ margin: 0, fontSize: "1rem" }}><strong>{c.caso.id}</strong></p>
          <p className="ayuda" style={{ margin: 0 }}>{fechaBogota(c.caso.creadoEn)} (hora de Colombia)</p>
        </div>
        {qr && <img src={qr} alt={`Código QR del caso ${c.caso.id}`} width={110} height={110} />}
      </div>

      <div className={`veredicto ${v.nivel}`} style={{ marginTop: 12 }}>
        <p className="veredicto-titulo">{NIVEL[v.nivel].icono} {NIVEL[v.nivel].titulo} · {v.puntaje}/100</p>
        <p className="veredicto-sub">{NOMBRE_MODALIDAD[v.modalidad]}{v.entidad ? ` · ${v.entidad}` : ""}</p>
      </div>

      <h3>Motivos</h3>
      <ul className="lista">
        {v.motivos.map((m, i) => (
          <li key={i}>
            {m.texto} <span className="ayuda">({m.origen === "ia" ? "IA" : m.origen === "fuente" ? m.fuente : "regla"} · {NOMBRE_CATEGORIA[m.categoria]})</span>
          </li>
        ))}
      </ul>
      {v.fuentes.length > 0 && (
        <>
          <h3>Fuentes consultadas</h3>
          <ul className="lista">
            {v.fuentes.map((f, i) => (
              <li key={i}>{f.fuente} · {f.indicador} · {f.resultado} · {fechaBogota(f.consultadoEn)}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Datos de verificación</h3>
      <div className="log">
        Huella del mensaje (SHA-256): {c.caso.huellaEvidencia}
        <br />Huella del caso: {c.caso.hashEntrada}
        <br />Caso anterior: {c.caso.previaOwner}
        <br />Firma Ed25519: {c.firma}
        <br />Clave: {c.claveId}
        <br />Reglas v{v.versionReglas}{v.ia.proveedor ? ` · IA ${v.ia.proveedor} (${v.ia.modelo})` : ""}
      </div>

      <p className="aviso">
        Soporte para la persona; no constituye prueba pericial. Versión de prueba: el caso puede no estar en el servidor tras una actualización; este comprobante
        sigue siendo verificable con su firma.
      </p>
      <div className="fila-botones no-imprimir">
        <button className="btn" type="button" onClick={() => window.print()}>🖨️ Imprimir o guardar PDF</button>
        <button className="btn secundario" type="button" onClick={() => descargarComprobante(c)}>⬇️ Descargar JSON</button>
      </div>
    </article>
  );
}
