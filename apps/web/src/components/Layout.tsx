import { AVISO_ORIENTACION } from "@itf/core";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";

const PESTANAS = [
  { a: "/analizar", texto: "¿Te llegó algo sospechoso?" },
  { a: "/me-llamaron", texto: "Me llamaron" },
  { a: "/entidad", texto: "Verificar entidad" },
  { a: "/registro", texto: "Registro" },
  { a: "/panel", texto: "Panel" },
  { a: "/permisos", texto: "Permisos" },
];

export function Layout() {
  const { pathname } = useLocation();
  const esInicio = pathname === "/";
  return (
    <div className="app">
      <a href="#contenido" className="sr-only">Saltar al contenido</a>
      <header className="encabezado">
        <div className="encabezado-int">
          <Link to="/" aria-label="Identifica tu fraude, inicio">
            <img className="logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
            <div>
              <h1>Identifica tu fraude</h1>
              <p>Agente de orientación frente al fraude digital</p>
            </div>
          </Link>
        </div>
      </header>
      {!esInicio && (
        <nav className="navegacion no-imprimir" aria-label="Secciones">
          <ul>
            {PESTANAS.map((p) => (
              <li key={p.a}>
                <NavLink to={p.a}>{p.texto}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main id="contenido">
        <OfflineBanner />
        <Outlet />
      </main>
      <footer className="pie no-imprimir">
        {AVISO_ORIENTACION} · <Link to="/privacidad">Privacidad</Link>
      </footer>
    </div>
  );
}
