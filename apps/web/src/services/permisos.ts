import { useCallback, useEffect, useState } from "react";

/* Permisos opcionales, separados y revocables (heredados del prototipo, sin el filtro de SMS). */
export interface Permisos {
  verificadorEnlaces: boolean;
  guardarRegistro: boolean;
}

const CLAVE = "itf.permisos";
const EVENTO = "itf:permisos";
const POR_DEFECTO: Permisos = { verificadorEnlaces: true, guardarRegistro: false };

export function leerPermisos(): Permisos {
  try {
    return { ...POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? "{}") };
  } catch {
    return POR_DEFECTO;
  }
}

export function guardarPermisos(p: Permisos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* almacenamiento bloqueado: el permiso dura solo esta sesión */
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: p }));
}

export function usePermisos() {
  const [permisos, setPermisos] = useState<Permisos>(leerPermisos);
  useEffect(() => {
    const actualizar = (e: Event) => setPermisos((e as CustomEvent<Permisos>).detail ?? leerPermisos());
    window.addEventListener(EVENTO, actualizar);
    return () => window.removeEventListener(EVENTO, actualizar);
  }, []);
  const cambiar = useCallback((parcial: Partial<Permisos>) => {
    const nuevo = { ...leerPermisos(), ...parcial };
    guardarPermisos(nuevo);
    setPermisos(nuevo);
  }, []);
  return [permisos, cambiar] as const;
}
