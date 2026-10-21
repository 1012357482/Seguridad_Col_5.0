# Despliegue con GitHub Actions

| Pieza | Dónde | Cómo |
|---|---|---|
| PWA (`apps/web`) | **GitHub Pages** (misma URL pública del HTML actual) | `deploy.yml` → `actions/deploy-pages` |
| API (`apps/api`) | **Render**, servicio web gratuito con Docker | `deploy.yml` → *deploy hook* de Render |
| Calidad | `ci.yml` en cada PR/push; `deploy.yml` lo reutiliza y **no publica si falla** | — |
| Agente IA | `eval-ia.yml` en PR que tocan agente/IA/reglas | conjunto dorado con el proveedor real |
| Arranque en frío | `keepalive.yml` (cron cada 14 min, 6 a. m.–11 p. m. Colombia) | `GET /api/salud` |

## 1. Verificaciones previas

- **Repositorio público.** Pages y Actions son gratuitos e ilimitados en repos públicos. Si el repo es privado, el keepalive
  (~2.300 ejecuciones/mes) supera los 2.000 minutos gratuitos: reemplázalo por un monitor externo gratuito (p. ej. UptimeRobot).
- **Dónde está publicado hoy el HTML.** Settings → Pages. Si ya está en GitHub Pages, cambia *Source* a **GitHub Actions**.
  El HTML original queda en `legacy/index.html`. Si está en otro host, ajusta solo el job `web` de `deploy.yml`.
- GitHub desactiva los workflows programados tras **60 días sin actividad** en el repo: reactívalo en la pestaña Actions si pasa.

## 2. Crear la API en Render

1. Render → **New → Blueprint** → selecciona este repositorio (usa `render.yaml`).
2. En el servicio `identifica-tu-fraude-api`, completa las variables marcadas como secretas:
   - `AI_API_KEY` (Groq: https://console.groq.com)
   - `SAFE_BROWSING_API_KEY` (Google Cloud → Safe Browsing API; uso no comercial)
   - `URLHAUS_AUTH_KEY` (https://auth.abuse.ch)
   - `CASE_SIGNING_KEY`: clave privada Ed25519 en PEM, con saltos de línea como `\n`:
     ```bash
     node -e "const {generateKeyPairSync}=require('crypto');console.log(generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}).replace(/\n/g,'\\\\n'))"
     ```
     Guárdala también fuera de Render: con ella se siguen verificando los comprobantes emitidos.
   - `CORS_ORIGIN`: `https://<usuario>.github.io`
3. Settings → **Deploy Hook** → copia la URL.

> El disco es efímero: SQLite se reinicia en cada despliegue o reposo (decisión aceptada para la prueba de concepto).
> Los comprobantes descargados siguen siendo verificables porque están firmados.

## 3. Secretos y variables del repositorio (Settings → Secrets and variables → Actions)

| Nombre | Tipo | Valor |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | secreto | Deploy hook de Render |
| `API_PUBLIC_URL` | secreto | `https://identifica-tu-fraude-api.onrender.com` (sin `/` final) |
| `EVAL_AI_API_KEY` | secreto | Clave del proveedor para `eval-ia.yml` (puede ser otra clave de Groq) |
| `EVAL_AI_PROVIDER`, `EVAL_AI_MODEL` | variables (opcionales) | Para evaluar otro proveedor |

## 4. Protección de la rama `main`

Settings → Branches → regla para `main`:
- Requerir PR y el check **CI / ci**.
- Requerir el check **Evaluación del agente IA / eval** (se ejecuta solo cuando el PR toca `apps/api/src/agent/**`,
  `apps/api/src/ai/**` o `packages/core/src/rules/**`; Constitución §V).

## 5. Publicar

Integra a `main` → `deploy.yml` ejecuta CI → si pasa, publica la PWA en Pages y dispara Render → espera a que
`/api/salud` responda. Meta: < 15 minutos sin pasos manuales (SC-007).

## Alternativa: un solo contenedor

La misma imagen puede servir PWA + API (útil en Cloud Run, Railway o un VPS):

```bash
docker build -t itf .
docker run -p 8787:8787 -e SERVE_WEB=true -e AI_PROVIDER=groq -e AI_API_KEY=... -e OWNER_SALT=... -e CORS_ORIGIN=http://localhost:8787 itf
```
