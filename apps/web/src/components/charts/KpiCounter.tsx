import { useEffect, useState } from "react";

/* Tarjeta KPI con contador animado (respeta prefers-reduced-motion). */
export function KpiCounter({ valor, etiqueta, icono, destacado }: { valor: number; etiqueta: string; icono?: string; destacado?: boolean }) {
  const [mostrado, setMostrado] = useState(0);

  useEffect(() => {
    const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducido || valor === 0) {
      setMostrado(valor);
      return;
    }
    let frame = 0;
    const inicio = performance.now();
    const duracion = 1100;
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - inicio) / duracion);
      setMostrado(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [valor]);

  return (
    <div className={`kpi ${destacado ? "destacado" : ""}`}>
      <div className="kpi-valor" aria-hidden="true">
        {mostrado.toLocaleString("es-CO")}
      </div>
      <div className="kpi-etiqueta">
        {icono && <span aria-hidden="true">{icono}</span>}
        <span>
          <span className="sr-only">{valor.toLocaleString("es-CO")} </span>
          {etiqueta}
        </span>
      </div>
    </div>
  );
}
