import { entidadesMencionadas } from "../entidades";
import type { Motivo } from "../types";
import { motivoRegla, type Regla } from "./types";

// Señales de fraude telefónico (vishing) en relatos de llamada y transcripciones de audio.
const VISHING_TEXTO = [
  /(le|te) habla(mos)? (del|de la) (área|departamento|oficina) de (seguridad|fraudes|cobranza)/i,
  /(d[ií]ctame|d[ií]game|me confirma|me regala|me da) (el|su|tu) (c[oó]digo|clave|token)/i,
  /(instale|instala|descargue|descarga) (la aplicaci[oó]n |la app )?(anydesk|teamviewer|quicksupport|rustdesk|airdroid)/i,
  /(movimiento|compra|transacci[oó]n) (sospechos[ao]|no reconocid[ao]).{0,60}(c[oó]digo|clave|confirm)/i,
  /cuenta (segura|de respaldo|espejo)/i,
];

export const reglaVoz: Regla = ({ texto, relato }) => {
  const motivos: Motivo[] = [];
  if (VISHING_TEXTO.some((p) => p.test(texto))) {
    motivos.push(motivoRegla("voz", "Sigue el guion típico de llamadas falsas de 'seguridad bancaria'.", 3));
  }
  if (!relato) return motivos;

  const pidio = new Set(relato.quePidio);
  if (pidio.has("clave") || pidio.has("codigo")) {
    motivos.push(motivoRegla("voz", "En la llamada te pidieron claves o códigos. Ninguna entidad los pide por teléfono.", 3));
  }
  if (pidio.has("datos_tarjeta")) {
    motivos.push(motivoRegla("voz", "Te pidieron datos de tu tarjeta por teléfono.", 3));
  }
  if (pidio.has("transferencia")) {
    motivos.push(motivoRegla("voz", "Te pidieron transferir dinero o moverlo a otra cuenta.", 3));
  }
  if (pidio.has("instalar_app")) {
    motivos.push(motivoRegla("voz", "Te pidieron instalar una aplicación: podría dar control de tu teléfono a terceros.", 3));
  }
  if (relato.huboPresion) {
    motivos.push(motivoRegla("urgencia", "Hubo presión o urgencia durante la llamada.", 2));
  }
  if (relato.quienDijoSer && (entidadesMencionadas(relato.quienDijoSer).length || /banco|polic|fiscal|dian|asesor/i.test(relato.quienDijoSer))) {
    motivos.push(motivoRegla("suplantacion", "Quien llamó dijo ser de una entidad. Verifícalo llamando tú al número oficial.", 1));
  }
  return motivos;
};
