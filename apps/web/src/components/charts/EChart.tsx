import { useEffect, useRef, useState } from "react";
import type { EChartsCoreOption, EChartsType } from "echarts/core";

interface Props {
  option: EChartsCoreOption;
  alto: number;
  /** Descripción accesible del gráfico (también visible mientras carga). */
  etiqueta: string;
  className?: string;
}

/* Contenedor de ECharts: carga la librería bajo demanda, se adapta al ancho y expone un rol de imagen. */
export function EChart({ option, alto, etiqueta, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vivo = true;
    let obs: ResizeObserver | null = null;
    import("./echartsSetup").then(({ default: echarts }) => {
      if (!vivo || !ref.current) return;
      chart.current = echarts.init(ref.current, undefined, { renderer: "svg" });
      setListo(true);
      obs = new ResizeObserver(() => chart.current?.resize());
      obs.observe(ref.current);
    });
    return () => {
      vivo = false;
      obs?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (listo && chart.current) chart.current.setOption(option, { notMerge: true });
  }, [listo, option]);

  return (
    <div className={`grafico ${className ?? ""}`} role="img" aria-label={etiqueta}>
      <div ref={ref} style={{ width: "100%", height: alto }} aria-hidden="true">
        {!listo && <span className="ayuda">{etiqueta}</span>}
      </div>
    </div>
  );
}
