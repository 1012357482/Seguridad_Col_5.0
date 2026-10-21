import { useMemo } from "react";
import { NOMBRE_MODALIDAD } from "../../textos";
import { EChart } from "./EChart";
import { ejeBase, tooltipBase, useTemaGraficos, type TemaGraficos } from "./theme";

export interface Estadisticas {
  totales: { casos: number; alto: number; medio: number; bajo: number };
  porModalidad: { modalidad: string; casos: number }[];
  porEntidad: { entidad: string; casos: number }[];
  porSemana: { semana: string; casos: number }[];
  kMinimo: number;
  generadoEn: string;
}

function TablaAlternativa({ filas, columna }: { filas: [string, number][]; columna: string }) {
  return (
    <details className="ver-tabla">
      <summary>Ver como tabla</summary>
      <table className="tabla-datos">
        <thead>
          <tr>
            <th>{columna}</th>
            <th className="num">Casos</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td className="num">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/* Barras horizontales de una sola serie: un solo color (la longitud ya codifica la magnitud). */
function opcionBarras(t: TemaGraficos, etiquetas: string[], valores: number[]) {
  return {
    animationDuration: t.movimientoReducido ? 0 : 900,
    aria: { enabled: true },
    grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
    tooltip: { ...tooltipBase(t), trigger: "item", formatter: (p: { name: string; value: number }) => `${p.name}<br/><b>${p.value}</b> casos` },
    xAxis: { type: "value", minInterval: 1, ...ejeBase(t), axisLine: { show: false } },
    yAxis: { type: "category", data: etiquetas, ...ejeBase(t), axisLabel: { color: t.texto2, fontSize: 12, width: 155, overflow: "truncate" }, splitLine: { show: false } },
    series: [
      {
        type: "bar",
        data: valores,
        barWidth: 16,
        itemStyle: { color: t.serieUnica, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: t.texto2, fontSize: 12, fontWeight: 600 },
        emphasis: { itemStyle: { color: t.serieUnica, opacity: 0.85 } },
      },
    ],
  };
}

const Vacio = ({ k }: { k: number }) => (
  <p className="ayuda">Aún no hay suficientes casos para mostrar esta tendencia (se publica desde {k} casos por grupo, para proteger el anonimato).</p>
);

export function GraficoModalidades({ datos }: { datos: Estadisticas }) {
  const t = useTemaGraficos();
  const filas = useMemo(
    () => [...datos.porModalidad].reverse().map((d) => [NOMBRE_MODALIDAD[d.modalidad] ?? d.modalidad, Number(d.casos)] as [string, number]),
    [datos],
  );
  const option = useMemo(() => opcionBarras(t, filas.map((f) => f[0]), filas.map((f) => f[1])), [t, filas]);
  if (!filas.length) return <Vacio k={datos.kMinimo} />;
  const resumen = [...filas].reverse().map(([k, v]) => `${k} ${v}`).join(", ");
  return (
    <>
      <EChart option={option} alto={24 + filas.length * 36} etiqueta={`Modalidades de fraude más frecuentes: ${resumen}.`} />
      <TablaAlternativa filas={[...filas].reverse()} columna="Modalidad" />
    </>
  );
}

export function GraficoEntidades({ datos }: { datos: Estadisticas }) {
  const t = useTemaGraficos();
  const filas = useMemo(() => [...datos.porEntidad].reverse().map((d) => [String(d.entidad), Number(d.casos)] as [string, number]), [datos]);
  const option = useMemo(() => opcionBarras(t, filas.map((f) => f[0]), filas.map((f) => f[1])), [t, filas]);
  if (!filas.length) return <Vacio k={datos.kMinimo} />;
  const resumen = [...filas].reverse().map(([k, v]) => `${k} ${v}`).join(", ");
  return (
    <>
      <EChart option={option} alto={24 + filas.length * 36} etiqueta={`Entidades más suplantadas: ${resumen}.`} />
      <TablaAlternativa filas={[...filas].reverse()} columna="Entidad" />
    </>
  );
}

export function GraficoSemanal({ datos }: { datos: Estadisticas }) {
  const t = useTemaGraficos();
  const filas = useMemo(() => datos.porSemana.map((d) => [d.semana.replace("-W", " · sem "), Number(d.casos)] as [string, number]), [datos]);
  const option = useMemo(
    () => ({
      animationDuration: t.movimientoReducido ? 0 : 1200,
      aria: { enabled: true },
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: { ...tooltipBase(t), trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.eje } } },
      xAxis: { type: "category", boundaryGap: false, data: filas.map((f) => f[0]), ...ejeBase(t), splitLine: { show: false } },
      yAxis: { type: "value", minInterval: 1, ...ejeBase(t), axisLine: { show: false } },
      series: [
        {
          type: "line",
          name: "Casos",
          data: filas.map((f) => f[1]),
          smooth: 0.3,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 2, color: t.serieUnica },
          itemStyle: { color: t.serieUnica, borderColor: t.superficie, borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${t.serieUnica}55` },
                { offset: 1, color: `${t.serieUnica}00` },
              ],
            },
          },
          label: { show: true, position: "top", color: t.texto2, fontSize: 11, formatter: (p: { dataIndex: number; value: number }) => (p.dataIndex === filas.length - 1 ? String(p.value) : "") },
        },
      ],
    }),
    [t, filas],
  );
  if (!filas.length) return <Vacio k={datos.kMinimo} />;
  // Una línea con un solo punto no muestra evolución: se muestra la cifra (anti-patrón de un solo dato).
  if (filas.length < 2) {
    return (
      <p>
        <span className="kpi-valor">{filas[0][1].toLocaleString("es-CO")}</span>{" "}
        <span className="ayuda">casos en {filas[0][0]}. La evolución se mostrará cuando haya al menos dos semanas con datos.</span>
      </p>
    );
  }
  return (
    <>
      <EChart option={option} alto={220} etiqueta={`Casos por semana: ${filas.map(([k, v]) => `${k} ${v}`).join(", ")}.`} />
      <TablaAlternativa filas={filas} columna="Semana" />
    </>
  );
}
