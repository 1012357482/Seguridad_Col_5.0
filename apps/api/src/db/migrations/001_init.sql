-- Esquema inicial (data-model.md §4–§6). SQLite efímero en la PoC.

CREATE TABLE IF NOT EXISTS consents (
  id            TEXT PRIMARY KEY,
  owner_hash    TEXT NOT NULL,
  otorgado_en   TEXT NOT NULL,
  alcance       TEXT NOT NULL CHECK (alcance IN ('analisis_ia', 'transcripcion')),
  proveedor     TEXT NOT NULL,
  texto_version TEXT NOT NULL,
  usado_en      TEXT
);
CREATE INDEX IF NOT EXISTS idx_consents_owner ON consents(owner_hash);

CREATE TABLE IF NOT EXISTS cases (
  seq              INTEGER PRIMARY KEY AUTOINCREMENT,
  id               TEXT NOT NULL UNIQUE,
  owner_hash       TEXT NOT NULL,
  creado_en        TEXT NOT NULL,
  huella_evidencia TEXT NOT NULL,
  tipo_evidencia   TEXT NOT NULL,
  veredicto_json   TEXT NOT NULL,
  consent_id       TEXT REFERENCES consents(id),
  previa_owner     TEXT NOT NULL,
  previa_global    TEXT NOT NULL,
  hash_entrada     TEXT NOT NULL UNIQUE,
  firma            TEXT NOT NULL,
  clave_id         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_hash, seq);
CREATE INDEX IF NOT EXISTS idx_cases_huella ON cases(owner_hash, huella_evidencia);

-- Borrados declarados por "Borrar todo mi historial": permiten distinguirlos de una manipulación.
CREATE TABLE IF NOT EXISTS deleted_ranges (
  hash_entrada TEXT PRIMARY KEY,
  borrado_en   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_reports (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  indicador     TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('dominio', 'numero')),
  reporter_hash TEXT NOT NULL,
  modalidad     TEXT,
  entidad       TEXT,
  creado_en     TEXT NOT NULL,
  UNIQUE (indicador, reporter_hash)
);
CREATE INDEX IF NOT EXISTS idx_reports_indicador ON community_reports(indicador, creado_en);
