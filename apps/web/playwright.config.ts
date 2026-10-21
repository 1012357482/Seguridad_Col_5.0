import { defineConfig, devices } from "@playwright/test";

/* E2E contra la PWA compilada (vite preview) y la API con IA simulada.
   Proyectos: móvil 360×800 (Chromium y WebKit) y escritorio (FR-029, SC-010). */
const API_PORT = 8799;
const WEB_PORT = 4173;
const soloChromium = !!process.env.E2E_SOLO_CHROMIUM;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "movil-chromium", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } } },
    ...(soloChromium ? [] : [{ name: "movil-webkit", use: { ...devices["iPhone 12"], viewport: { width: 360, height: 800 } } }]),
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npm run start -w @itf/api",
      cwd: "../..",
      url: `http://localhost:${API_PORT}/api/salud`,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(API_PORT),
        NODE_ENV: "test",
        AI_PROVIDER: "mock",
        DB_PATH: ":memory:",
        CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
        SOURCE_TIMEOUT_MS: "1500",
        RATE_LIMIT_ANALISIS: "1000",
        RATE_LIMIT_GLOBAL: "5000",
      },
    },
    {
      command: `npx vite build && npx vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
