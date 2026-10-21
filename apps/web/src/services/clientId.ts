/* Identificador anónimo del dispositivo (UUID v4). No es una cuenta: si se borran los datos del
   navegador se genera uno nuevo y el historial anterior deja de estar asociado a este dispositivo. */

const CLAVE = "itf.clientId";
let enMemoria: string | null = null;

export function obtenerClientId(): string {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado) return guardado;
    const nuevo = crypto.randomUUID();
    localStorage.setItem(CLAVE, nuevo);
    return nuevo;
  } catch {
    enMemoria ??= crypto.randomUUID();
    return enMemoria;
  }
}
