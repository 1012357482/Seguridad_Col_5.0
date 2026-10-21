import catalogo from "../data/entidades.json";
import { normalizarNumero } from "./extract";

export interface CanalOficial {
  tipo: string;
  valor: string;
  fuente: string;
  verificado: string | null;
}

export interface Entidad {
  id: string;
  nombre: string;
  tipo: string;
  alias: string[];
  dominios: { valor: string; fuente: string; verificado: string | null }[];
  canales: CanalOficial[];
}

export const ENTIDADES: Entidad[] = catalogo.entidades as Entidad[];
export const VERSION_ENTIDADES: string = catalogo.version;

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Entidades mencionadas en un texto (por alias). */
export function entidadesMencionadas(texto: string): Entidad[] {
  const t = sinTildes(texto);
  return ENTIDADES.filter((e) => e.alias.some((a) => t.includes(sinTildes(a))));
}

/** ¿El host pertenece a un dominio oficial de alguna entidad? */
export function entidadPorDominioOficial(host: string): Entidad | undefined {
  const h = host.toLowerCase();
  return ENTIDADES.find((e) => e.dominios.some((d) => h === d.valor || h.endsWith(`.${d.valor}`)));
}

/** ¿El host imita a una entidad (contiene su alias) sin ser su dominio oficial? */
export function entidadImitada(host: string): Entidad | undefined {
  if (entidadPorDominioOficial(host)) return undefined;
  const tokens = sinTildes(host).split(/[-_.]+/).filter(Boolean);
  // Alias cortos (p. ej. "dian") deben coincidir con un token completo para no confundir "meridian".
  const coincide = (alias: string) => {
    const a = sinTildes(alias).replace(/\s+/g, "");
    return tokens.some((t) => (a.length >= 5 ? t.includes(a) : t === a));
  };
  return ENTIDADES.find((e) => e.alias.some(coincide));
}

export type ResultadoCanal = "coincide_oficial" | "no_coincide" | "sin_datos";

/** Compara un remitente o número contra los canales oficiales cargados (FR-013). */
export function verificarCanal(valor: string): { resultado: ResultadoCanal; entidad?: Entidad } {
  const v = valor.trim();
  const digitos = normalizarNumero(v).replace(/\D/g, "");
  const porCanal = ENTIDADES.find((e) =>
    e.canales.some((c) => {
      const cd = normalizarNumero(c.valor).replace(/\D/g, "");
      return (digitos && cd && cd === digitos) || sinTildes(c.valor) === sinTildes(v);
    }),
  );
  if (porCanal) return { resultado: "coincide_oficial", entidad: porCanal };
  const porNombre = entidadesMencionadas(v)[0];
  if (porNombre && porNombre.canales.length > 0) return { resultado: "no_coincide", entidad: porNombre };
  return { resultado: "sin_datos", entidad: porNombre };
}
