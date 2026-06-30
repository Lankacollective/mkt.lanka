# CONTEXTO DE SESIÓN — LANKA MKT OS
**Fecha:** 30 de junio de 2026 (actualizado — parte 2: Auth + CAOS)
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

**Auth (nuevo, 30 jun parte 2):** `auth.users` tiene 2 cuentas para proteger `lanka_hq` con login:
`hola@lankacollective.com` y `mathias@lankacollective.com`. Contraseñas entregadas a Paola directamente — no quedan registradas en este doc. RLS activo (`for all to authenticated using (true) with check (true)`) en `workspace, stickers, tasks, assemblies, vault_items, client_cases`.

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

**⚠️ Gaps conocidos de la API de CAOS (relevantes para lanka_hq, ver abajo):**
- No existe `DELETE /delete-task`.
- No existe campo `parent_id` (subtareas).

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

**Env var nueva en `lanka-hq` (Vercel, agregada 30 jun por Paola):** `CAOS_API_KEY` — usada server-side por `app/api/caos/route.ts`, nunca expuesta al cliente.

---

### Integraciones MCP disponibles
| Servicio | Notas |
|----------|-------|
| Google Calendar | Timezone: `America/Mexico_City`, calendar: `primary` |
| Google Drive | Buscar, leer, crear archivos |
| Notion | Workspace LANKA |
| Canva | Diseños, brand kit |
| Spotify | Búsqueda, playlists |
| GitHub | `mcp__github__*` — a veces tarda en conectar al inicio de sesión; si falla, usar `ToolSearch` con keyword "github" para esperar reconexión antes de asumir que no está disponible |

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
| `tasks` | **Ya no es la fuente de tareas de Lanka HQ** — ver sección CAOS abajo. Sigue existiendo en la BD pero `lib/store.tsx` ya no la lee/escribe. |
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

## PRs REALIZADOS (sesión 24 de junio)

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

## ARQUITECTURA DE LA APP (mkt.lanka)

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

**Nota lanka_hq (30 jun):** ese repo tenía un checkout local persistente en `/home/user/lanka_hq` dentro del sandbox, ya en la rama de trabajo asignada. Si la próxima sesión es remota/web, puede no tener ese checkout — usar `mcp__github__*` directamente, o clonar igual que mkt.lanka.

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
- `lib/store.tsx` (~780 líneas): Provider central — localStorage fallback, mappers Supabase↔state, `seedDB`, `loadFromDB`, toda la API de acciones (sticker/task/assembly/case/modelo/roadmap), y suscripciones realtime vía `supabase.channel('relational_sync')` con `postgres_changes` por tabla (stickers, assemblies, vault_items, client_cases — **tasks ya no está en esta lista, ver abajo**).
- Escrituras a Supabase eran "fire-and-forget": todo `.then(() => undefined)`, descartando cualquier error — el estado local y la BD podían divergir sin ninguna señal.
- `app/api/generate-tasks/route.ts`: ya usa `@anthropic-ai/sdk` con allowlist de modelos (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`), toma stickers seleccionados + contexto de estrategia, devuelve tasks/subtasks estructuradas en JSON. Es el patrón/template a reutilizar para cualquier feature de IA futura, tanto en HQ como en Lanka Manager. También es el modelo que se siguió para `app/api/caos/route.ts` (proxy server-side que oculta una API key).
- `vercel.json` tenía una config inválida que rompía el build — se eliminó (commit `c2d97ed`).

### Fixes bloqueantes — estado FINAL
1. ✅ **Blindaje de tipos JSONB** — aplicado. `loadFromDB()` valida con `Array.isArray`/`typeof` antes de usar `kpis`/`modelo`/`roadmap`/`config`; si la forma es inesperada, usa defaults en vez de crashear, y loggea el problema en vez de fallar en silencio.
2. ✅ **Errores de escritura visibles** — aplicado. Helper `logDbError(context, error)` en todos los call-sites de escritura de `store.tsx`.
   - Pushed: commit `ed39cdbc03a122843e98c2a215e91284e1086109`.
3. ✅ **Postura de acceso — RESUELTO.** Se construyó Supabase Auth + RLS (no el toggle de Vercel Deployment Protection):
   - `components/AuthGate.tsx` — wraps toda la app en `app/layout.tsx`, gatea el render detrás de `supabase.auth.getSession()` + form de login.
   - RLS `for all to authenticated using (true) with check (true)` en `workspace, stickers, tasks, assemblies, vault_items, client_cases`.
   - 2 cuentas creadas manualmente vía SQL (`auth.users`/`auth.identities`, sin Admin API/service_role disponible): `hola@lankacollective.com`, `mathias@lankacollective.com`.
   - **Bug encontrado y resuelto:** el insert manual dejaba `NULL` en columnas `email_change`, `email_change_token_new`, `email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token` de `auth.users` → el scanner de Go de GoTrue truena con `"converting NULL to string is unsupported"`, login devolvía 500 genérico. Fix: `UPDATE auth.users SET <esas columnas> = coalesce(<col>, '') WHERE email IN (...)`. Si en el futuro se crean más cuentas manualmente (sin Admin API), aplicar el mismo `coalesce` desde el insert.
   - Pushed: commits `5d308fd`, `80c21bc`.

### CAOS como fuente única de tareas — RESUELTO (decisión de Paola: "CAOS es la única, recomendado")
HQ ya **no tiene tabla de tareas propia activa**. `modules/hoy/Hoy.tsx` sigue funcionando igual (mismo `Task` shape, mismas acciones `addTask/updateTask/deleteTask` de `useLanka()`) pero por debajo todo habla con CAOS:

- `app/api/caos/route.ts` (nuevo) — proxy server-side GET/POST/PATCH hacia los Edge Functions de CAOS. La API key (`CAOS_API_KEY`) vive solo en env var de Vercel, nunca llega al bundle del cliente.
- `lib/caos.ts` (reescrito) — mapeo de enums HQ↔CAOS:
  - `TaskStatus`: `backlog↔inbox`, `today↔todo`, `doing↔doing`, `done↔done`. **`waiting` no tiene equivalente en CAOS → se mapea a `doing` (lossy, intencional).**
  - `Priority`: `Alta↔alta`, `Media↔media`, `Baja↔baja`.
  - `Owner`/`assignee`: pasa directo (string libre en ambos lados).
- `lib/store.tsx` — `loadFromDB`, `addTask`, `updateTask`, `deleteTask`, `assemblyToTask`, `quickAssemble`, `addAiTasks` todos usan CAOS. Suscripción realtime de `tasks` reemplazada por **polling cada 20s** (CAOS no tiene push/realtime).
- Pushed y **mergeado a `main`**: commit `ea665a4`. `CAOS_API_KEY` agregada en Vercel por Paola — el deploy debería tomarlo automáticamente.

**⚠️ Dos gaps reales, sin resolver, requieren tocar la Edge Function de CAOS (fuera de `lanka_hq`):**
1. **No hay `delete-task`.** `deleteTask` en `store.tsx` solo borra del estado local; la tarea reaparece en el siguiente poll/reload porque sigue viva en CAOS. Decisión pendiente con Paola: borrado físico vs. status `archivado` nuevo en el enum de CAOS (más seguro, recomendado).
2. **No hay `parent_id`/subtareas en CAOS.** Las subtareas que genera la IA (`addAiTasks`) y las que vienen de `assemblyToTask` se mandan a CAOS como tareas planas — el anidado visual sobrevive solo durante la sesión actual, se pierde al recargar. Requiere agregar columna `parent_id` a la tabla de CAOS + soporte en `add-task`/`get-tasks`.

Ambos están loggeados como tareas `todo` en CAOS (proyecto `CAOS`, ver tabla `tasks` vía `get-tasks?project=CAOS`).

### Checklist de mejora — 🟠 Importante — estado FINAL
- ✅ Reconciliar CAOS vs. tareas de Lanka HQ — resuelto, ver arriba (con los 2 gaps documentados).
- ⏳ Hacer que la lógica de re-seed de `loadFromDB` no sobreescriba datos de la nube ante errores transitorios — **sigue pendiente, no se tocó esta sesión.**
- ✅ Limpiar módulos huérfanos — hecho, **con una lección importante** (ver "⚠️ Aprendizaje" abajo).
- ⏳ Decidir si poblar o esconder módulos vacíos (Bóveda=0, Casos=0) — sigue pendiente. Hoy ya no aplica del mismo modo (las tareas vienen de CAOS, que sí tiene datos).

### ⚠️ Aprendizaje — auditar imports antes de borrar "código muerto"
Se identificaron 6 carpetas en `modules/` como aparentemente sin uso (cross-referenciando solo los imports de `components/Shell.tsx`/nav principal):
`assembly`, `automations`, `automations/Backup`, `command-center`, `dashboard`, `master-os`.

Las 6 se borraron. **4 de ellas (`master-os`, `dashboard`, `automations`, `automations/Backup`) en realidad SÍ estaban en uso** — `modules/sistema/Sistema.tsx` las importa como sub-tabs internos (`Master OS`, `Métricas`, `Automatizaciones`, `Backup`), pero esa relación no es visible desde `Shell.tsx`. El build se rompió (`npx tsc --noEmit` falló con `Cannot find module`) y se detectó recién al verificar con un build real, no solo con el grep inicial sobre el nav. Se restauraron desde el commit previo al borrado y el build vuelve a pasar limpio.

**Solo `assembly` (`AssemblyFlow.tsx`) y `command-center` (`CommandCenter.tsx`) eran código muerto real** — confirmado con `grep` recursivo de sus nombres de export en todo el repo, cero matches.

**Para la próxima sesión, si se vuelve a auditar código muerto en `lanka_hq`:** no basta con mirar `Shell.tsx`. Hacer `grep -r "from '@/modules/X" .` (o el import relativo equivalente) sobre **todo** el repo antes de borrar cualquier carpeta de `modules/`, y correr `npx tsc --noEmit` después de borrar, antes de hacer commit/push.

### Insertados en sesión del 30 jun (parte 1)
- 7 stickers nuevos en Supabase (`stickers`, proyecto `ulbqvgvzvkxztfaaekmr`): Boca a Boca, El número shock, Observador en la sala, Visitar 3 veces, Relatividad vs. Absolutismo, Mostrar herramienta antes que el output, Caballo de Troya.
- Tarea CAOS: `t1782798067187906` — "Comprar dominio lankahq.io", LANKA HQ, 2026-07-15, prioridad media.

### Insertados/sincronizados en sesión del 30 jun (parte 2 — esta)
6 tareas nuevas en CAOS documentando el trabajo de hoy (`get-tasks?date=2026-06-30&source=sesión 2026-06-30`):
- "Auth Supabase + RLS para lanka_hq (Fix 3)" — `done`
- "Auditoría y limpieza de módulos muertos en lanka_hq" — `done`
- "CAOS como única fuente de tareas en lanka_hq" — `done`
- "CAOS: agregar endpoint delete-task" — `todo`, proyecto `CAOS`
- "CAOS: agregar soporte de subtareas (parent_id)" — `todo`, proyecto `CAOS`
- "Lanka Manager: schema diagnóstico 63 preguntas" — `todo`, proyecto `LANKA MANAGER`

---

## BLUEPRINT LANKA MANAGER — 30 de junio de 2026

Producto externo de diagnóstico de rentabilidad F&B. Vive en `lanka-manager.vercel.app`, en construcción. **No iniciado todavía** (próxima prioridad, "item B" de la sesión del 30 de junio).

### Reutilización de arquitectura de Lanka HQ
- `client_cases` (ya existe en `ulbqvgvzvkxztfaaekmr`, stage: prospecto→diagnóstico→implementación→seguimiento→cerrado, con `maturity_score` y `kpis` jsonb ya con forma F&B) se reutiliza como registro maestro del cliente.
- Patrón de IA de `app/api/generate-tasks/route.ts` (Anthropic SDK + allowlist de modelos + input estructurado → output JSON estructurado) es el template para el motor de interpretación del diagnóstico de 63 preguntas. `app/api/caos/route.ts` (nuevo, 30 jun parte 2) es un segundo ejemplo del mismo patrón de proxy server-side, útil de referencia.

### Tablas nuevas propuestas
- `diagnostic_questions` — banco de las 63 preguntas.
- `diagnostic_responses` — respuestas por cliente/sesión.
- `diagnostic_results` — resultados/score interpretado.
- **Decisión a tomar ahora, no después:** todas multi-tenant desde el día uno vía `workspace_id`/`client_id` — evitar repetir el error de `WORKSPACE_ID` hardcodeado encontrado en Lanka HQ.

---

## PARA INICIAR LA PRÓXIMA SESIÓN

```bash
git clone https://github.com/Lankacollective/mkt.lanka /tmp/mkt-fix
# o, para lanka_hq:
git clone https://github.com/Lankacollective/lanka_hq /tmp/lanka_hq
```

| Dato | Valor |
|------|-------|
| Repo trabajo | `lankacollective/mkt.lanka` y `lankacollective/lanka_hq` |
| Supabase mkt-lanka ID | `ulbqvgvzvkxztfaaekmr` |
| Supabase mkt-lanka key | `sb_publishable_miMZnwmmW5b8WwSKIX0x1w_j7g6c8gh` |
| Supabase CAOS ID | `tmypjnoapglzdidrurqq` |
| CAOS API key | `caos_sk_lnk_7xK9mP2vQr3bN8dTw` |
| Vercel team | `team_gLT9zgMYCkjzrpCHnJvI0CHz` |
| LocalStorage key app (mkt.lanka) | `LANKA_FINAL_2027_PRO` |
| Usuario | hola@lankacollective.com — Owner — Paola Sagrero González |
| Login lanka_hq | Supabase Auth, 2 cuentas activas (hola@/mathias@lankacollective.com) — contraseñas con Paola |

**Leer este archivo en próxima sesión:**
```
mcp__github__get_file_contents
owner: lankacollective | repo: mkt.lanka | branch: docs/contexto-sesion | path: CONTEXTO_SESION.md
```

**Cómo auditar el estado real (no confiar solo en este doc):**
1. `mcp__github__list_commits` sobre `lanka_hq` y `mkt.lanka` (rama `main`) para ver qué se mergeó después de esta fecha.
2. `get-tasks?project=CAOS` y `get-tasks?project=LANKA%20HQ` en CAOS para ver qué sigue `todo` vs `done` — es más confiable que este doc para el estado día a día, este doc es para *contexto histórico y arquitectura*, CAOS es la fuente viva de qué falta.
3. Antes de tocar `modules/` en `lanka_hq`: `grep -r "from '@/modules/<nombre>'" .` en todo el repo, no solo `Shell.tsx` (ver "⚠️ Aprendizaje" arriba — ya costó un build roto una vez).
4. Antes de asumir que algo "no se puede hacer por falta de acceso": confirmar qué MCP están disponibles en la sesión actual (a veces tardan en conectar al inicio, especialmente GitHub — reintentar con `ToolSearch` antes de reportarlo como bloqueante).

**Pendientes Lanka HQ (próxima sesión):**
- [ ] CAOS: decidir y construir `delete-task` (físico vs. status `archivado`) — Edge Function de CAOS, fuera de `lanka_hq`
- [ ] CAOS: agregar columna `parent_id` para subtareas — Edge Function de CAOS
- [ ] Item B: arrancar schema multi-tenant de Lanka Manager (`diagnostic_questions`/`responses`/`results`) — no iniciado
- [ ] `loadFromDB` re-seed logic: evitar sobreescribir nube en errores transitorios (pendiente desde la auditoría original)
- [ ] Decidir si poblar/esconder Bóveda y Casos (siguen vacíos)

---

*Actualizado: 30 de junio de 2026 (parte 2) — Auth + RLS resuelto, CAOS como fuente única de tareas en lanka_hq, limpieza de módulos corregida tras detectar build roto, 6 tareas de seguimiento sincronizadas a CAOS.*
