import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { despertarApi } from "./services/apiClient";
import "./theme/tokens.css";
import "./theme/base.css";

registerSW({ immediate: true });
// El plan gratuito apaga la API tras inactividad: se despierta mientras la persona escribe.
despertarApi();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
