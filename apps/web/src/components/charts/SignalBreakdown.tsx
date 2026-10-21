import type { Motivo } from "@itf/core";
import { useMemo } from "react";
import { EChart } from "./EChart";
import { ejeBase, tooltipBase, useTemaGraficos } from "./theme";

export const NOMBRE_CATEGORIA: Record<string, string> = {
  urgencia: "Urgencia o amenaza",
  datos: "Pide datos o dinero",
  suplantacion: "Suplantación",
  enlace: "Enlaces",
  fuente_abierta: "Fuentes abiertas",
  voz: "Llamada / voz",
  manipulacion: "Manipulación",
};

const ORIGENES = [
  { clave: "regla", nombre: "Reglas" },
  { clave: "ia", nombre: "IA" },
  { clave: "fuente", nombre: "Fuentes abiertas" },
] as const;

/** Peso de una señal: los puntos de la regla o fuente; las de IA cuentan como 2. */
const peso = (m: Motivo) => m.puntos ?? 2;

/* Barras horizontales apiladas: cuánto aporta cada categoría y de qué origen viene (FR-027). */
export function SignalBreakdown({ motivos }: { motivos: Motivo[] }) {
  const t = useTemaGraficos();
  const { categorias, datos, origenes } = useMemo(() => {
    const cats = [...new Set(motivos.map((m) => m.categoria))];
    const totales = new Map(cats.map((c) => [c, motivos.filter((m) => m.categoria === c).reduce((s, m) => s + peso(m), 0)]));
    cats.sort((a, b) => totales.get(a)! - totales.get(b)!); // la mayor queda arriba
    const presentes = ORIGENES.filter((o) => motivos.some((m) => m.origen === o.clave));
    const d = presentes.map((o) => cats.map((c) => motivos.filter((m) => m.categoria === c && m.origen === o.clave).reduce((s, m) => s + peso(m), 0)));
    return { categorias: cats, datos: d, origenes: presentes };
  }, [motivos]);

  const colores: Record<string, string> = { regla: t.serieRegla, ia: t.serieIa, fuente: t.serieFuente };

  const option = useMemo(
    () => ({
      animationDuration: t.movimientoReducido ? 0 : 900,
      aria: { enabled: true },
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: t.texto2, fontSize: 12 },
        data: origenes.map((o) => o.nombre),
      },
      tooltip: { ...tooltipBase(t), trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: t.grilla } } },
      xAxis: { type: "value", minInterval: 1, ...ejeBase(t), axisLine: { show: false } },
      yAxis: {
        type: "category",
        data: categorias.map((c) => NOMBRE_CATEGORIA[c] ?? c),
        ...ejeBase(t),
        axisLabel: { color: t.texto2, fontSize: 12 },
        splitLine: { show: false },
      },
      series: origenes.map((o, i) => ({
        name: o.nombre,
        type: "bar",
        stack: "total",
        barWidth: 16,
        data: datos[i].map((v) => (v ? v : null)),
        itemStyle: { color: colores[o.clave], borderRadius: 4, borderColor: t.superficie, borderWidth: 2 },
        emphasis: { focus: "series" },
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categorias, datos, origenes, t],
  );

  if (!motivos.length) return null;
  const resumen = categorias.map((c, j) => `${NOMBRE_CATEGORIA[c] ?? c}: ${origenes.map((o, i) => `${o.nombre} ${datos[i][j]}`).join(", ")}`).join(". ");

  return (
    <div>
      <EChart option={option} alto={56 + categorias.length * 38} etiqueta={`Desglose de señales por categoría y origen. ${resumen}.`} />
      <details className="ver-tabla">
        <summary>Ver como tabla</summary>
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Categoría</th>
              {origenes.map((o) => (
                <th key={o.clave} className="num">{o.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...categorias].reverse().map((c) => {
              const j = categorias.indexOf(c);
              return (
                <tr key={c}>
                  <td>{NOMBRE_CATEGORIA[c] ?? c}</td>
                  {origenes.map((o, i) => (
                    <td key={o.clave} className="num">{datos[i][j]}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </div>
  );
}
