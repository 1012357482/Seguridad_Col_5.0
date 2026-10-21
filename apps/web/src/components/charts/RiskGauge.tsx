import type { Nivel } from "@itf/core";
import { useMemo } from "react";
import { EChart } from "./EChart";
import { useTemaGraficos } from "./theme";

const ETIQUETA: Record<Nivel, string> = { bajo: "riesgo bajo", medio: "riesgo medio", alto: "riesgo alto" };

/* Medidor de riesgo 0–100 con tres bandas de estado (bajo 0–33, medio 34–66, alto 67–100).
   El nivel también se comunica con texto e ícono en la tarjeta del veredicto (FR-027). */
export function RiskGauge({ puntaje, nivel }: { puntaje: number; nivel: Nivel }) {
  const t = useTemaGraficos();
  const option = useMemo(
    () => ({
      animationDuration: t.movimientoReducido ? 0 : 1400,
      animationEasing: "cubicOut" as const,
      aria: { enabled: true, decal: { show: false } },
      series: [
        {
          type: "gauge",
          startAngle: 205,
          endAngle: -25,
          min: 0,
          max: 100,
          radius: "96%",
          center: ["50%", "62%"],
          progress: { show: false },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 20,
              color: [
                [0.335, t.bajo],
                [0.665, t.medio],
                [1, t.alto],
              ],
            },
          },
          pointer: {
            icon: "path://M2090.36389,615.30999 L2090.36389,615.30999 C2091.48372,615.30999 2092.40383,616.194028 2092.44859,617.312956 L2096.90698,728.755929 C2097.05155,732.369577 2094.2393,735.416212 2090.62566,735.56078 C2090.53845,735.564269 2090.45117,735.566014 2090.36389,735.566014 L2090.36389,735.566014 C2086.74736,735.566014 2083.81557,732.63423 2083.81557,729.017692 C2083.81557,728.930412 2083.81732,728.84314 2083.82081,728.755929 L2088.2792,617.312956 C2088.32396,616.194028 2089.24407,615.30999 2090.36389,615.30999 Z",
            length: "62%",
            width: 10,
            offsetCenter: [0, "-6%"],
            itemStyle: { color: t.texto },
          },
          anchor: { show: true, size: 16, showAbove: true, itemStyle: { color: t.superficie, borderColor: t.texto, borderWidth: 3 } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            distance: -46,
            color: t.texto3,
            fontSize: 11,
            formatter: (v: number) => (v === 0 ? "0" : v === 100 ? "100" : ""),
          },
          title: { show: true, offsetCenter: [0, "62%"], color: t.texto2, fontSize: 12 },
          detail: {
            valueAnimation: !t.movimientoReducido,
            offsetCenter: [0, "34%"],
            fontSize: 34,
            fontWeight: 800,
            color: t.texto,
            formatter: "{value}",
          },
          data: [{ value: puntaje, name: "puntaje de riesgo (0–100)" }],
        },
      ],
    }),
    [puntaje, t],
  );

  return <EChart option={option} alto={210} etiqueta={`Medidor de riesgo: ${puntaje} de 100, ${ETIQUETA[nivel]}.`} />;
}
