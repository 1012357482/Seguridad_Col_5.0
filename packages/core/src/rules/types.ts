import type { Categoria, Motivo, RelatoLlamada } from "../types";

export interface ContextoReglas {
  texto: string;
  enlaces: string[];
  relato?: RelatoLlamada;
}

export type Regla = (ctx: ContextoReglas) => Motivo[];

export const motivoRegla = (categoria: Categoria, texto: string, puntos: number): Motivo => ({
  texto,
  origen: "regla",
  categoria,
  puntos,
});

export const algunoCoincide = (patrones: RegExp[], texto: string) => patrones.some((p) => p.test(texto));
