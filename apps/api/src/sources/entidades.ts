import { entidadImitada, entidadPorDominioOficial, verificarCanal } from "@itf/core";
import type { ResultadoParcial } from "./runSource";

/* Catálogo de entidades oficiales (packages/core/data/entidades.json). */

export function revisarDominio(host: string): ResultadoParcial | null {
  const oficial = entidadPorDominioOficial(host);
  if (oficial) return { resultado: "limpio", detalle: `Es un dominio oficial de ${oficial.nombre}.` };
  const imitada = entidadImitada(host);
  if (imitada) {
    return {
      resultado: "senal",
      detalle: `El dominio imita a ${imitada.nombre}; sus dominios oficiales son ${imitada.dominios.map((d) => d.valor).join(", ")}.`,
    };
  }
  return null;
}

export function revisarNumero(valor: string): ResultadoParcial {
  const r = verificarCanal(valor);
  if (r.resultado === "coincide_oficial") {
    return { resultado: "limpio", detalle: `Coincide con un canal oficial de ${r.entidad!.nombre}.` };
  }
  if (r.resultado === "no_coincide") {
    return {
      resultado: "senal",
      detalle: `Dice ser de ${r.entidad!.nombre}, pero no está entre sus canales oficiales cargados.`,
    };
  }
  return {
    resultado: "sin_datos",
    detalle: "No hay datos suficientes de canales oficiales para este remitente. Esto no indica que sea falso.",
  };
}
