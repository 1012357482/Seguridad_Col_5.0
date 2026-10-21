import { obtenerClientId } from "./clientId";

/* Cliente HTTP de la API. VITE_API_URL vacío = mismo origen (dev con proxy o API sirviendo la PWA). */
export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public titulo: string,
    public detalle?: string,
  ) {
    super(detalle ?? titulo);
  }
}

export class SinConexionError extends Error {
  constructor() {
    super("Sin conexión");
  }
}

export const estaEnLinea = () => (typeof navigator === "undefined" ? true : navigator.onLine);

interface Opciones {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  form?: FormData;
  timeoutMs?: number;
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  if (!estaEnLinea()) throw new SinConexionError();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opciones.timeoutMs ?? 30_000);
  const headers: Record<string, string> = { "x-client-id": obtenerClientId() };
  if (opciones.body !== undefined) headers["content-type"] = "application/json";
  try {
    const res = await fetch(`${API_URL}${ruta}`, {
      method: opciones.method ?? (opciones.body !== undefined || opciones.form ? "POST" : "GET"),
      headers,
      body: opciones.form ?? (opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined),
      signal: ac.signal,
    });
    if (res.status === 204) return undefined as T;
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, datos.title ?? "Error del servicio", datos.detail);
    return datos as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (!estaEnLinea()) throw new SinConexionError();
    throw new ApiError(0, "No pudimos conectar con el servicio", ac.signal.aborted ? "El servicio tardó demasiado en responder." : undefined);
  } finally {
    clearTimeout(timer);
  }
}

/** Despierta la API (el plan gratuito la apaga tras inactividad). */
export function despertarApi() {
  if (estaEnLinea()) fetch(`${API_URL}/api/salud`).catch(() => undefined);
}
