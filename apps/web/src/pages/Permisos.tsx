import { Link } from "react-router-dom";
import { usePermisos } from "../services/permisos";

export default function Permisos() {
  const [p, cambiar] = usePermisos();
  return (
    <section className="tarjeta">
      <h2>Permisos (opcionales y revocables)</h2>
      <p className="ayuda" style={{ marginTop: 0 }}>
        Cada permiso se activa por separado y puedes cambiarlo cuando quieras. Además, cada análisis con IA te pide confirmación.
      </p>
      <label className="permiso">
        <input type="checkbox" checked={p.verificadorEnlaces} onChange={(e) => cambiar({ verificadorEnlaces: e.target.checked })} />
        <span>
          <strong>Verificador de enlaces.</strong> Consultar los enlaces que yo envíe en listas públicas de sitios peligrosos, sin abrirlos.
        </span>
      </label>
      <label className="permiso">
        <input type="checkbox" checked={p.guardarRegistro} onChange={(e) => cambiar({ guardarRegistro: e.target.checked })} />
        <span>
          <strong>Guardar registro del caso.</strong> Conservar el veredicto y la huella del mensaje (nunca el mensaje) con un comprobante verificable.
        </span>
      </label>
      <p className="aviso">
        El análisis automático de SMS y llamadas no está disponible en la versión web: los navegadores no permiten leerlos. Puedes compartir el mensaje
        hacia la app o contarnos la llamada en <Link to="/me-llamaron">Me llamaron</Link>.
      </p>
      <p className="aviso">
        Puedes ejercer tus derechos de conocimiento, actualización, rectificación y supresión (Ley 1581 de 2012). Consulta la{" "}
        <Link to="/privacidad">política de privacidad</Link> antes de activar cualquier permiso.
      </p>
    </section>
  );
}
