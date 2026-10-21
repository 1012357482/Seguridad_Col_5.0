// GitHub Pages no reescribe rutas: 404.html = index.html permite abrir /registro, /panel, etc. directamente.
import { copyFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
copyFileSync(new URL("index.html", dist), new URL("404.html", dist));
console.log("dist/404.html creado (fallback SPA)");
