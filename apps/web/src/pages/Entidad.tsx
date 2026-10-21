import { verificarCanal, type SourceCheck } from "@itf/core";
import { useState } from "react";
import { useOnline } from "../hooks/useOnline";
import { api } from "../services/apiClient";
import { NOMBRE_FUENTE } from "../textos";

interface Respuesta {
  resultado: "coincide_oficial" | "no_coincide" | "sin_datos";
  entidad?: string;
  reportesComunidad?: number;
  fuentes?: SourceCheck[];
  local?: boolean;
}

function mensaje(r: Respuesta): { clase: string; texto: string } {
  if (r.resultado === "coincide_oficial") return { clase: "ok", texto: `El remitente coincide con un canal oficial de ${r.entidad}.` };
  if (r.resultado === "no_coincide")
    return { clase: "error", texto: `Dice ser de ${r.entidad}, pero el remitente no está entre sus canales oficiales cargados. Verifica por la app oficial.` };
  return {
    clase: "info",
    texto: `${r.entidad ? `Menciona a ${r.entidad}, pero aún` : "Aún"} no tenemos canales oficiales cargados para comparar. Esto no prueba que sea falso.`,
  };
}

/* Verificar número o remitente contra canales oficiales y reportes de la comunidad (US2). */
export default function Entidad() {
  const enLinea = useOnline();
  const [valor, setValor] = useState("");
  const [r, setR] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(false);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    const v = valor.trim();
    if (v.length < 2) return;
    setCargando(true);
    try {
      setR(enLinea ? await api<Respuesta>("/api/entidades/verificar", { body: { valor: v } }) : { ...local(v), local: true });
    } catch {
      setR({ ...local(v), local: true });
    } finally {
      setCargando(false);
    }
  }

  const local = (v: string): Respuesta => {
    const c = verificarCanal(v);
    return { resultado: c.resultado, entidad: c.entidad?.nombre };
  };

  const m = r ? mensaje(r) : null;
  return (
    <form className="tarjeta" onSubmit={verificar}>
      <h2>Verificar número o remitente</h2>
      <p className="ayuda" style={{ marginTop: 0 }}>
        Compara el número o remitente con los canales publicados por la entidad y con los reportes de la comunidad.
      </p>
      <label className="sr-only" htmlFor="remitente">Remitente o número</label>
      <input id="remitente" type="text" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ej: 3105556677 o BANCOLOMBIA" />
      <button className="btn" type="submit" disabled={cargando}>
        {cargando ? <span className="cargando" aria-hidden="true" /> : "🔎"} Verificar
      </button>
      {r && m && (
        <div style={{ marginTop: 14 }} aria-live="polite">
          <div className={`banner ${m.clase}`}>{m.texto}</div>
          {typeof r.reportesComunidad === "number" && (
            <p className={r.reportesComunidad >= 5 ? "alerta" : "ayuda"}>
              {r.reportesComunidad > 0
                ? `${r.reportesComunidad} persona(s) lo han reportado en las últimas 72 horas${r.reportesComunidad >= 5 ? ": alerta activa de la comunidad." : "."}`
                : "Sin reportes recientes de la comunidad."}
            </p>
          )}
          {r.fuentes?.map((f, i) => (
            <div className="fila" key={i}>
              <span>
                <strong>{NOMBRE_FUENTE[f.fuente]}</strong>
                <span className="ayuda" style={{ display: "block" }}>{f.detalle}</span>
              </span>
            </div>
          ))}
          {r.local && <p className="aviso">Verificado sin conexión con la lista guardada en tu dispositivo.</p>}
          <p className="aviso">Confirma siempre por la app o el sitio oficial de la entidad.</p>
        </div>
      )}
    </form>
  );
}
