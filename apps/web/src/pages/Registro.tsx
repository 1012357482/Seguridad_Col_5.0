import { huellaEvidencia, type Caso } from "@itf/core";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOnline } from "../hooks/useOnline";
import { api, ApiError } from "../services/apiClient";
import { comprobantesRecordados, olvidarComprobantes, verificarComprobante, type ResultadoVerificacion } from "../services/receipts";
import { NIVEL, NOMBRE_MODALIDAD, fechaBogota } from "../textos";

interface Cadena {
  ok: boolean;
  verificados: number;
  rotoEn?: string;
  motivo?: string;
}

/* US3: casos guardados, integridad de la cadena, comprobar un mensaje, verificar un comprobante y borrar historial. */
export default function Registro() {
  const enLinea = useOnline();
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [cadena, setCadena] = useState<Cadena | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [comprobacion, setComprobacion] = useState<string | null>(null);
  const [verificacion, setVerificacion] = useState<ResultadoVerificacion | null>(null);
  const [idBuscado, setIdBuscado] = useState("");
  const recordados = comprobantesRecordados();

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await api<{ casos: Caso[]; cadena: Cadena }>("/api/casos");
      setCasos(r.casos);
      setCadena(r.cadena);
    } catch (e) {
      setError(e instanceof ApiError ? (e.detalle ?? e.titulo) : "No se pudo cargar el registro (necesitas conexión).");
    }
  }, []);

  useEffect(() => {
    if (enLinea) void cargar();
  }, [enLinea, cargar]);

  async function comprobar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return setComprobacion("Pega el texto original para comprobarlo.");
    const huella = await huellaEvidencia(texto);
    try {
      const r = await api<{ coincide: boolean; casoId?: string; creadoEn?: string; nivel?: keyof typeof NIVEL }>("/api/casos/comprobar", { body: { huella } });
      setComprobacion(
        r.coincide ? `✓ Coincide con el caso ${r.casoId} del ${fechaBogota(r.creadoEn!)} (${NIVEL[r.nivel!].titulo.toLowerCase()}).` : "✗ Ningún caso guardado coincide con este texto.",
      );
    } catch {
      const local = recordados.find((c) => c.caso.huellaEvidencia === huella);
      setComprobacion(local ? `✓ Coincide con el comprobante ${local.caso.id} guardado en este dispositivo.` : "No se pudo comprobar ahora.");
    }
  }

  async function alSubirComprobante(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      setVerificacion(await verificarComprobante(JSON.parse(await f.text())));
    } catch {
      setVerificacion({ formatoValido: false, hashValido: false, firmaValida: false, enBaseDeDatos: null, dondeSeVerifico: "dispositivo" });
    }
  }

  async function borrar() {
    if (!window.confirm("¿Borrar todo tu historial de casos? Esta acción no se puede deshacer.")) return;
    try {
      await api("/api/casos", { method: "DELETE" });
      olvidarComprobantes();
      await cargar();
    } catch {
      setError("No se pudo borrar ahora. Intenta con conexión.");
    }
  }

  return (
    <>
      <div className="banner alerta" role="note">
        Versión de prueba: los casos guardados en el servidor pueden borrarse cuando el servicio se actualiza. Descarga tu comprobante: sigue siendo verificable.
      </div>

      <section className="tarjeta" aria-labelledby="t-casos">
        <h2 id="t-casos">Registro verificable de tus casos</h2>
        <p className="ayuda" style={{ marginTop: 0 }}>
          Cada caso guarda la huella SHA-256 del mensaje (nunca el mensaje), está firmado y encadenado con el anterior: cualquier cambio o eliminación se detecta.
        </p>
        {cadena && (
          <div className={`banner ${cadena.ok ? "ok" : "error"}`} role="status">
            {cadena.ok ? `✓ Cadena íntegra: ${cadena.verificados} caso(s) verificados.` : `✗ Cadena alterada en el caso ${cadena.rotoEn}: ${cadena.motivo}`}
          </div>
        )}
        {error && <p className="aviso alerta">{error}</p>}
        {casos && !casos.length && <p className="ayuda">Aún no hay casos guardados en el servidor para este dispositivo.</p>}
        <ul className="lista-limpia">
          {casos?.map((c) => (
            <li className="fila" key={c.id} style={{ flexDirection: "column" }}>
              <span>
                <strong>{c.id}</strong> · {fechaBogota(c.creadoEn)} · <span className="chip">{NIVEL[c.veredicto.nivel].titulo}</span>
              </span>
              <span className="ayuda">{NOMBRE_MODALIDAD[c.veredicto.modalidad]}</span>
              <span className="mono">Huella del mensaje: {c.huellaEvidencia}</span>
              <Link to={`/comprobante/${c.id}`} className="ayuda">Ver comprobante</Link>
            </li>
          ))}
        </ul>
        <button className="btn secundario" type="button" onClick={cargar} disabled={!enLinea}>
          Verificar cadena
        </button>
      </section>

      {recordados.length > 0 && (
        <section className="tarjeta" aria-labelledby="t-locales">
          <h3 id="t-locales">Comprobantes guardados en este dispositivo</h3>
          <ul className="lista-limpia">
            {recordados.map((c) => (
              <li className="fila" key={c.caso.id}>
                <span>
                  {c.caso.id} · {fechaBogota(c.caso.creadoEn)}
                </span>
                <Link to={`/comprobante/${c.caso.id}`}>Abrir</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta" aria-labelledby="t-buscar">
        <h3 id="t-buscar">Consultar un caso por su identificador</h3>
        <div className="fila-botones">
          <input type="text" aria-label="Identificador del caso" value={idBuscado} onChange={(e) => setIdBuscado(e.target.value)} placeholder="IF-20261020-XXXXXX" />
          <Link className="btn secundario" style={{ marginTop: 0 }} to={`/comprobante/${encodeURIComponent(idBuscado.trim().toUpperCase())}`} aria-disabled={!idBuscado.trim()}>
            Consultar
          </Link>
        </div>
      </section>

      <form className="tarjeta" onSubmit={comprobar} aria-labelledby="t-comprobar">
        <h3 id="t-comprobar">Comprobar un mensaje</h3>
        <p className="ayuda" style={{ marginTop: 0 }}>Pega el texto original. Calculamos su huella en tu dispositivo y la comparamos con tus casos.</p>
        <textarea aria-label="Texto original" value={texto} onChange={(e) => setTexto(e.target.value)} style={{ minHeight: 80 }} />
        <button className="btn secundario" type="submit">Comprobar</button>
        {comprobacion && <p className="aviso" role="status">{comprobacion}</p>}
      </form>

      <section className="tarjeta" aria-labelledby="t-verificar">
        <h3 id="t-verificar">Verificar un comprobante</h3>
        <p className="ayuda" style={{ marginTop: 0 }}>Sube un archivo de comprobante (.json) para validar su huella y su firma, aunque el caso ya no esté en el servidor.</p>
        <label className="btn secundario">
          📄 Elegir comprobante
          <input type="file" accept="application/json,.json" className="sr-only" onChange={alSubirComprobante} />
        </label>
        {verificacion && (
          <div className={`banner ${verificacion.formatoValido && verificacion.hashValido && verificacion.firmaValida !== false ? "ok" : "error"}`} style={{ marginTop: 10 }} role="status">
            {!verificacion.formatoValido
              ? "✗ El archivo no es un comprobante válido."
              : `${verificacion.hashValido ? "✓ Contenido íntegro" : "✗ El contenido fue alterado"} · ${
                  verificacion.firmaValida === null ? "firma no verificable en este navegador" : verificacion.firmaValida ? "✓ firma válida" : "✗ firma inválida"
                }${verificacion.enBaseDeDatos === null ? "" : verificacion.enBaseDeDatos ? " · está en el servidor" : " · ya no está en el servidor (versión de prueba)"}`}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h3>Tus datos</h3>
        <button className="btn peligro" type="button" onClick={borrar} disabled={!enLinea}>
          🗑️ Borrar todo mi historial
        </button>
        <p className="ayuda">Derecho de supresión (Ley 1581 de 2012). Borra tus casos del servidor y los comprobantes guardados en este dispositivo.</p>
      </section>
    </>
  );
}
