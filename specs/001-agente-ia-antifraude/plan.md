# Implementation Plan: Agente IA facilitador de detección y orientación frente al fraude digital

**Branch**: `feature/ia-model` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-agente-ia-antifraude/spec.md`

**Alcance de este plan**: **Fase 1** — PWA responsive + API (US1–US7). La Fase 2 (US8, app Android con Capacitor, FR-032–FR-037) queda fuera; el diseño la deja preparada (research §12).

## Summary

Evolucionar el prototipo `index.html` ("Identifica tu fraude") a una **PWA instalable** con un **servicio de API** en un único repositorio. El análisis combina el motor de reglas explicables existente (movido a un paquete compartido que corre en el dispositivo y en el servidor), consultas autónomas a **fuentes abiertas** (Safe Browsing, URLhaus, RDAP, catálogo de entidades, reportes de comunidad) y un **agente LLM con herramientas** detrás de una capa de proveedor compatible con OpenAI (por defecto **Groq gratuito**, intercambiable por configuración). Se añaden audios y el flujo "Me llamaron", consentimiento explícito por análisis, registro de casos **encadenado y firmado** (Ed25519) con comprobante autoverificable sobre SQLite efímero, y gráficos **ECharts** (medidor animado, desglose, panel público). Despliegue con GitHub Actions: PWA en **GitHub Pages** (misma URL) y API en **Render** (Docker).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 22 LTS (API) y navegadores modernos (PWA)

**Primary Dependencies**: Front: React 18, Vite, vite-plugin-pwa (Workbox), Apache ECharts 5, Tesseract.js 5 (OCR en el dispositivo). API: Fastify 5, Zod, `openai` SDK (cliente OpenAI-compatible para Groq/Gemini/OpenRouter/Ollama), node:sqlite (integrado en Node 22), @fastify/rate-limit, @fastify/multipart, @fastify/cors, @fastify/helmet. Compartido: `packages/core` (reglas, redacción PII, tipos, JSON canónico, hashing)

**Storage**: SQLite (`node:sqlite`), archivo efímero — se acepta pérdida en cada despliegue (decisión del usuario); comprobantes firmados siguen siendo verificables

**Testing**: Vitest (core, API vía `fastify.inject`, componentes con Testing Library), Playwright (E2E móvil 360×800 Chromium/WebKit + escritorio), conjunto dorado ≥50 mensajes (SC-002), `AI_PROVIDER=mock` en CI; evaluación del agente con proveedor real solo en `eval-ia.yml` (PR que tocan agente/IA/reglas), nunca en `ci.yml`

**Target Platform**: Navegadores modernos en Android, iOS, Windows, macOS (PWA instalable); API en contenedor Linux (Render free)

**Project Type**: Aplicación web (PWA + API) en monorepo npm workspaces

**Performance Goals**: Veredicto < 15 s p95 texto/enlace, < 30 s con captura, < 45 s audio de 1 min (SC-001, SC-012); presupuesto IA 12 s, fuentes 4 s c/u en paralelo; veredicto local < 1 s

**Constraints**: Costo 0 (SC-008); sin enviar evidencia sin consentimiento (FR-020); imagen nunca sale del dispositivo; PII redactada antes de salir (FR-021); funciona sin conexión con reglas (FR-029c); legible desde 360 px; API gratuita se duerme tras 15 min (mitigado con keepalive + PWA estática)

**Scale/Scope**: PoC: decenas de usuarios concurrentes, < 2.000 análisis/día (límite diario del plan gratuito de IA); ~8 vistas (Inicio, Analizar, Me llamaron, Resultado, Verificar entidad, Permisos, Registro, Panel)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` **v1.0.0** (ratificada 2026-10-20).

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Privacidad por defecto | Consentimiento por análisis; `redactPII` en cliente y servidor, incluidos query/fragmento de URLs; Safe Browsing por prefijos de hash; imagen y audio no se guardan; registro solo con huellas; borrar historial | PASS |
| II. Veredictos explicables y honestos | Motivos con origen y fecha; "sin datos suficientes"; aviso de orientación; el servidor no arranca con `AI_PROVIDER=mock` en producción | PASS |
| III. Siempre hay orientación | Reglas locales offline/sin consentimiento; IA y fuentes con timeout → veredicto igual; fusión por máximo | PASS |
| IV. Independencia de proveedor y costo | Capa `AiProvider` por configuración; proveedor/modelo en cada caso; Groq gratis con términos a verificar y publicar en el aviso; keepalive acotado para costo 0; secretos solo en entorno | PASS |
| V. Simplicidad, lógica compartida y calidad | `packages/core` único; 3 workspaces; conjunto dorado en CI (reglas) y `eval-ia.yml` obligatorio para cambios de agente/IA/reglas con proveedor real; CI sin cuota real | PASS |
| Seguridad y manejo de datos | Evidencia no confiable + herramientas de solo lectura; enlaces no se abren; rate-limit + Zod; casos encadenados y firmados; estadísticas con k≥3 | PASS |
| Flujo y puertas de calidad | CI obligatorio y despliegue solo desde `main` verde; 360 px y accesibilidad; aviso de privacidad en el mismo cambio | PASS |

**Re-check post-diseño**: PASS (tras aplicar las remediaciones de `/speckit-analyze` D1–D5).

## Project Structure

### Documentation (this feature)

```text
specs/001-agente-ia-antifraude/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones y fuentes
├── data-model.md        # Fase 1: entidades, tablas, flujo
├── quickstart.md        # Fase 1: puesta en marcha y 21 escenarios de validación
├── contracts/
│   ├── api.openapi.yaml # Contrato HTTP de la API
│   ├── ai-provider.md   # Interfaz de proveedor IA, herramientas y esquema de salida
│   └── case-receipt.md  # Comprobante, JSON canónico y verificación
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — no creado aquí)
```

### Source Code (repository root)

```text
package.json                     # npm workspaces + scripts raíz (dev, test, build, eval)
Dockerfile                       # build multi-stage: core → web → api (SERVE_WEB opcional)
render.yaml                      # blueprint del servicio API en Render
.github/workflows/
├── ci.yml                       # lint, typecheck, test, e2e, build (PR y push)
├── deploy.yml                   # main: CI ok → Pages (web) + deploy hook Render (api)
└── keepalive.yml                # cron */14 → GET /api/salud
legacy/index.html                # prototipo original conservado como referencia

packages/core/                   # TS puro, sin dependencias de Node ni DOM
├── src/
│   ├── rules/                   # reglas migradas de index.html (urgencia, datos, suplantación, enlaces, manipulación, voz)
│   ├── analyzeLocal.ts          # veredicto solo con reglas (offline / sin consentimiento)
│   ├── merge.ts                 # fusión reglas + IA + fuentes (max, discrepancia)
│   ├── redactPII.ts
│   ├── canonical.ts             # JSON canónico (RFC 8785)
│   ├── hash.ts                  # normalize + SHA-256 (WebCrypto)
│   ├── guidance.ts              # qué hacer / dónde denunciar
│   └── types.ts                 # esquemas Zod compartidos
├── data/entidades.json
└── test/ (unit + fixtures/golden.json + eval.ts)

apps/api/
├── src/
│   ├── server.ts                # Fastify, plugins, CORS, rate-limit, estáticos opcionales
│   ├── routes/                  # analisis, transcripciones, entidades, casos, comprobantes, reportes, estadisticas, config, salud, consentimientos
│   ├── agent/                   # planner determinista + bucle de tool calling + prompt
│   ├── ai/                      # AiProvider, OpenAiCompatibleProvider, MockProvider, factory
│   ├── sources/                 # safeBrowsing, urlhaus, rdap, entidades, comunidad
│   ├── registry/                # cadena, firma Ed25519, verificación
│   └── db/                      # conexión SQLite, migrations/*.sql, repositorios
└── test/ (contract/ con fastify.inject, integration/)

apps/web/
├── public/ (íconos, manifest assets)
├── src/
│   ├── pages/                   # Inicio, Analizar, MeLlamaron, Resultado, Entidad, Permisos, Registro, Panel
│   ├── components/
│   │   ├── charts/              # RiskGauge, SignalBreakdown, TrendCharts, KpiCounter (ECharts)
│   │   ├── ConsentDialog.tsx
│   │   └── EvidenceInput/       # texto, captura (OCR), audio, dictado
│   ├── services/                # apiClient, ocr, speech, clientId, receipts
│   ├── theme/                   # tokens morado/verde, claro/oscuro
│   └── sw/                      # share target + caché offline
└── e2e/ (Playwright)
```

**Structure Decision**: Monorepo con **npm workspaces** y tres paquetes: `packages/core` contiene la lógica que debe ser idéntica en dispositivo y servidor (reglas, PII, hashing, tipos) y será reutilizada por la app Android en Fase 2; `apps/web` es la PWA; `apps/api` es el servicio. Un único `Dockerfile` permite desplegar todo como una sola imagen si se prefiere a Pages + Render. El `index.html` actual se mueve a `legacy/` como referencia hasta que la PWA lo reemplace en Pages.

## Fases de entrega sugeridas (insumo para /speckit-tasks)

1. **Base**: monorepo, CI, `packages/core` con reglas migradas + conjunto dorado + PWA mínima (paridad con el HTML actual, offline) → desplegable en Pages.
2. **US1**: API, proveedor IA (mock + Groq), consentimiento, fusión, nuevo resultado con medidor.
3. **US2**: fuentes abiertas y reportes de comunidad reales.
4. **US3**: registro firmado, comprobante, verificación.
5. **US7**: audio, dictado, "Me llamaron".
6. **US4**: desglose y panel público.
7. **US5/US6**: validación de cambio de proveedor; deploy.yml + Render + keepalive.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambios en límites/nombres de modelos gratuitos | Config por entorno; `mock`/`none`; documentar alternativa OpenRouter/Gemini |
| Arranque en frío de Render (~1 min) | Keepalive + PWA estática + veredicto local inmediato mientras llega el de la API |
| Safe Browsing solo no comercial | Mantener la PoC no comercial; migrar a Web Risk si cambia |
| Falsos positivos de la IA | max() solo sube el nivel con motivos visibles; conjunto dorado mide especificidad ≥80 % |
| Datos perdidos en redespliegue | Aceptado; comprobante firmado autoverificable + aviso en Registro |
| Supuesto: el HTML actual está en GitHub Pages | Verificar en Settings → Pages; si no, ajustar solo el job web de deploy.yml |

## Complexity Tracking

Sin violaciones (constitución sin principios ratificados). Única complejidad añadida conscientemente: firma Ed25519 de casos, justificada por la verificabilidad de comprobantes cuando la base SQLite es efímera.
