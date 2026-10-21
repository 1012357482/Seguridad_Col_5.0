/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CACHE_COMPARTIDO, guardarCompartido } from "./shareTarget";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

const BASE = import.meta.env.BASE_URL;

// Precarga de la app: funciona sin conexión con el análisis por reglas (FR-029c).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${BASE}index.html`), { denylist: [/\/api\//] }));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Web Share Target (POST multipart): mensajes, enlaces y audios compartidos desde otras apps.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== `${BASE}compartir`) return;
  event.respondWith(
    (async () => {
      try {
        await guardarCompartido(await event.request.formData());
      } catch {
        /* si falla, la página de compartir mostrará que no llegó contenido */
      }
      return Response.redirect(`${BASE}compartir?pendiente=1`, 303);
    })(),
  );
});

export { CACHE_COMPARTIDO };
