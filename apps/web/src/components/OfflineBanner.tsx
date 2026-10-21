import { useOnline } from "../hooks/useOnline";

/* FR-029c: sin conexión solo funciona el análisis por reglas locales. */
export function OfflineBanner() {
  const enLinea = useOnline();
  if (enLinea) return null;
  return (
    <div className="banner alerta" role="status">
      <span aria-hidden="true">📴</span>
      <span>
        Sin conexión: puedes analizar con las reglas de tu dispositivo. La IA, las fuentes abiertas y el registro de casos vuelven al
        reconectarte.
      </span>
    </div>
  );
}
