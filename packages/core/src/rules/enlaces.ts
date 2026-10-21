import { entidadImitada, entidadPorDominioOficial } from "../entidades";
import { hostDe } from "../extract";
import type { Motivo } from "../types";
import { motivoRegla, type Regla } from "./types";

// Migrado de DOMINIOS_SOSPECHOSOS, ACORTADORES y analizarEnlace (legacy/index.html).
const DOMINIOS_SOSPECHOSOS = [".xyz", ".top", ".click", ".zip", ".mov", ".gq", ".tk", ".ml", ".cf", ".lat", ".vip", ".shop", ".live", ".online", ".site"];
const ACORTADORES = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy", "acortar.link", "shorturl.at", "t.ly", "s.id"];
const PALABRAS_SENUELO = /(banco|seguro|login|verifica|validar|actualiza|soporte|premio|devolucion|desbloqueo|clientes)/i;

export function analizarEnlace(url: string): { host: string; motivos: Motivo[] } {
  const motivos: Motivo[] = [];
  const host = hostDe(url);
  if (!host) return { host, motivos: [motivoRegla("enlace", "No se pudo interpretar el enlace.", 1)] };

  if (/^http:\/\//i.test(url)) motivos.push(motivoRegla("enlace", "El enlace no usa conexión segura (http).", 1));
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    motivos.push(motivoRegla("enlace", "El enlace usa una dirección IP en vez de un nombre de sitio.", 3));
  }
  if (DOMINIOS_SOSPECHOSOS.some((t) => host.endsWith(t))) {
    motivos.push(motivoRegla("enlace", `La terminación del dominio (${host.slice(host.lastIndexOf("."))}) es poco usada para servicios oficiales.`, 2));
  }
  if (ACORTADORES.some((a) => host === a || host.endsWith(`.${a}`))) {
    motivos.push(motivoRegla("enlace", "Es un enlace acortado: no se ve a dónde lleva realmente.", 2));
  }
  const imita = entidadImitada(host);
  if (imita) {
    const oficiales = imita.dominios.map((d) => d.valor).join(", ");
    motivos.push(
      motivoRegla("enlace", `El enlace usa el nombre de ${imita.nombre}, pero no es su dominio oficial (${oficiales}).`, 3),
    );
  } else if (PALABRAS_SENUELO.test(host) && !entidadPorDominioOficial(host) && !/\.(gov\.co|com\.co)$/.test(host)) {
    motivos.push(motivoRegla("enlace", "El nombre del sitio usa palabras para generar confianza, pero no es un sitio oficial conocido.", 2));
  }
  if (host.split(".").length > 4) {
    motivos.push(motivoRegla("enlace", "El dominio tiene demasiados subniveles, algo común en sitios falsos.", 1));
  }
  return { host, motivos };
}

export const reglaEnlaces: Regla = ({ enlaces }) => enlaces.flatMap((e) => analizarEnlace(e).motivos);
