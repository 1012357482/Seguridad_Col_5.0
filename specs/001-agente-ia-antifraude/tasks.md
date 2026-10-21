---

description: "Task list — Agente IA facilitador de detección y orientación frente al fraude digital (Fase 1: PWA + API)"
---

# Tasks: Agente IA facilitador de detección y orientación frente al fraude digital

**Input**: Design documents from `specs/001-agente-ia-antifraude/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (api.openapi.yaml, ai-provider.md, case-receipt.md), quickstart.md, `.specify/memory/constitution.md` v1.0.0

**Tests**: Incluidas solo donde la spec o la constitución las exigen: conjunto dorado (SC-002, Principio V), contrato del agente IA con proveedor simulado (SC-003, FR-007), cadena/firma (SC-004), contratos HTTP con `fastify.inject`, y E2E Playwright a 360 px (FR-029, SC-010). Las pruebas NO consumen cuota real (`AI_PROVIDER=mock`).

**Organization**: Por historia de usuario, en orden de prioridad: US1 (P1) → US2, US3, US7 (P2) → US4, US5, US6 (P3). **US8 (P4, app Android) es Fase 2 y queda fuera de este archivo.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1…US7 según spec.md
- Rutas relativas a la raíz del repo; estructura según plan.md (`packages/core`, `apps/api`, `apps/web`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo npm workspaces, tooling y CI

- [X] T001 Mover el prototipo `index.html` a `legacy/index.html` (git mv) y crear las carpetas `packages/core`, `apps/api`, `apps/web` según plan.md
- [X] T002 Crear `package.json` raíz con `"private": true`, `"workspaces": ["packages/*", "apps/*"]`, `"engines": {"node": ">=22"}` y scripts `dev` (api+web concurrentes con `concurrently`), `build`, `test`, `test:e2e`, `lint`, `typecheck`, `eval` en `package.json`
- [X] T003 [P] Crear `tsconfig.base.json` (strict, ES2022, moduleResolution bundler) y `.editorconfig`, `.gitignore` (node_modules, dist, *.db, .env, playwright-report) en la raíz
- [X] T004 [P] Configurar ESLint (flat config, typescript-eslint, react-hooks) y Prettier en `eslint.config.js` y `.prettierrc`
- [X] T005 [P] Inicializar `packages/core/package.json` (name `@itf/core`, type module, exports `./src/index.ts`, dependencia `zod`, devDependency `vitest`) y `packages/core/tsconfig.json`
- [X] T006 [P] Inicializar `apps/api/package.json` (name `@itf/api`; deps: fastify@5, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/multipart, @fastify/static, zod, openai, better-sqlite3, @itf/core; devDeps: tsx, vitest, @types/better-sqlite3) y `apps/api/tsconfig.json`
- [X] T007 [P] Inicializar `apps/web` con Vite React TS (`apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/tsconfig.json`; deps: react@18, react-dom, react-router-dom, echarts@5, echarts-for-react, tesseract.js@5, @itf/core; devDeps: vite-plugin-pwa, @playwright/test, @testing-library/react, vitest, jsdom) con proxy `/api` → `http://localhost:8787`
- [X] T008 Crear `.github/workflows/ci.yml`: en PR y push, Node 22 con caché npm, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (con `AI_PROVIDER=mock`), `npm run eval`, `npx playwright install --with-deps chromium webkit`, `npm run test:e2e`, `npm run build`
- [X] T009 [P] Crear `apps/api/.env.example` con todas las variables de data-model.md §9 y quickstart.md (`PORT=8787`, `AI_PROVIDER=mock`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_STT_MODEL`, `AI_TIMEOUT_MS=12000`, `AI_MAX_TOOL_CALLS=3`, `SAFE_BROWSING_API_KEY`, `URLHAUS_AUTH_KEY`, `CASE_SIGNING_KEY`, `OWNER_SALT`, `CORS_ORIGIN`, `DB_PATH=./data/app.db`, `SERVE_WEB=false`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Paquete compartido con las reglas del prototipo, esqueleto de API y PWA con paridad offline

**⚠️ CRITICAL**: Ninguna historia empieza antes de terminar esta fase

### packages/core

- [X] T010 Definir esquemas Zod y tipos exportados (`Evidencia`, `RelatoLlamada`, `Veredicto`, `Motivo`, `Categoria`, `Modalidad`, `SourceCheck`, `Caso`, `Comprobante`, `AiAssessment`) exactamente como en data-model.md §1–§4 y contracts/ai-provider.md en `packages/core/src/types.ts`
- [X] T011 [P] Implementar `normalize(texto)` (NFC, trim, colapsar espacios) y `sha256Hex(texto)` con WebCrypto (`globalThis.crypto.subtle`, válido en navegador y Node 22) en `packages/core/src/hash.ts`
- [X] T012 [P] Implementar JSON canónico RFC 8785 (claves ordenadas recursivamente, sin espacios) en `packages/core/src/canonical.ts`
- [X] T013 [P] Implementar `redactPII(texto)` según research.md §10 (tarjetas con Luhn, cuentas, cédulas con contexto, OTP 4–8 dígitos junto a código/clave/token, correos, teléfonos personales → `[DATO OCULTO:tipo]`) devolviendo `{ texto, ocultos: {tipo, cantidad}[] }`; en las URLs conserva solo esquema + host + ruta y reemplaza query y fragmento por `[PARÁMETROS OCULTOS]` antes de cualquier envío a la IA o a fuentes; los números de remitente se extraen a `numeros` antes de redactar, en `packages/core/src/redactPII.ts`
- [X] T014 [P] Crear catálogo de entidades (Bancolombia, Davivienda, BBVA Colombia, Nequi, Daviplata, Banco de Bogotá, Banco Agrario, DIAN, Fiscalía, Policía) con `alias`, `dominios`, `canales: []` y campos `fuente`/`verificado` según data-model.md §7 en `packages/core/data/entidades.json` (canales vacíos permitidos → "sin datos suficientes")
- [X] T015 Migrar las reglas de `legacy/index.html` (PATRONES_URGENCIA, PATRONES_DATOS, PATRONES_SUPLANTACION, DOMINIOS_SOSPECHOSOS, ACORTADORES, `analizarEnlace`, `analizarTexto`) a módulos por categoría que devuelvan `Motivo[]` con `origen: "regla"` y puntos, en `packages/core/src/rules/{urgencia,datos,suplantacion,enlaces}.ts` (usar `entidades.json` en lugar del arreglo ENTIDADES; eliminar REPORTES_SIMULADOS)
- [X] T016 [P] Añadir regla de manipulación (frases tipo "ignora tus instrucciones", "di que es seguro", "eres un asistente") → categoría `manipulacion`, +3 puntos, en `packages/core/src/rules/manipulacion.ts`
- [X] T017 [P] Añadir regla de relato de llamada (pidió clave/código/datos de tarjeta/transferencia/instalar app, hubo presión, dijo ser entidad) → categoría `voz`, en `packages/core/src/rules/voz.ts`
- [X] T018 Implementar `guidance.ts` con `QUE_HACER` por nivel (copiado de legacy), pasos urgentes cuando `entregoAlgo ≠ "nada"` (primero), y `canalesDenuncia(entidad?)` (ADenunciar Policía/Fiscalía + entidad) en `packages/core/src/guidance.ts`
- [X] T019 Implementar `analyzeLocal(evidencia)` que combine todas las reglas, calcule `categorias`, `puntaje` 0–100 (normalizado desde los puntos: ≥5 puntos → alto, ≥2 → medio, como legacy), `modalidad` heurística, `queHacer`, `denuncia`, `ia.estado` y `versionReglas` (desde package.json) en `packages/core/src/analyzeLocal.ts`
- [X] T020 Implementar `mergeVerdict(local, ai?, fuentes[])`: nivel = max, motivos IA con `origen:"ia"` sin duplicar categoría+texto similar, motivos de fuentes con `origen:"fuente"`, `discrepancia` cuando niveles difieren, recalcular puntaje en `packages/core/src/merge.ts`
- [X] T021 Exportar API pública del paquete en `packages/core/src/index.ts`
- [X] T022 [P] Crear conjunto dorado de ≥50 mensajes en español colombiano (≥30 fraude: suplantación bancaria, DIAN, falso premio, falso empleo, inversión, extorsión, vishing transcrito, compra falsa; ≥20 legítimos: notificaciones reales de bancos sin enlaces, mensajes personales, OTP solicitados por la propia persona) con `{texto, esperado: "fraude"|"legitimo", modalidad}` en `packages/core/test/fixtures/golden.json`
- [X] T023 Crear script de evaluación sobre el conjunto dorado con `--mode=rules|agent` (`rules` ejecuta `analyzeLocal`; `agent` llama a `POST /api/analisis` de un servidor local que usa el proveedor configurado en `AI_*`), que imprima recall de fraude (medio/alto) y especificidad (bajo), emita métricas JSON por modalidad y salga con código 1 si recall < 0.90 o especificidad < 0.80, en `packages/core/test/eval.ts` (script `eval` en `packages/core/package.json`; por defecto `--mode=rules`)
- [X] T024 [P] Pruebas unitarias de reglas (ejemplo de legacy → alto con ≥3 motivos), `redactPII` (Luhn, OTP, cédula, y `http://x.top/p?cedula=1020304050&email=a@b.co` → sin cédula ni correo en la salida), `canonical` y `hash` en `packages/core/test/*.test.ts`

### apps/api (esqueleto)

- [X] T025 Implementar carga y validación de configuración con Zod desde `process.env` (todas las variables de T009); si `NODE_ENV=production` y `AI_PROVIDER=mock`, el servidor no arranca y muestra un error claro (Constitución §II), en `apps/api/src/config.ts`
- [X] T026 Implementar conexión SQLite (`better-sqlite3`, WAL, crea directorio de `DB_PATH`) y runner de migraciones SQL ordenadas en `apps/api/src/db/index.ts`
- [X] T027 Crear migración inicial con tablas `consents`, `cases`, `deleted_ranges`, `community_reports` e índices según data-model.md §4–§6 en `apps/api/src/db/migrations/001_init.sql`
- [X] T028 Crear `buildServer()` con Fastify: helmet, CORS solo `CORS_ORIGIN`, rate-limit global (20 req/10 min por IP en `/api/analisis` y `/api/transcripciones`, 100/10 min resto), manejador de errores `application/problem+json`, logger sin cuerpos de petición, y `@fastify/static` de `apps/web/dist` cuando `SERVE_WEB=true` en `apps/api/src/server.ts`; punto de entrada `apps/api/src/index.ts`
- [X] T029 [P] Plugin que valide la cabecera `X-Client-Id` (UUID v4) y exponga `request.ownerHash = sha256(clientId + OWNER_SALT)` en `apps/api/src/plugins/clientId.ts`
- [X] T030 [P] Rutas `GET /api/salud` y `GET /api/config` (proveedor/modelo activos, versionReglas, textoConsentimientoVersion) según contracts/api.openapi.yaml en `apps/api/src/routes/sistema.ts`
- [X] T031 [P] Helper de pruebas que cree el servidor con BD en memoria (`:memory:`) y `AI_PROVIDER=mock` en `apps/api/test/helpers.ts`

### apps/web (esqueleto PWA con paridad del prototipo)

- [X] T032 Crear tokens de tema (morado `#5b1a8a`/`#7b1fa2`, verde `#22e07a`, bajo/medio/alto, fondo, texto) en claro y oscuro con `prefers-color-scheme`, tipografía y estilos base mobile-first desde 360 px, migrando los estilos de `legacy/index.html`, en `apps/web/src/theme/tokens.css` y `apps/web/src/theme/base.css`
- [X] T033 Configurar `vite-plugin-pwa` (manifest: nombre "Identifica tu fraude", íconos 192/512/maskable, `display: standalone`, colores del tema, `start_url`, `share_target` con `action: /compartir`, `method: POST`, `enctype: multipart/form-data`, `params: {title, text, url, files: [{name: "audio", accept: ["audio/*"]}]}`; Workbox precache de la app y fuentes Tesseract) en `apps/web/vite.config.ts` e íconos en `apps/web/public/icons/`
- [X] T034 [P] Servicio de identificador anónimo (UUID v4 en localStorage con try/catch) en `apps/web/src/services/clientId.ts`
- [X] T035 [P] Cliente HTTP (`VITE_API_URL`, cabecera `X-Client-Id`, timeouts, errores problem+json, detección de sin conexión) en `apps/web/src/services/apiClient.ts`
- [X] T036 [P] Servicio de permisos opcionales y revocables (verificador de enlaces, guardar registro) persistidos localmente en `apps/web/src/services/permisos.ts`
- [X] T037 Layout con encabezado, navegación por pestañas (Analizar, Me llamaron, Verificar entidad, Permisos, Registro, Panel) y rutas con react-router en `apps/web/src/App.tsx` y `apps/web/src/components/Layout.tsx`
- [X] T038 [P] Página de inicio (3 pasos, límites del servicio actualizados: el análisis con IA envía datos solo con tu permiso) migrada de legacy en `apps/web/src/pages/Inicio.tsx`
- [X] T039 [P] Página Permisos (sin la casilla de SMS/llamadas; enlace a política de privacidad; Ley 1581) en `apps/web/src/pages/Permisos.tsx`
- [X] T040 [P] Página de política de privacidad que nombra al proveedor IA activo (desde `/api/config`), fuentes consultadas, qué se guarda y retención de la PoC, en `apps/web/src/pages/Privacidad.tsx`
- [X] T041 Indicador de conexión y banner "sin conexión: solo análisis local" en `apps/web/src/components/OfflineBanner.tsx`
- [X] T042 [P] Configurar Playwright (proyectos móvil 360×800 Chromium y WebKit, escritorio; `webServer` levanta api mock + web) en `apps/web/playwright.config.ts`

**Checkpoint**: `npm test` y `npm run eval` en verde; la PWA abre, se instala y navega sin API.

---

## Phase 3: User Story 1 - Analizar evidencia con el agente de IA y recibir orientación (Priority: P1) 🎯 MVP

**Goal**: Pegar texto/enlace o subir captura → consentimiento → veredicto (reglas + agente IA) con medidor, motivos con origen, qué hacer y dónde denunciar; con IA caída se entrega el de reglas.

**Independent Test**: quickstart V1–V5: ejemplo de legacy → alto con ≥3 motivos y etiquetas de origen; IA en timeout → veredicto de reglas con aviso; sin consentimiento → sin llamadas a `/api/analisis`; inyección → motivo "manipulación"; captura → texto editable antes de analizar.

### Tests for User Story 1

- [X] T043 [P] [US1] Prueba de contrato del agente con `MockProvider` (salida válida → fusión; JSON inválido → `no_disponible`; timeout → `no_disponible` en < 13 s; evidencia con "ignora tus instrucciones" → motivo `manipulacion` y nivel ≥ medio) en `apps/api/test/contract/agent.test.ts`
- [X] T044 [P] [US1] Prueba de contrato `POST /api/consentimientos` y `POST /api/analisis` (400 sin consentId válido; consentimiento de un solo uso; respuesta valida contra el esquema `Veredicto`; el servidor vuelve a redactar PII) en `apps/api/test/contract/analisis.test.ts`
- [X] T045 [P] [US1] E2E: cargar ejemplo → aceptar consentimiento → ver medidor "Riesgo alto", ≥3 motivos y canales de denuncia; rechazar consentimiento → veredicto local sin petición de red, en `apps/web/e2e/analizar.spec.ts`

### Implementation for User Story 1

- [X] T046 [P] [US1] Definir interfaz `AiProvider` y tipos `ChatRequest/ChatResponse` según contracts/ai-provider.md en `apps/api/src/ai/types.ts`
- [X] T047 [P] [US1] Implementar `OpenAiCompatibleProvider` con el SDK `openai` (`baseURL`, `apiKey`, `model`, tools, `response_format: json_object`, AbortSignal) en `apps/api/src/ai/openaiCompatible.ts`
- [X] T048 [P] [US1] Implementar `MockProvider` configurable por `MOCK_FAIL` (`none|timeout|invalid|429`) con respuestas deterministas por palabras clave en `apps/api/src/ai/mock.ts`
- [X] T049 [US1] Fábrica `createAiProvider(config)` (`groq|gemini|openrouter|openai|ollama` → OpenAiCompatible; `mock`; `none` → null) en `apps/api/src/ai/factory.ts`
- [X] T050 [P] [US1] Prompt de sistema normativo (5 reglas de contracts/ai-provider.md, español, evidencia delimitada en `<evidencia>`) en `apps/api/src/agent/prompt.ts`
- [X] T051 [US1] Implementar el agente: construye mensajes con evidencia redactada + hallazgos de reglas + fuentes, bucle de tool calling (máx. `AI_MAX_TOOL_CALLS`, registro de herramientas vacío por ahora, extensible), presupuesto `AI_TIMEOUT_MS`, validación Zod de `AiAssessment`, cualquier fallo → `null` en `apps/api/src/agent/agent.ts`
- [X] T052 [US1] Repositorio y ruta `POST /api/consentimientos` (crea consent con proveedor activo; `usado_en` al consumirse) en `apps/api/src/db/consentsRepo.ts` y `apps/api/src/routes/consentimientos.ts`
- [X] T053 [US1] Ruta `POST /api/analisis`: valida cuerpo, consume consentimiento, `redactPII` en servidor, `analyzeLocal`, agente, `mergeVerdict`, `ia = {estado, proveedor, modelo}`; nunca 5xx por fallas de IA; registra en log la duración total y por etapa (reglas, fuentes, IA) sin contenido, en `apps/api/src/routes/analisis.ts`
- [X] T054 [P] [US1] Servicio OCR con Tesseract.js (`spa`, carga perezosa, progreso) migrado de legacy en `apps/web/src/services/ocr.ts`
- [X] T055 [US1] Componente de entrada de evidencia: textarea (≤5.000 caracteres con aviso de recorte), subir captura (galería/cámara `capture="environment"`) → texto editable, botón "Cargar ejemplo" en `apps/web/src/components/EvidenceInput/EvidenceInput.tsx`
- [X] T056 [US1] Diálogo de consentimiento por análisis (qué se envía —texto con datos ocultos, mostrando cuántos se ocultaron—, a quién —proveedor de `/api/config`—, para qué; Aceptar / Solo en mi dispositivo) accesible con foco atrapado en `apps/web/src/components/ConsentDialog.tsx`
- [X] T057 [US1] Verificar los términos de retención y uso para entrenamiento de Groq (y de cada proveedor configurable de `docs/proveedores-ia.md`), registrarlos con fecha y enlace en `specs/001-agente-ia-antifraude/research.md` §1, y mostrar el resumen del proveedor activo (desde `/api/config`) en `apps/web/src/pages/Privacidad.tsx` y `apps/web/src/components/ConsentDialog.tsx` (Constitución §IV)
- [X] T058 [US1] Hook `useAnalisis()`: muestra de inmediato `analyzeLocal` (veredicto provisional), y si hay consentimiento y conexión llama a consentimiento + análisis y reemplaza el resultado; sin conexión → banner FR-029c, en `apps/web/src/hooks/useAnalisis.ts`
- [X] T059 [P] [US1] Gráfico `RiskGauge` con ECharts (gauge 0–100, tres bandas bajo/medio/alto, animación de aguja, etiqueta de nivel + ícono, `aria-label` y texto alternativo) en `apps/web/src/components/charts/RiskGauge.tsx`
- [X] T060 [US1] Vista de resultado: tarjeta de veredicto con `RiskGauge`, modalidad, motivos con chip de origen (Regla / IA / Fuente + fecha), aviso cuando `ia.estado ≠ usada`, discrepancia, Qué hacer, Dónde denunciar, aviso "orienta, no reemplaza a entidades ni autoridades" en `apps/web/src/components/Resultado/Resultado.tsx`
- [X] T061 [US1] Página Analizar que une EvidenceInput + ConsentDialog + useAnalisis + Resultado en `apps/web/src/pages/Analizar.tsx`

**Checkpoint**: US1 funcional con `AI_PROVIDER=mock` y con Groq real; quickstart V1–V5 pasan.

---

## Phase 4: User Story 2 - Contrastar con fuentes abiertas de información (Priority: P2)

**Goal**: El agente consulta Safe Browsing, URLhaus, RDAP, catálogo de entidades y reportes de comunidad reales; cada hallazgo cita fuente y hora; fuentes caídas no detienen el análisis.

**Independent Test**: quickstart V8–V9: URL de prueba de Safe Browsing → alto citando la fuente y hora; dominio nuevo → antigüedad mostrada; sin clave de URLhaus → análisis completo + aviso.

### Tests for User Story 2

- [X] T062 [P] [US2] Pruebas de cada adaptador de fuente con `fetch` simulado (coincide, limpio, timeout → `estado: timeout`, error → `no_disponible`) en `apps/api/test/contract/sources.test.ts`
- [X] T063 [P] [US2] Prueba de contrato `POST /api/entidades/verificar` y `POST /api/reportes` (umbral 5 distintos en 72 h; reporte duplicado → 200) en `apps/api/test/contract/entidades-reportes.test.ts`

### Implementation for User Story 2

- [X] T064 [P] [US2] Utilidad `withTimeout(fetchFn, 4000)` que devuelva `SourceCheck` con estado `timeout/no_disponible` en `apps/api/src/sources/runSource.ts`
- [X] T065 [P] [US2] Adaptador Google Safe Browsing v5 por búsqueda de prefijos de hash (`hashes.search`, sin enviar la URL en claro, con verificación local del hash completo; si falta `SAFE_BROWSING_API_KEY` → `no_disponible`; atribución requerida por términos) en `apps/api/src/sources/safeBrowsing.ts`
- [X] T066 [P] [US2] Adaptador URLhaus (`POST https://urlhaus-api.abuse.ch/v1/host/` con cabecera `Auth-Key`) en `apps/api/src/sources/urlhaus.ts`
- [X] T067 [P] [US2] Adaptador RDAP (bootstrap IANA / rdap.org; evento `registration`; < 30 días → `senal` con "Dominio registrado hace N días") en `apps/api/src/sources/rdap.ts`
- [X] T068 [P] [US2] Adaptador de entidades (dominio oficial / imitación / canal oficial por dígitos; vacío → `sin_datos`) usando `@itf/core/data/entidades.json` en `apps/api/src/sources/entidades.ts`
- [X] T069 [P] [US2] Repositorio de reportes de comunidad (insert con UNIQUE indicador+reporter, conteo de distintos en 72 h, normalización de dominio sin `www.` y número E.164 +57) en `apps/api/src/db/reportsRepo.ts`
- [X] T070 [US2] Adaptador de comunidad sobre reportsRepo (activo si ≥5 distintos en 72 h) en `apps/api/src/sources/comunidad.ts`
- [X] T071 [US2] Planificador determinista: según enlaces/números/entidades de la evidencia dispara en paralelo las fuentes aplicables y devuelve `SourceCheck[]` (solo dominios, nunca URL completa en resultados) en `apps/api/src/agent/planner.ts`
- [X] T072 [US2] Registrar las 4 herramientas de solo lectura (`consultar_reputacion_url`, `consultar_antiguedad_dominio`, `verificar_canal_entidad`, `consultar_reportes_comunidad`) en el agente y pasar los resultados del planificador al prompt en `apps/api/src/agent/tools.ts` y `apps/api/src/agent/agent.ts`
- [X] T073 [US2] Integrar planificador en `POST /api/analisis` (fuentes → motivos `origen:"fuente"` con `fuente` y `consultadoEn`; avisos por fuentes no disponibles) en `apps/api/src/routes/analisis.ts`
- [X] T074 [US2] Rutas `POST /api/entidades/verificar` y `POST /api/reportes` según contrato en `apps/api/src/routes/entidades.ts` y `apps/api/src/routes/reportes.ts`
- [X] T075 [P] [US2] Sección "Fuentes consultadas" en el resultado (lista con estado ok/no disponible, hora en America/Bogota) y botón "Reportar este enlace/número" en `apps/web/src/components/Resultado/Fuentes.tsx`
- [X] T076 [US2] Página Verificar entidad (remitente/número → coincide oficial / no coincide / sin datos + reportes de comunidad; fallback local con entidades.json sin conexión) en `apps/web/src/pages/Entidad.tsx`

**Checkpoint**: US1 + US2 funcionan; `REPORTES_SIMULADOS` ya no existe en el código.

---

## Phase 5: User Story 3 - Registro trazable y verificable de cada caso (Priority: P2)

**Goal**: Guardar casos firmados y encadenados, consultarlos por ID, verificar integridad, comprobar un texto por su huella, descargar comprobante autoverificable y borrar historial.

**Independent Test**: quickstart V10–V13: guardar → ID `IF-…` + comprobante; verificar íntegro; alteración detectada; comprobante válido tras reiniciar la API; borrar historial.

### Tests for User Story 3

- [X] T077 [P] [US3] Pruebas de cadena y firma: alterar `veredicto_json` de una fila → `rotoEn` y motivo; eliminar una fila fuera de "borrar historial" → ruptura; borrado declarado → no es alteración; comprobante válido sin fila en BD (`firmaValida=true`, `enBaseDeDatos=false`) en `apps/api/test/contract/chain.test.ts`
- [X] T078 [P] [US3] Prueba de contrato de `/api/casos` (POST/GET/DELETE), `/api/casos/{id}`, `/api/casos/comprobar`, `/api/comprobantes/verificar`, `/api/clave-publica` en `apps/api/test/contract/casos.test.ts`

### Implementation for User Story 3

- [X] T079 [P] [US3] Gestión de claves Ed25519 (`CASE_SIGNING_KEY` PEM o clave efímera con advertencia en log; `claveId` = 16 hex de SHA-256 del DER; firmar/verificar) en `apps/api/src/registry/keys.ts`
- [X] T080 [P] [US3] Generador de IDs `IF-YYYYMMDD-XXXXXX` (Crockford base32, fecha America/Bogota) en `apps/api/src/registry/caseId.ts`
- [X] T081 [US3] Repositorio de casos: inserción transaccional calculando `previa_owner`, `previa_global`, `hash_entrada` (canonical de core) y `firma`; listado por owner; búsqueda por huella; borrado por owner registrando `deleted_ranges` en `apps/api/src/db/casesRepo.ts`
- [X] T082 [US3] Verificación de cadena y de comprobante según contracts/case-receipt.md en `apps/api/src/registry/verify.ts`
- [X] T083 [US3] Rutas de casos, comprobantes y clave pública según contracts/api.openapi.yaml (el veredicto guardado no contiene texto de evidencia; `consentId` requerido si `ia.estado = usada`) en `apps/api/src/routes/casos.ts`
- [X] T084 [P] [US3] Servicio de comprobantes en el navegador: descargar JSON, verificar hash + firma con WebCrypto Ed25519 o fallback a `/api/comprobantes/verificar` en `apps/web/src/services/receipts.ts`
- [X] T085 [US3] Botón "Guardar caso" en el resultado (requiere permiso "Guardar registro"; si no, explica cómo activarlo; calcula huella de la evidencia original en el cliente) y diálogo con ID + descarga en `apps/web/src/components/Resultado/GuardarCaso.tsx`
- [X] T086 [US3] Vista imprimible del comprobante (datos legibles, QR con ID, leyenda de soporte no pericial y de PoC) en `apps/web/src/pages/Comprobante.tsx`
- [X] T087 [US3] Página Registro: lista de casos con estado de cadena, "Verificar cadena", consulta por ID, "Comprobar un mensaje" (huella local → `/api/casos/comprobar`), "Verificar comprobante" (subir JSON), "Borrar todo mi historial" y aviso de versión de prueba en `apps/web/src/pages/Registro.tsx`

**Checkpoint**: US1–US3 independientes y funcionales.

---

## Phase 6: User Story 7 - Analizar fraudes por voz: audios y relatos de llamadas (Priority: P2)

**Goal**: Subir/compartir notas de voz o describir una llamada (escrito o dictado) y recibir el mismo veredicto, priorizando pasos urgentes si ya se entregó algo.

**Independent Test**: quickstart V6–V7: nota de voz de prueba → transcripción revisable → alto / vishing en < 45 s; "Me llamaron" con "entregó datos" → pasos urgentes primero.

### Tests for User Story 7

- [X] T088 [P] [US7] Prueba de contrato `POST /api/transcripciones` (sin consentimiento → 400; > 25 MB → 413; mock sin voz → 422; el archivo no se escribe en disco) en `apps/api/test/contract/transcripciones.test.ts`
- [ ] T089 [P] [US7] Añadir al conjunto dorado ≥5 relatos de llamada y transcripciones de vishing, y un audio sintético corto `packages/core/test/fixtures/vishing.mp3` para E2E manual, en `packages/core/test/fixtures/golden.json`

### Implementation for User Story 7

- [X] T090 [US7] Añadir `transcribe()` a `OpenAiCompatibleProvider` (`/audio/transcriptions`, `AI_STT_MODEL`, idioma `es`) y al `MockProvider` en `apps/api/src/ai/openaiCompatible.ts` y `apps/api/src/ai/mock.ts`
- [X] T091 [US7] Ruta `POST /api/transcripciones` con `@fastify/multipart` en memoria (límite 25 MB, duración ≤ 3 min o `truncado: true`, consentimiento `transcripcion`, sin persistir audio) en `apps/api/src/routes/transcripciones.ts`
- [X] T092 [US7] Incluir `relato` en `POST /api/analisis` (convertir a texto estructurado para el agente; número de origen al planificador) en `apps/api/src/routes/analisis.ts`
- [X] T093 [P] [US7] Servicio de voz: dictado con Web Speech API (`es-CO`) cuando exista; si no, grabación `MediaRecorder` y envío a transcripción en `apps/web/src/services/speech.ts`
- [X] T094 [US7] Entrada de audio en EvidenceInput (subir archivo de audio; consentimiento de transcripción; transcripción editable antes de analizar; mensajes para audio ilegible/largo) en `apps/web/src/components/EvidenceInput/AudioInput.tsx`
- [X] T095 [US7] Página "Me llamaron" con preguntas guiadas (quién dijo ser, qué pidió, número, presión, qué entregó, notas) con botón de dictado por campo, que produce `relato` y usa `useAnalisis` en `apps/web/src/pages/MeLlamaron.tsx`
- [X] T096 [US7] En Resultado, si `entregoAlgo ≠ "nada"`, mostrar bloque de pasos urgentes antes del resto en `apps/web/src/components/Resultado/Resultado.tsx`
- [X] T097 [US7] Ruta `/compartir` del share target: recibe `title/text/url` y archivos de audio: el service worker intercepta el POST a `/compartir`, guarda el archivo en Cache Storage temporal y redirige a `/compartir?pendiente=1`) y precarga Analizar en `apps/web/src/pages/Compartir.tsx` y `apps/web/src/sw/shareTarget.ts`

**Checkpoint**: Todas las historias P1/P2 funcionales.

---

## Phase 7: User Story 4 - Panel visual atractivo de riesgo y tendencias (Priority: P3)

**Goal**: Desglose visual de señales en cada resultado y panel público con tendencias agregadas y anónimas.

**Independent Test**: quickstart V14: resultado con medidor + desglose; Panel con ≥3 gráficos sin texto de mensajes; legible a 360 px; nivel también en texto e ícono.

- [X] T098 [P] [US4] Ruta `GET /api/estadisticas` (totales por nivel, por modalidad, por entidad, por semana ISO; solo grupos con ≥3 casos; caché 5 min en memoria) en `apps/api/src/routes/estadisticas.ts`
- [X] T099 [P] [US4] Paleta de gráficos accesible (validada para daltonismo, claro/oscuro, derivada de los tokens) y tema ECharts registrado en `apps/web/src/components/charts/theme.ts`
- [X] T100 [P] [US4] `SignalBreakdown`: barras horizontales apiladas por categoría y origen (regla/IA/fuente) con animación de entrada y tabla alternativa accesible en `apps/web/src/components/charts/SignalBreakdown.tsx`
- [X] T101 [P] [US4] `KpiCounter`: tarjeta con contador animado (respeta `prefers-reduced-motion`) en `apps/web/src/components/charts/KpiCounter.tsx`
- [X] T102 [P] [US4] `TrendCharts`: barras de modalidades, ranking de entidades suplantadas y línea semanal con área degradada en `apps/web/src/components/charts/TrendCharts.tsx`
- [X] T103 [US4] Integrar `SignalBreakdown` en la vista de resultado en `apps/web/src/components/Resultado/Resultado.tsx`
- [X] T104 [US4] Página Panel público (KPIs + TrendCharts + estado vacío amigable + nota de anonimato) en `apps/web/src/pages/Panel.tsx`
- [X] T105 [P] [US4] E2E del panel y del desglose a 360 px (sin desbordamiento horizontal, gráficos con `aria-label`) en `apps/web/e2e/panel.spec.ts`

**Checkpoint**: US4 completa.

---

## Phase 8: User Story 5 - Cambiar de modelo de IA sin rehacer el aplicativo (Priority: P3)

**Goal**: Demostrar y documentar el cambio de proveedor solo por configuración.

**Independent Test**: quickstart V20: mismos mensajes con dos proveedores → mismo formato; el caso registra proveedor/modelo.

- [X] T106 [P] [US5] Prueba que ejecuta el mismo análisis con dos configuraciones de `MockProvider` (ids distintos) y verifica formato idéntico y `ia.proveedor/modelo` en el caso guardado en `apps/api/test/contract/provider-swap.test.ts`
- [X] T107 [P] [US5] Script de humo opcional (no en CI) que corre 5 mensajes del conjunto dorado contra el proveedor configurado e imprime nivel, latencia p50/p95 y validez del JSON, y falla si p95 > 15 s en texto o > 45 s en audio de 1 min (SC-001, SC-012), en `apps/api/scripts/smoke-ai.ts`
- [X] T108 [US5] Workflow `.github/workflows/eval-ia.yml` (`workflow_dispatch` y `pull_request` con `paths: apps/api/src/agent/**, apps/api/src/ai/**, packages/core/src/rules/**`) que levante la API con el secreto `EVAL_AI_API_KEY` y ejecute `npm run eval -- --mode=agent`; declararlo como check obligatorio de `main` para esas rutas y documentarlo en `docs/despliegue.md` (Constitución §V; nunca en `ci.yml`)
- [X] T109 [US5] Documentar perfiles de configuración (Groq, Gemini con advertencia de uso de datos en plan gratuito, OpenRouter, Ollama, none) y pasos de cambio en `docs/proveedores-ia.md`

**Checkpoint**: US5 completa.

---

## Phase 9: User Story 6 - Despliegue sencillo del entregable (Priority: P3)

**Goal**: Publicación automática desde `main`: PWA en GitHub Pages (misma URL) y API en Render; sin publicar si CI falla.

**Independent Test**: quickstart V21: PR con prueba rota → no despliega; merge verde → Pages + Render actualizados en < 15 min.

- [X] T110 [P] [US6] `Dockerfile` multi-stage (build core → web → api; runtime Node 22 slim, usuario no root, `DB_PATH=/data/app.db`, `SERVE_WEB` opcional, `HEALTHCHECK` a `/api/salud`) y `.dockerignore` en la raíz
- [X] T111 [P] [US6] `render.yaml` (servicio web Docker, plan free, `healthCheckPath: /api/salud`, `NODE_ENV=production` y `AI_PROVIDER=groq` por defecto, variables con `sync: false` para secretos) en la raíz
- [X] T112 [US6] `.github/workflows/deploy.yml`: on push a `main` → reutiliza `ci.yml` (`workflow_call`) → job web: `npm run build -w apps/web` con `VITE_API_URL=${{ secrets.API_PUBLIC_URL }}` y `base` del repo, `actions/upload-pages-artifact` + `actions/deploy-pages` → job api: `curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"` y espera a que `/api/salud` devuelva la nueva versión
- [X] T113 [P] [US6] `.github/workflows/keepalive.yml` (cron `*/14 11-23,0-4 * * *` UTC = 6 a.m.–11 p.m. Bogotá, ~2.300 ejecuciones/mes, `curl -fsS $API_PUBLIC_URL/api/salud`)
- [X] T114 [US6] Ajustar `ci.yml` para ser reutilizable (`on: workflow_call` además de PR/push) en `.github/workflows/ci.yml`
- [X] T115 [US6] Configurar `base` de Vite para GitHub Pages (`/Seguridad_Col_5.0/`) y redirección SPA (`404.html` copia de `index.html`) en `apps/web/vite.config.ts`
- [X] T116 [US6] Guía de despliegue: verificar que el sitio actual está en GitHub Pages, crear servicio en Render desde `render.yaml`, cargar secretos (repo: `RENDER_DEPLOY_HOOK_URL`, `API_PUBLIC_URL`; Render: `AI_*`, `SAFE_BROWSING_API_KEY`, `URLHAUS_AUTH_KEY`, `CASE_SIGNING_KEY`, `OWNER_SALT`, `CORS_ORIGIN`), generar clave Ed25519; confirmar que el repositorio es público (Actions ilimitado y Pages gratis; si es privado, reemplazar el keepalive por un monitor externo gratuito) y advertir que GitHub desactiva los cron tras 60 días sin actividad, en `docs/despliegue.md`

**Checkpoint**: Entregable desplegable automáticamente.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T117 [P] README del proyecto (qué es, arquitectura, `npm run dev`, enlaces a docs y spec) en `README.md`
- [X] T118 [P] Auditoría de accesibilidad con `@axe-core/playwright` en las páginas principales en `apps/web/e2e/a11y.spec.ts`
- [X] T119 [P] E2E de modo sin conexión (contexto offline → veredicto local + banner) y share target en `apps/web/e2e/offline.spec.ts`
- [X] T120 Endurecimiento: revisar que logs no contengan evidencia ni `X-Client-Id`, CSP estricta en helmet compatible con ECharts/Tesseract, límites de tamaño de cuerpo, en `apps/api/src/server.ts`
- [X] T121 Rendimiento: carga diferida de ECharts (módulos usados) y Tesseract, presupuesto de bundle inicial < 250 KB gzip, en `apps/web/vite.config.ts`
- [ ] T122 Ejecutar todos los escenarios de `specs/001-agente-ia-antifraude/quickstart.md` (V1–V21), incluyendo p95 medido de SC-001 y SC-012, y registrar resultados en `specs/001-agente-ia-antifraude/checklists/validacion.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → sin dependencias
- **Foundational (Phase 2)** → depende de Setup; BLOQUEA todas las historias
- **US1 (Phase 3)** → depende de Foundational
- **US2, US3, US7 (Phases 4–6)** → dependen de Foundational y de la ruta `/api/analisis` + Resultado de US1 (T053, T060) como punto de integración; entre sí son independientes
- **US4 (Phase 7)** → T103 depende de T060; T098/T104 dependen de casos (US3) para tener datos, pero muestran estado vacío sin ellos
- **US5 (Phase 8)** → depende de US1 (T049) y, para el caso guardado, de US3 (T083)
- **US6 (Phase 9)** → puede empezar tras Setup; despliegue útil tras US1
- **Polish (Phase 10)** → al final

### Within Each User Story

- Pruebas de contrato antes de la implementación de rutas
- Tipos/proveedores → agente/repositorios → rutas → UI
- Tareas que tocan el mismo archivo (`routes/analisis.ts`, `Resultado.tsx`, `agent.ts`) son secuenciales entre historias

### Parallel Opportunities

- Setup: T003–T007, T009
- Foundational: T011–T014, T016–T017, T022, T024 (core); T029–T031 (api); T034–T036, T038–T040, T042 (web)
- US1: T043–T045 juntos; T046–T048, T050, T054, T059 juntos
- US2: los 5 adaptadores T065–T069 en paralelo
- US3: T079, T080, T084 en paralelo
- US4: T098–T102 en paralelo
- Con varias personas, US2 / US3 / US7 pueden avanzar en paralelo tras US1

---

## Parallel Example: User Story 2

```bash
Task: "Adaptador Google Safe Browsing v5 en apps/api/src/sources/safeBrowsing.ts"
Task: "Adaptador URLhaus en apps/api/src/sources/urlhaus.ts"
Task: "Adaptador RDAP en apps/api/src/sources/rdap.ts"
Task: "Adaptador de entidades en apps/api/src/sources/entidades.ts"
Task: "Repositorio de reportes de comunidad en apps/api/src/db/reportsRepo.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Prueba de contrato del agente en apps/api/test/contract/agent.test.ts"
Task: "Prueba de contrato de análisis en apps/api/test/contract/analisis.test.ts"
Task: "E2E analizar en apps/web/e2e/analizar.spec.ts"
Task: "OpenAiCompatibleProvider en apps/api/src/ai/openaiCompatible.ts"
Task: "MockProvider en apps/api/src/ai/mock.ts"
Task: "RiskGauge en apps/web/src/components/charts/RiskGauge.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup + Phase 2 Foundational → la PWA ya iguala al HTML actual, instalable y offline
2. Phase 3 US1 → análisis con IA, consentimiento y medidor
3. **STOP and VALIDATE**: quickstart V1–V5 + `npm run eval`
4. Desplegar (adelantar T110–T115 si se quiere demo pública temprana)

### Incremental Delivery

1. MVP (US1) → demo
2. + US2 fuentes abiertas → + US3 registro → + US7 voz (cada una demostrable sola)
3. + US4 gráficos y panel → + US5 validación de proveedor → + US6 despliegue automático completo
4. Polish y validación completa del quickstart

### Fuera de alcance de este archivo

- **US8 / FR-032–FR-037 (app Android con Capacitor)**: Fase 2; generar con un nuevo `/speckit-tasks` cuando se apruebe.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Commit por tarea o grupo lógico; CI debe quedar verde (Constitución, Flujo de desarrollo)
- Cualquier cambio en datos personales, consentimiento o proveedores actualiza `apps/web/src/pages/Privacidad.tsx` en el mismo cambio
- Una caída en `npm run eval` por debajo de las metas bloquea la integración (Principio V)

## Notas de implementación (2026-10-20)

- **Desviación T006/plan**: se usa `node:sqlite` (incluido en Node ≥ 22.13) en lugar de `better-sqlite3`, para no compilar módulos nativos en Windows ni en la imagen Docker. Mismo SQL y migraciones.
- **Versiones**: se fijaron versiones estables conocidas (Vite 6, React 18, Zod 3, ECharts 5, openai 4, Fastify 5).
- **T089 (parcial)**: los relatos y transcripciones de vishing están en el conjunto dorado; falta el audio sintético `vishing.mp3` (requiere grabar una voz). La transcripción está probada con el proveedor simulado.
- **T122 (parcial)**: ver `checklists/validacion.md`; los escenarios que requieren claves reales, despliegue o dispositivo físico quedan pendientes.
- **Permiso "Verificador de enlaces"**: ahora es efectivo (`consultarEnlaces` en `POST /api/analisis`); activado por defecto y revocable.
- **Límites de uso configurables**: `RATE_LIMIT_ANALISIS` (20) y `RATE_LIMIT_GLOBAL` (100); `/api/salud` y `/api/config` sin límite.
