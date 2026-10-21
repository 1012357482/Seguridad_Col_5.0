import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    // Las fuentes abiertas reales nunca se consultan en pruebas: fetch se simula por archivo.
    unstubGlobals: true,
    setupFiles: ["test/setup.ts"],
    poolOptions: { forks: { execArgv: ["--disable-warning=ExperimentalWarning"] } },
  },
});
