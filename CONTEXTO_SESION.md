# CONTEXTO DE SESIÓN — LANKA MKT OS
**Fecha:** 24 de junio de 2026  
**Proyecto:** mkt.lanka — Marketing OS de LANKA Collective  
**Cómo leer en próxima sesión:** `mcp__github__get_file_contents` → repo `lankacollective/mkt.lanka`, branch `docs/contexto-sesion`, path `CONTEXTO_SESION.md`

---

## CREDENCIALES Y ACCESOS

### Supabase — mkt-lanka (Marketing OS)
| Campo | Valor |
|-------|-------|
| Project ID | `ulbqvgvzvkxztfaaekmr` |
| URL | `https://ulbqvgvzvkxztfaaekmr.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/ulbqvgvzvkxztfaaekmr |
| Región | us-east-1 |
| Status | ACTIVE_HEALTHY |
| Publishable key | `sb_publishable_miMZnwmmW5b8WwSKIX0x1w_j7g6c8gh` |
| Anon key (legacy JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsYnF2Z3Z6dmt4enRmYWFla21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDk0NTIsImV4cCI6MjA5NjAyNTQ1Mn0.-9tqzbse4qlsrZ0GsaRymnZn7QCtZClhBuLLQB8UNNQ` |
| Creado | 3 de junio de 2026 |

**Uso en el código (`index.html`):**
```js
window.SUPABASE_URL      = 'https://ulbqvgvzvkxztfaaekmr.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_miMZnwmmW5b8WwSKIX0x1w_j7g6c8gh';
```

---

### Supabase — CAOS (Sistema de Tareas de Loptus)
| Campo | Valor |
|-------|-------|
| Project ID | `tmypjnoapglzdidrurqq` |
| URL | `https://tmypjnoapglzdidrurqq.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/tmypjnoapglzdidrurqq |
| Región | us-east-2 |
| Status | ACTIVE_HEALTHY |
| Publishable key | `sb_publishable_RgVXbhh_ENCeJ2Lw4uAzgw_3mzE7JAo` |
| Anon key (legacy JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRteXBqbm9hcGdsemRpZHJ1cnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwOTE0OTQsImV4cCI6MjA5NzY2NzQ5NH0.bwIUjL8kljnaRNCVBG993lysWc0HmPk5Kbw5INIqoi0` |
| API Key CAOS (Loptus) | `caos_sk_lnk_7xK9mP2vQr3bN8dTw` |
| Base URL Edge Functions | `https://tmypjnoapglzdidrurqq.supabase.co/functions/v1` |
| Creado | 22 de junio de 2026 |

**Endpoints CAOS:**
```bash
GET  /get-tasks?status=todo&date=today&assignee=Paola
POST /add-task      { "title":"...", "assignee":"Paola", "priority":"alta", "date":"YYYY-MM-DD", "status":"todo" }
PATCH /update-task  { "id":"...", "status":"listo" }
# Header siempre: x-api-key: caos_sk_lnk_7xK9mP2vQr3bN8dTw
```

---

### Supabase — justmove (proyecto inactivo)
| Project ID | `liuvnnzsgsladuzxvrgt` | Región: us-west-2 | Status: INACTIVE |

---

### GitHub — Organización: lankacollective
| Repo | Descripción |
|------|-------------|
| `mkt.lanka` | Marketing OS — single HTML file app |
| `caos` | App CAOS de tareas/proyectos (single HTML) |
| `lanka_hq` | Next.js app — sede central Lanka |

---

### Vercel — Team: lankacollective's projects
| Team ID | `team_gLT9zgMYCkjzrpCHnJvI0CHz` |

**Proyectos:**
| Nombre | ID |
|--------|----|
| `mkt-lanka` | `prj_cCdcyfNup9vF9s1UNRl1OXMdcAkg` |
| `lanka-hq` | `prj_hLwaZAWNFMajrxD47dGmYSmPsBoH` |
| `lanka-nodus` | `prj_gL9y8J2mXDhB61vsf8rjLAdhTPAA` |
| `lanka-manager` | `prj_SAqnfSQBEpK46lvDQEcIShszyaXI` |
| `aitama-web` | `prj_mFRG41smDIaKuqvWs5Aujzn2bT6h` |
| `justmove-app` | `prj_W5YGXav6GkZb0fcCCdMFj4yDAnHa` |
| `move` | `prj_4to4cl45PR9GgYo8QQDbW1qdubPS` |

---

### Integraciones MCP disponibles
| Servicio | Notas |
|----------|-------|
| Google Calendar | Timezone: `America/Mexico_City`, calendar: `primary` |
| Google Drive | Buscar, leer, crear archivos |
| Notion | Workspace LANKA |
| Canva | Diseños, brand kit |
| Spotify | Búsqueda, playlists |

---

## INFRAESTRUCTURA SUPABASE

### mkt-lanka — Tablas (schema: public)
| Tabla | Descripción |
|-------|-------------|
| `lanka_db` | BD principal. Cols: `id (text PK)`, `data (jsonb)`, `updated_at`, `updated_by` |
| `reminders` | Recordatorios push |
| `push_subscriptions` | Suscripciones WebPush |
| `workspace` | Workspace (FK de stickers, tasks, assemblies, vault_items, client_cases) |
| `stickers` | Stickers del workspace |
| `tasks` | Tareas (con parent_id self-FK para subtareas) |
| `assemblies` | Ensambles de stickers |
| `vault_items` | Vault de aprendizajes |
| `client_cases` | Casos de clientes (stage: prospecto→diagnóstico→implementación→seguimiento→cerrado) |

**Storage Bucket: `mkt-lanka-media`**
- Acceso público. Path: `{SUC_ACTIVA}/posts/{postId}/{timestamp}_{random}_preview.jpg`
- Políticas: SELECT público, INSERT/DELETE autenticado con `{public}` role
- Siempre se sube JPEG comprimido (~100-300KB), nunca el archivo original

### CAOS — Tablas
| Tabla | Descripción |
|-------|-------------|
| `workspaces` | Workspace de CAOS (1 fila activa) |

---

## PRs REALIZADOS EN ESTA SESIÓN

### PR #13 — Fix botón "Archivo local" en DAM y Stories
**Fix:** Envolver `<input type="file">` en `<label>` (`.click()` directo viola políticas del navegador).

### PR #14 — Quitar Producto/Eje; reordenar Configuración
`_GLOBAL_KEYS = ['estado_factura','emociones','cat_proveedor','sexo','nivel']`

### PR #15 — Renombrar "Kanban" → "Calendario Visual"
Ícono `fa-table-columns`, mismo ID `vista-cal-editorial`.

### PR #16 — Quitar Mood & Ejes; renombrar Briefing y Calendario; Ubicaciones por proyecto
- Ubicaciones en `DB.sucursales[i].ubicaciones[]` (antes eran globales)
- Helpers: `_getUbicacionesSuc(sucId)` / `_setUbicacionesSuc(sucId, arr)`
- Sync Configuración ↔ Control de Accesos

### PR #17 — Archivo local en DAM, sync post→DAM, Campañas
- `_syncArchivoLocalToDam(postId, filename, postIdx, previewUrl)`
- "Ad Performance" → "Campañas"

### PR #18 — Preview visual en card de post y DAM
- Header: thumbnail 38×38px siempre visible
- Body (card abierta): imagen/video hasta 220px
- `URL.createObjectURL()` — solo sesión

### PR #19 — Supabase Storage para previews + tab Offline en Campañas
- `_uploadToStorage(file, context)` → bucket `mkt-lanka-media`
- `post.preview_url` guardado en BD → persiste entre recargas
- Campañas tab Digital + tab Offline (radio, espectaculares, prensa)
- `renderAdsOfflineTable()` + `renderAdsOfflineCharts()` (barras + dona)

### PR #20 — Comprimir preview antes de subir (nunca sube el archivo original)
`_compressToPreview(file)`: imágenes → canvas resize 1200px JPEG, videos → primer frame JPEG.

### PR #21 — Re-abrir card tras render para mostrar preview
```js
setTimeout(() => {
    const card = document.getElementById(`card-${postId}`);
    if (card && !card.classList.contains('open')) card.classList.add('open');
}, 50);
```
Aplicado tras cada `renderOrquestacion()` en `_handlePostFileUpload()`.

### PR #22 — Fix DAM preview, lightbox, tamaño, frame negro
1. DAM: `thumbnail_url` siempre `<img>` (era `<video>` para tipo video → negro)
2. Placeholder gris cuando no hay `thumbnail_url`
3. Preview en Calendario: `max-height:220px` → `150px`
4. Lightbox `_openPreviewModal(url, isVideo)` al hacer clic en cualquier preview
5. Video frame negro: doble `requestAnimationFrame` en `onseeked` + `preload:'auto'` + `currentTime=0.5`

---

## ARQUITECTURA DE LA APP

- **Un solo archivo HTML** `index.html` (~900KB) — HTML + CSS + JS
- **localStorage key:** `LANKA_FINAL_2027_PRO`
- **Supabase sync:** `guardarBD()` con debounce → tabla `lanka_db`
- **Multiproyecto:** `DB.sucursales[]` / `SUC_ACTIVA` / `DB.datos[SUC_ACTIVA]`
- **Permisos:** `_getPermisos(modulo, accion)` — owner siempre true
- **Supabase client:** `window.__supabase` en `DOMContentLoaded`

### Módulos (menú izquierdo)
| Sección | ID HTML |
|---------|---------|
| Calendario de Contenido | `vista-calendario` |
| Calendario Visual | `vista-cal-editorial` |
| Briefing | `vista-briefing` |
| Campañas | `vista-ads` |
| Gestión de Activos (DAM) | `vista-dam` |
| Stories | `vista-stories` |
| Control de Accesos | `vista-accesos` |
| Configuración | `vista-configuracion` |
| Presupuesto | `vista-presupuesto` |

### Estructura DB
```js
DB = {
  sucursales: [{ id, nombre, ubicaciones: ['Todas',...] }],
  datos: {
    [SUC_ACTIVA]: {
      kanban: [{ id, titulo, fecha, estado, plataforma, archivo_local, preview_url, drive_doc_url }],
      dam:    [{ id, nombre, categoria, tipo, thumbnail_url, post_vinculado, archivo_local }],
      ads: [], ads_offline: [], presupuesto: {}, briefing: {}, stories: []
    }
  },
  config: {}
}
```

---

## FLUJO DE TRABAJO GIT

```bash
# Setup en cada sesión
git clone https://github.com/Lankacollective/mkt.lanka /tmp/mkt-fix
cd /tmp/mkt-fix

# Por cada PR
git checkout main && git pull --rebase origin main
git checkout -b fix/nombre-descriptivo
# ... editar index.html ...
git add index.html && git commit -m "fix: descripción"
git push -u origin fix/nombre-descriptivo
# Crear PR → mcp__github__create_pull_request (base: main)
# Merge  → mcp__github__merge_pull_request (squash)
```

**Git proxy:** `http://local_proxy@127.0.0.1:41729/git/`

---

## PENDIENTES (mkt.lanka)

- [ ] Supabase Storage para videos completos (hoy solo guarda primer frame JPEG)
- [ ] Múltiples archivos por post
- [ ] Drive link funcional para seleccionar archivo
- [ ] Notificaciones push (infraestructura lista: tablas `reminders` + `push_subscriptions`)
- [ ] Módulo CAOS integrado en mkt.lanka
- [ ] Refactorizar `renderOrquestacion()` para updates parciales (evita colapso de cards)

---

## AUDITORÍA LANKA HQ — 30 de junio de 2026

**Repo:** `lankacollective/lanka_hq` (Next.js) · **Supabase:** `ulbqvgvzvkxztfaaekmr` · **Vercel:** `lanka-hq` (`prj_hLwaZAWNFMajrxD47dGmYSmPsBoH`)

### Qué es vs qué no es
- **Lanka HQ** = sistema operativo interno de Lanka (Paola + Mathias). No se vende. Gestiona el día a día de la empresa.
- **Lanka Manager** = producto externo para clientes F&B (diagnóstico de rentabilidad, 63 preguntas, en construcción, vive en `lanka-manager.vercel.app`). Sí se vende.
- Mostrar Lanka HQ en redes no es pitch de venta — es credencial ("esta agencia se construye sus propias herramientas"), que funciona como puente de confianza hacia Lanka Manager.

### Arquitectura confirmada
- Workspace único hardcodeado: `WORKSPACE_ID = 'lanka_hq_next'` (sin multi-tenant).
- Tabla `workspace`: columnas `kpis`, `modelo`, `roadmap`, `config` — todas **jsonb sin validación de schema**. Una forma inesperada (ej. `{}` en vez de `[]`) crashea la hidratación de React sin ningún error visible server-side.
- **Causa raíz del bug original** ("la página no cargaba"): `workspace.kpis` se guardó como objeto `{}` en vez de array `[]`; `modules/hoy/Hoy.tsx` llamaba `state.kpis.some(...)` esperando array → crash silencioso. Se corrigió con `UPDATE workspace SET kpis = '[]'::jsonb`.
- `lib/store.tsx` (~769 líneas): Provider central — localStorage fallback, mappers Supabase↔state, `seedDB`, `loadFromDB`, toda la API de acciones (sticker/task/assembly/case/modelo/roadmap), y suscripciones realtime vía `supabase.channel('relational_sync')` con `postgres_changes` por tabla (stickers, tasks, assemblies, vault_items, client_cases).
- **CAOS y las tareas de Lanka HQ son dos sistemas separados y desconectados**: CAOS vive en el proyecto Supabase `tmypjnoapglzdidrurqq` (Edge Functions + curl), Lanka HQ tiene su propia tabla `tasks` en `ulbqvgvzvkxztfaaekmr` accedida desde el store de React. No hay sync entre ambos hoy.
- Escrituras a Supabase eran "fire-and-forget": todo `.then(() => undefined)`, descartando cualquier error — el estado local y la BD podían divergir sin ninguna señal.
- `app/api/generate-tasks/route.ts`: ya usa `@anthropic-ai/sdk` con allowlist de modelos (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`), toma stickers seleccionados + contexto de estrategia, devuelve tasks/subtasks estructuradas en JSON. Es el patrón/template a reutilizar para cualquier feature de IA futura, tanto en HQ como en Lanka Manager.
- `vercel.json` tenía una config inválida que rompía el build — se eliminó (commit `c2d97ed`).

### Fixes bloqueantes — estado
1. ✅ **Blindaje de tipos JSONB** — aplicado. `loadFromDB()` ahora valida con `Array.isArray`/`typeof` antes de usar `kpis`/`modelo`/`roadmap`/`config`; si la forma es inesperada, usa defaults en vez de crashear, y loggea el problema en vez de fallar en silencio.
2. ✅ **Errores de escritura visibles** — aplicado. Se agregó helper `logDbError(context, error)`; los ~17 call-sites de escritura en `store.tsx` (addSticker, updateSticker, deleteSticker, addTask, updateTask, deleteTask, createAssemblyFromQueue, updateAssembly, assemblyToTask, archiveAssembly, quickAssemble, addCase, updateCase, deleteCase, addAiTasks, seedDB, sync de workspace) ahora capturan `{ error }` y lo loggean con contexto en vez de descartarlo.
   - **Pushed a `main` de `lanka_hq`:** commit `ed39cdbc03a122843e98c2a215e91284e1086109`.
3. ⏳ **Postura de acceso (Vercel Deployment Protection)** — **pendiente, decisión de Paola.** No existe herramienta MCP para alternar esto remotamente (revisado el listado completo de `mcp__Vercel__*`, ninguna gestiona protección de deployment/proyecto). Es un trade-off real: acceso público como "showcase" en redes vs. exposición de datos de negocio/financieros si `client_cases` se llena con info real de clientes. Opciones:
   - (a) Reactivar "Require Log In" en el dashboard de Vercel manualmente (acción no remota).
   - (b) Construir Supabase Auth + RLS por usuario antes de poblar datos financieros reales de clientes en `client_cases`.

### Checklist de mejora — 🟠 Importante (no bloqueante, pendiente)
- Reconciliar CAOS vs. tareas de Lanka HQ — decidir cuál es la fuente única de verdad (fricción recurrente).
- Hacer que la lógica de re-seed de `loadFromDB` no sobreescriba datos de la nube ante errores transitorios.
- Limpiar módulos huérfanos: assembly / automations / command-center / dashboard / master-os.
- Decidir si poblar o esconder módulos vacíos: Hoy (tasks=0), Bóveda (0), Casos (0).

### Insertados en esta sesión
- 7 stickers nuevos en Supabase (`stickers`, proyecto `ulbqvgvzvkxztfaaekmr`), categorizados por tags: Boca a Boca (tareas), El número shock (tareas-Ganchos), Observador en la sala (storytelling-Framework), Visitar 3 veces (storytelling-Framework), Relatividad vs. Absolutismo (storytelling-Framework), Mostrar herramienta antes que el output (tareas-Ganchos), Caballo de Troya (ya existía).
- Tarea CAOS creada: id `t1782798067187906` — "Comprar dominio lankahq.io", proyecto LANKA HQ, fecha 2026-07-15, prioridad media, nota "$37.99/año".

---

## BLUEPRINT LANKA MANAGER — 30 de junio de 2026

Producto externo de diagnóstico de rentabilidad F&B. Vive en `lanka-manager.vercel.app`, en construcción.

### Reutilización de arquitectura de Lanka HQ
- `client_cases` (ya existe en `ulbqvgvzvkxztfaaekmr`, stage: prospecto→diagnóstico→implementación→seguimiento→cerrado, con `maturity_score` y `kpis` jsonb ya con forma F&B) se reutiliza como registro maestro del cliente.
- Patrón de IA de `app/api/generate-tasks/route.ts` (Anthropic SDK + allowlist de modelos + input estructurado → output JSON estructurado) es el template para el motor de interpretación del diagnóstico de 63 preguntas.

### Tablas nuevas propuestas
- `diagnostic_questions` — banco de las 63 preguntas.
- `diagnostic_responses` — respuestas por cliente/sesión.
- `diagnostic_results` — resultados/score interpretado.
- **Decisión a tomar ahora, no después:** todas multi-tenant desde el día uno vía `workspace_id`/`client_id` — evitar repetir el error de `WORKSPACE_ID` hardcodeado encontrado en Lanka HQ.

---

## PARA INICIAR LA PRÓXIMA SESIÓN

```bash
git clone https://github.com/Lankacollective/mkt.lanka /tmp/mkt-fix
```

| Dato | Valor |
|------|-------|
| Repo trabajo | `lankacollective/mkt.lanka` |
| Supabase mkt-lanka ID | `ulbqvgvzvkxztfaaekmr` |
| Supabase mkt-lanka key | `sb_publishable_miMZnwmmW5b8WwSKIX0x1w_j7g6c8gh` |
| Supabase CAOS ID | `tmypjnoapglzdidrurqq` |
| CAOS API key | `caos_sk_lnk_7xK9mP2vQr3bN8dTw` |
| Vercel team | `team_gLT9zgMYCkjzrpCHnJvI0CHz` |
| LocalStorage key app | `LANKA_FINAL_2027_PRO` |
| Usuario | hola@lankacollective.com — Owner — Paola Sagrero González |

**Leer este archivo en próxima sesión:**
```
mcp__github__get_file_contents
owner: lankacollective | repo: mkt.lanka | branch: docs/contexto-sesion | path: CONTEXTO_SESION.md
```

**Pendientes Lanka HQ (próxima sesión):**
- [ ] Decidir postura de acceso (Vercel auth vs. Supabase RLS) — fix #3 bloqueante
- [ ] Reconciliar CAOS ↔ tareas Lanka HQ
- [ ] Arrancar schema multi-tenant de Lanka Manager (diagnostic_questions/responses/results)

---

*Actualizado: 30 de junio de 2026 — Auditoría Lanka HQ (fixes 1+2 aplicados) + Blueprint Lanka Manager*
