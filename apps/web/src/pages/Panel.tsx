import { useEffect, useState } from "react";
import { KpiCounter } from "../components/charts/KpiCounter";
import { GraficoEntidades, GraficoModalidades, GraficoSemanal, type Estadisticas } from "../components/charts/TrendCharts";
import { useOnline } from "../hooks/useOnline";
import { api } from "../services/apiClient";
import { fechaBogota } from "../textos";

/* US4: panel público con tendencias agregadas y anónimas (FR-028). */
export default function Panel() {
  const enLinea = useOnline();
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enLinea) return;
    api<Estadisticas>("/api/estadisticas")
      .then((d) => {
        setDatos(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [enLinea]);

  if (!enLinea) return <div className="tarjeta ayuda">El panel necesita conexión.</div>;
  if (error) return <div className="tarjeta ayuda">No se pudieron cargar las estadísticas ahora. Intenta más tarde.</div>;
  if (!datos) return <p className="ayuda"><span className="cargando" aria-hidden="true" /> Cargando tendencias…</p>;

  return (
    <>
      <h2>Panorama del fraude reportado</h2>
      <p className="ayuda" style={{ marginTop: 0 }}>
        Cifras agregadas y anónimas de los casos guardados en Identifica tu fraude. Nunca se muestran mensajes ni datos personales.
      </p>
      <div className="kpis">
        <KpiCounter valor={datos.totales.casos} etiqueta="casos registrados" icono="🧾" destacado />
        <KpiCounter valor={datos.totales.alto} etiqueta="riesgo alto" icono="⛔" />
        <KpiCounter valor={datos.totales.medio} etiqueta="riesgo medio" icono="⚠️" />
        <KpiCounter valor={datos.totales.bajo} etiqueta="riesgo bajo" icono="✓" />
      </div>
      <section className="tarjeta" aria-labelledby="t-mod">
        <h2 id="t-mod">Modalidades más frecuentes</h2>
        <GraficoModalidades datos={datos} />
      </section>
      <section className="tarjeta" aria-labelledby="t-ent">
        <h2 id="t-ent">Entidades más suplantadas</h2>
        <GraficoEntidades datos={datos} />
      </section>
      <section className="tarjeta" aria-labelledby="t-sem">
        <h2 id="t-sem">Casos por semana</h2>
        <GraficoSemanal datos={datos} />
      </section>
      <p className="aviso">
        Actualizado: {fechaBogota(datos.generadoEn)}. Solo se publican grupos con al menos {datos.kMinimo} casos. Versión de prueba: los datos se reinician con
        cada actualización del servicio.
      </p>
    </>
  );
}
