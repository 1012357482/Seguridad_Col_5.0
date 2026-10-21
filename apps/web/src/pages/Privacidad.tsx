import { Link } from "react-router-dom";
import { PROVEEDORES_IA, useConfig } from "../services/config";

/* Aviso de privacidad (FR-020a): reemplaza la promesa del prototipo de que nada salía del dispositivo. */
export default function Privacidad() {
  const config = useConfig();
  const proveedor = PROVEEDORES_IA[config?.ia.proveedor ?? "groq"] ?? PROVEEDORES_IA.groq;
  return (
    <article className="tarjeta">
      <h2>Política de privacidad</h2>
      <p className="ayuda" style={{ marginTop: 0 }}>Versión del texto de consentimiento: {config?.textoConsentimientoVersion ?? "2026-10-20"}. Versión de prueba.</p>

      <h3>Qué se procesa en tu dispositivo</h3>
      <ul className="lista">
        <li>El análisis por reglas, la lectura de capturas de pantalla (la imagen nunca se envía) y la huella SHA-256 de tus mensajes.</li>
        <li>Tus permisos y un identificador anónimo del dispositivo (no es una cuenta ni contiene datos personales).</li>
      </ul>

      <h3>Qué sale de tu dispositivo, y solo si lo aceptas en cada análisis</h3>
      <ul className="lista">
        <li>
          El texto del mensaje o relato, con tus datos personales ocultos automáticamente (claves, códigos, tarjetas, cuentas, documentos, correos y
          parámetros de enlaces).
        </li>
        <li>Los audios que decidas transcribir. No se guardan: se procesan y se descartan.</li>
      </ul>

      <h3>Con quién se comparte</h3>
      <ul className="lista">
        <li>
          <strong>Proveedor de IA activo: {proveedor.nombre}.</strong> {proveedor.datos}{" "}
          {proveedor.fuente && (
            <a href={proveedor.fuente} target="_blank" rel="noopener noreferrer">
              Ver términos del proveedor
            </a>
          )}
        </li>
        <li>
          <strong>Fuentes abiertas:</strong> Google Safe Browsing (recibe solo prefijos de huellas de la dirección, no la dirección; aviso proporcionado por
          Google), URLhaus de abuse.ch (recibe solo el dominio) y el registro público de dominios RDAP (recibe solo el dominio).
        </li>
      </ul>

      <h3>Qué se guarda y por cuánto tiempo</h3>
      <ul className="lista">
        <li>Si activas “Guardar registro del caso”: fecha, veredicto, motivos, fuentes consultadas y la huella del mensaje. Nunca el mensaje.</li>
        <li>Si reportas un enlace o número: solo el dominio o el número, asociado de forma anónima a tu dispositivo.</li>
        <li>
          Versión de prueba: los registros pueden borrarse cuando el servicio se actualiza. Tu comprobante descargado sigue siendo verificable. Máximo 12
          meses.
        </li>
        <li>El panel público muestra solo cifras agregadas de grupos con al menos 3 casos.</li>
      </ul>

      <h3>Tus derechos (Ley 1581 de 2012)</h3>
      <p>
        Puedes conocer, actualizar, rectificar y suprimir tus datos. Para suprimir tu historial usa “Borrar todo mi historial” en{" "}
        <Link to="/registro">Registro</Link>. Puedes revocar los permisos en <Link to="/permisos">Permisos</Link> en cualquier momento.
      </p>

      <h3>Límites</h3>
      <p>Esta herramienta orienta; no reemplaza a tu entidad financiera ni a las autoridades, y el comprobante no constituye prueba pericial.</p>
    </article>
  );
}
