import { useEffect, useState } from "react";

/* Colores de los gráficos leídos de los tokens CSS (tokens.css), para que claro/oscuro
   sean pasos seleccionados y validados, no una inversión automática.
   Paleta de origen validada con dataviz/validate_palette.js:
   claro #7b1fa2,#eb6834,#1baf7a (contraste del verde < 3:1 → leyenda + tabla obligatorias);
   oscuro #b26ad6,#d95926,#199e70 (todas ≥ 3:1). */

export interface TemaGraficos {
  oscuro: boolean;
  superficie: string;
  texto: string;
  texto2: string;
  texto3: string;
  grilla: string;
  eje: string;
  serieRegla: string;
  serieIa: string;
  serieFuente: string;
  serieUnica: string;
  bajo: string;
  medio: string;
  alto: string;
  movimientoReducido: boolean;
}

function leer(): TemaGraficos {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string) => css.getPropertyValue(n).trim();
  return {
    oscuro: css.colorScheme === "dark" || v("color-scheme") === "dark",
    superficie: v("--superficie") || "#ffffff",
    texto: v("--texto") || "#1e1433",
    texto2: v("--texto-2") || "#5f5670",
    texto3: v("--texto-3") || "#675f7c",
    grilla: v("--grilla") || "#ece6f2",
    eje: v("--eje") || "#c9bdd6",
    serieRegla: v("--serie-regla") || "#7b1fa2",
    serieIa: v("--serie-ia") || "#eb6834",
    serieFuente: v("--serie-fuente") || "#1baf7a",
    serieUnica: v("--serie-unica") || "#7b1fa2",
    bajo: v("--riesgo-bajo") || "#0ca30c",
    medio: v("--riesgo-medio") || "#fab219",
    alto: v("--riesgo-alto") || "#d03b3b",
    movimientoReducido: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  };
}

export function useTemaGraficos(): TemaGraficos {
  const [tema, setTema] = useState(leer);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const actualizar = () => setTema(leer());
    mq?.addEventListener("change", actualizar);
    const obs = new MutationObserver(actualizar);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq?.removeEventListener("change", actualizar);
      obs.disconnect();
    };
  }, []);
  return tema;
}

export const ejeBase = (t: TemaGraficos) => ({
  axisLine: { lineStyle: { color: t.eje } },
  axisTick: { show: false },
  axisLabel: { color: t.texto3, fontSize: 11 },
  splitLine: { lineStyle: { color: t.grilla, width: 1 } },
});

export const tooltipBase = (t: TemaGraficos) => ({
  backgroundColor: t.superficie,
  borderColor: t.eje,
  textStyle: { color: t.texto, fontSize: 12 },
  extraCssText: "border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.15);",
});
