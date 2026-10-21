import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import Inicio from "./pages/Inicio";

// Páginas bajo demanda: la primera pantalla carga liviana (ECharts y Tesseract van aparte).
const Analizar = lazy(() => import("./pages/Analizar"));
const MeLlamaron = lazy(() => import("./pages/MeLlamaron"));
const Entidad = lazy(() => import("./pages/Entidad"));
const Registro = lazy(() => import("./pages/Registro"));
const Comprobante = lazy(() => import("./pages/Comprobante"));
const Panel = lazy(() => import("./pages/Panel"));
const Permisos = lazy(() => import("./pages/Permisos"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Compartir = lazy(() => import("./pages/Compartir"));

const Cargando = () => (
  <p className="ayuda">
    <span className="cargando" aria-hidden="true" /> Cargando…
  </p>
);

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="analizar" element={<Analizar />} />
          <Route path="me-llamaron" element={<MeLlamaron />} />
          <Route path="entidad" element={<Entidad />} />
          <Route path="registro" element={<Registro />} />
          <Route path="comprobante/:id" element={<Comprobante />} />
          <Route path="panel" element={<Panel />} />
          <Route path="permisos" element={<Permisos />} />
          <Route path="privacidad" element={<Privacidad />} />
          <Route path="compartir" element={<Compartir />} />
          <Route path="*" element={<Inicio />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
