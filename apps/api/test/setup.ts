import { beforeEach, vi } from "vitest";

// Las pruebas nunca consultan fuentes reales: por defecto la red falla y cada prueba simula lo que necesite.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("red deshabilitada en pruebas");
    }),
  );
});
