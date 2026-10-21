import type { QuePidio, RelatoLlamada } from "@itf/core";
import { useState } from "react";
import { CampoDictado } from "../components/CampoDictado";
import { useConsentimiento } from "../components/ConsentDialog";
import { Resultado } from "../components/Resultado/Resultado";
import { useAnalisis } from "../hooks/useAnalisis";

const PIDIO: { valor: QuePidio; texto: string }[] = [
  { valor: "clave", texto: "Una clave o contraseña" },
  { valor: "codigo", texto: "Un código que me llegó por SMS" },
  { valor: "datos_tarjeta", texto: "Datos de mi tarjeta" },
  { valor: "transferencia", texto: "Transferir o mover dinero" },
  { valor: "instalar_app", texto: "Instalar una aplicación" },
  { valor: "otro", texto: "Otra cosa" },
];

const ENTREGO: { valor: RelatoLlamada["entregoAlgo"]; texto: string }[] = [
  { valor: "nada", texto: "No entregué nada" },
  { valor: "datos", texto: "Di datos o códigos" },
  { valor: "dinero", texto: "Envié dinero" },
  { valor: "ambos", texto: "Datos y dinero" },
];

/* US7: relato guiado de una llamada ya ocurrida (escrito o dictado). */
export default function MeLlamaron() {
  const { pedir, dialogo } = useConsentimiento();
  const a = useAnalisis(pedir);
  const [r, setR] = useState<RelatoLlamada>({ quienDijoSer: "", quePidio: [], numeroOrigen: "", huboPresion: false, entregoAlgo: "nada", notas: "" });
  const set = <K extends keyof RelatoLlamada>(k: K, v: RelatoLlamada[K]) => setR((x) => ({ ...x, [k]: v }));

  return (
    <>
      <form
        className="tarjeta"
        onSubmit={(e) => {
          e.preventDefault();
          a.analizar({ tipo: "relato_llamada", texto: "", relato: { ...r, numeroOrigen: r.numeroOrigen || undefined } });
        }}
      >
        <h2>Cuéntanos la llamada</h2>
        <p className="ayuda" style={{ marginTop: 0 }}>
          Ninguna aplicación puede escuchar tus llamadas. Responde estas preguntas (puedes dictar) y te orientamos.
        </p>
        <CampoDictado id="quien" etiqueta="¿Quién dijo ser?" placeholder="Ej: asesor de seguridad de mi banco" valor={r.quienDijoSer} onCambio={(v) => set("quienDijoSer", v)} pedirConsentimiento={pedir} />

        <fieldset>
          <legend>¿Qué te pidió?</legend>
          <div className="opciones">
            {PIDIO.map((p) => (
              <label className="opcion" key={p.valor}>
                <input
                  type="checkbox"
                  checked={r.quePidio.includes(p.valor)}
                  onChange={(e) => set("quePidio", e.target.checked ? [...r.quePidio, p.valor] : r.quePidio.filter((x) => x !== p.valor))}
                />
                {p.texto}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="campo" htmlFor="numero">¿Desde qué número te llamaron? (opcional)</label>
        <input id="numero" type="tel" inputMode="tel" value={r.numeroOrigen ?? ""} onChange={(e) => set("numeroOrigen", e.target.value)} placeholder="Ej: 310 555 6677" />

        <fieldset>
          <legend>¿Te presionaron o dijeron que era urgente?</legend>
          <div className="fila-botones">
            {[true, false].map((v) => (
              <label className="opcion" key={String(v)}>
                <input type="radio" name="presion" checked={r.huboPresion === v} onChange={() => set("huboPresion", v)} />
                {v ? "Sí" : "No"}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>¿Entregaste algo?</legend>
          <div className="opciones">
            {ENTREGO.map((o) => (
              <label className="opcion" key={o.valor}>
                <input type="radio" name="entrego" checked={r.entregoAlgo === o.valor} onChange={() => set("entregoAlgo", o.valor)} />
                {o.texto}
              </label>
            ))}
          </div>
        </fieldset>

        <CampoDictado id="notas" etiqueta="¿Qué te dijeron? (opcional)" multilinea placeholder="Cuenta con tus palabras lo que pasó." valor={r.notas} onCambio={(v) => set("notas", v)} pedirConsentimiento={pedir} />

        <button className="btn" type="submit" disabled={a.provisional}>
          {a.provisional ? <span className="cargando" aria-hidden="true" /> : "🔎"} Analizar la llamada
        </button>
      </form>
      {a.veredicto && <Resultado veredicto={a.veredicto} provisional={a.provisional} aviso={a.aviso} evidencia={a.evidencia} consentId={a.consentId} />}
      {dialogo}
    </>
  );
}
