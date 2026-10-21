import type { AiProvider } from "./ai/types";
import type { Config } from "./config";
import type { CasesRepo } from "./db/casesRepo";
import type { ConsentsRepo } from "./db/consentsRepo";
import type { Db } from "./db/index";
import type { ReportsRepo } from "./db/reportsRepo";
import type { Firmador } from "./registry/keys";

export interface AppDeps {
  config: Config;
  db: Db;
  ai: AiProvider | null;
  consents: ConsentsRepo;
  cases: CasesRepo;
  reports: ReportsRepo;
  firmador: Firmador;
}

/** Versión del texto de consentimiento mostrado en la PWA. */
export const TEXTO_CONSENTIMIENTO_VERSION = "2026-10-20";
