# Identifica tu fraude

Agente de IA que actúa como **facilitador autónomo de detección y orientación frente al fraude digital** en Colombia.
Analiza mensajes, enlaces, capturas, notas de voz y relatos de llamadas; los contrasta con fuentes abiertas; explica el
riesgo (bajo, medio o alto), qué hacer y dónde denunciar; y deja un **registro trazable y verificable** de cada caso.

> Prueba de concepto. Orienta; no reemplaza a las entidades financieras ni a las autoridades.

## Cómo funciona

```text
PWA (React + Vite, instalable, offline)          API (Fastify + Node 22)
┌──────────────────────────────┐   consentimiento   ┌──────────────────────────────────────┐
│ reglas locales (@itf/core)   │ ───────────────▶  │ reglas + fuentes abiertas + agente IA │
│ OCR de capturas en el equipo │   texto con datos  │  Safe Browsing · URLhaus · RDAP       │
│ huella SHA-256 del mensaje   │   personales       │  entidades oficiales · comunidad      │
│ medidor y gráficos ECharts   │   ocultos          │ casos firmados Ed25519 (SQLite)       │
└──────────────────────────────┘                    └──────────────────────────────────────┘
```

- **Siempre hay veredicto**: sin conexión, sin consentimiento o si la IA falla, decide el motor de reglas.
- **Privacidad por defecto**: nada sale del dispositivo sin consentimiento en cada análisis; claves, códigos, tarjetas,
  documentos y parámetros de enlaces se ocultan antes; el mensaje nunca se guarda (solo su huella).
- **IA intercambiable**: Groq gratuito por defecto; Gemini, OpenRouter, OpenAI u Ollama cambiando variables de entorno
  ([docs/proveedores-ia.md](docs/proveedores-ia.md)).

## Estructura

| Carpeta | Contenido |
|---|---|
| `packages/core` | Reglas explicables, redacción de datos personales, huellas, JSON canónico y tipos compartidos |
| `apps/api` | API Fastify: análisis, agente con herramientas, fuentes abiertas, registro firmado, estadísticas |
| `apps/web` | PWA: análisis, "Me llamaron", verificar entidad, registro, panel, permisos |
| `legacy/index.html` | Prototipo original |
| `specs/001-agente-ia-antifraude` | Especificación, plan, contratos y tareas (Spec Kit) |

## Desarrollo

Requiere Node.js ≥ 22.13.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # AI_PROVIDER=mock funciona sin claves
npm run dev                               # API :8787 · PWA :5173
```

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas unitarias y de contrato (IA simulada, sin red) |
| `npm run eval` | Conjunto dorado de 60 mensajes (meta: detección ≥ 90 %, especificidad ≥ 80 %) |
| `npm run test:e2e` | Playwright en móvil 360 px y escritorio |
| `npm run lint` · `npm run typecheck` | Calidad estática |
| `npm run build` | PWA en `apps/web/dist` |

## Despliegue

GitHub Actions publica la PWA en GitHub Pages y la API en Render solo si CI pasa. Ver [docs/despliegue.md](docs/despliegue.md).

## Fase 2

App Android (la misma PWA empaquetada con Capacitor) con detección automática de SMS, mensajes de chat y llamadas de
números reportados. Ver `specs/001-agente-ia-antifraude/spec.md` (US8).
