import type { Entidad } from "./entidades";
import type { CanalDenuncia, Nivel, RelatoLlamada } from "./types";

// Migrado de QUE_HACER (legacy/index.html).
export const QUE_HACER: Record<Nivel, string[]> = {
  bajo: [
    "No se detectaron señales claras de fraude, pero no compartas claves ni códigos.",
    "Si dudas, comunícate con la entidad por su canal oficial, no con los datos del mensaje.",
  ],
  medio: [
    "No hagas clic en los enlaces ni respondas el mensaje.",
    "Comunícate con la entidad usando el número o la app oficial que ya tienes guardados.",
    "Si ya diste algún dato, cambia tu clave y avisa a tu entidad de inmediato.",
  ],
  alto: [
    "No hagas clic, no respondas y no descargues nada.",
    "Si ingresaste datos, cambia tu clave desde la app oficial y bloquea tu tarjeta.",
    "Comunícate con tu entidad por su canal oficial y denuncia el caso.",
  ],
};

/** Pasos urgentes cuando la persona ya entregó datos o dinero (US7, edge case). */
export function pasosUrgentes(relato?: RelatoLlamada): string[] {
  if (!relato || relato.entregoAlgo === "nada") return [];
  const pasos: string[] = [];
  if (relato.entregoAlgo === "datos" || relato.entregoAlgo === "ambos") {
    pasos.push("Bloquea ya tus tarjetas y productos desde la app oficial o la línea que aparece en tu tarjeta.");
    pasos.push("Cambia tus claves y desinstala cualquier aplicación que te hayan pedido instalar.");
  }
  if (relato.entregoAlgo === "dinero" || relato.entregoAlgo === "ambos") {
    pasos.push("Llama de inmediato a tu entidad para reportar la transferencia y pedir que intenten detenerla.");
  }
  pasos.push("Denuncia lo antes posible: entre más rápido, más opciones hay de recuperar el dinero.");
  return pasos;
}

export const AVISO_ORIENTACION =
  "Esta herramienta orienta; no reemplaza a tu entidad financiera ni a las autoridades.";

export function canalesDenuncia(entidad?: Entidad): CanalDenuncia[] {
  const canales: CanalDenuncia[] = [
    {
      nombre: "Denuncia virtual (ADenunciar) — Policía Nacional y Fiscalía",
      url: "https://www.policia.gov.co/denuncia-virtual",
    },
    {
      nombre: "CAI Virtual — Centro Cibernético Policial",
      url: "https://caivirtual.policia.gov.co",
    },
    {
      nombre: "Fiscalía General de la Nación",
      url: "https://www.fiscalia.gov.co",
    },
  ];
  if (entidad && entidad.tipo !== "autoridad" && entidad.dominios[0]) {
    canales.unshift({
      nombre: `${entidad.nombre} (canal oficial)`,
      url: entidad.dominios[0].fuente,
      detalle: "Usa el número o la app oficial que ya tienes, no los datos del mensaje.",
    });
  }
  return canales;
}
