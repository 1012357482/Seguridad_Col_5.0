import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

/* SQLite integrado en Node 22 (node:sqlite): sin módulos nativos que compilar.
   En la PoC el archivo es efímero: se pierde en cada despliegue (decisión aceptada). */

export type Db = DatabaseSync;

const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations", import.meta.url));

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, aplicada_en TEXT NOT NULL)");
  const aplicadas = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]).map((r) => r.id),
  );
  const archivos = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    transaction(db, () => {
      db.exec(readFileSync(`${MIGRATIONS_DIR}/${archivo}`, "utf8"));
      db.prepare("INSERT INTO schema_migrations (id, aplicada_en) VALUES (?, ?)").run(archivo, new Date().toISOString());
    });
  }
}

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
