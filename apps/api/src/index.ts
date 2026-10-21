import { loadConfig } from "./config";
import { buildServer } from "./server";

const config = loadConfig();
const app = await buildServer({ config });

try {
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`IA: ${app.deps.ai ? `${app.deps.ai.id} (${app.deps.ai.model})` : "desactivada"}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0));
  });
}
