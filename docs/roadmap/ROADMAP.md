# MKT.LANKA — Auditoría, Arquitectura y Roadmap de Marketing OS

**Autor:** Consultoría de producto (Loptus / Claude)
**Fecha:** 2026-06-27
**Repo analizado:** `lankacollective/mkt.lanka` — `index.html` (15,131 líneas, ~1.1 MB), `supabase/functions/send-push`
**Branch:** `claude/mkt-lanka-roadmap-ug1wnu`

> Este documento es el análisis maestro. Los entregables tabulares viven en `artefactos/`:
> 1. `01-auditoria-fallas.md` — tabla de fallas
> 2. `02-flujo-operacion.md` — diagrama Mermaid del flujo ideal
> 3. `03-fichas-integraciones.md` — ficha técnica por API
> 4. `04-roadmap-fases.md` — fases con esfuerzo/impacto
> 5. `05-top-mejoras.md` — top mejoras por impacto × facilidad

---

## Hallazgo raíz (lo que define todo lo demás)

Antes de las 10 secciones, hay **un solo hecho técnico** que condiciona el 70% de los riesgos y de las soluciones. Lo confirmé leyendo el código, no la descripción:

**Todo MKT.LANKA es UNA sola fila de Supabase.**

```js
// index.html:3671 — guardarBD()
await window.__supabase.from('lanka_db').upsert({
    id: 'main',          // ← SIEMPRE 'main'. Una fila para TODA la operación.
    data: DB,            // ← TODOS los proyectos (Aitama+Mammut+Pololo) en un blob JSON
    updated_at: ...,
    updated_by: ...
});
```

```js
// index.html:3080 — suscripción realtime
.channel('lanka_changes')
.on('postgres_changes', { event:'UPDATE', table:'lanka_db' }, (payload) => {
    DB = payload.new.data;   // ← cada navegador recibe el blob COMPLETO de todos los clientes
    renderTodas();           // ← y re-renderiza TODO
})
```

```js
// index.html:2719, 2723, 3023 — credenciales
{ id:"cl_aitama", password: btoa("Aitama26") }              // base64, NO hash
{ id:"u_paola", password: btoa("Lanka2026"), proyectos:["aitama","mammut"] }
```

Consecuencias directas, todas verificables abriendo DevTools en producción:

1. **El aislamiento entre proyectos es cosmético, no real.** La restricción "un usuario de Mammut no puede ver datos de Aitama" se cumple solo en la UI. En memoria, `window.DB` contiene Aitama, Mammut y Pololo completos —incluyendo presupuestos, facturas y contraseñas— en **cada** dispositivo conectado, incluido el de una agencia externa. `console.log(DB)` lo revela todo. **Esto es un incidente de privacidad, no un bug de UX.**
2. **Las contraseñas son `btoa()` = base64.** `atob("QWl0YW1hMjY=")` → `"Aitama26"`. No es cifrado; es codificación reversible. Cualquiera con el blob tiene todas las contraseñas en claro.
3. **Last-write-wins sobre todo el blob.** Si Paola edita Aitama y un coordinador de Mammut guarda al mismo tiempo, el último `upsert` pisa el DB entero del otro. La maquinaria defensiva `_supabaseVerificado` / `_localChangedDuringInit` / `_hadLocalData` (index.html:3643-3664) es cicatriz de pérdidas de datos que **ya ocurren**.
4. **Cada guardado sube el blob completo.** Hoy con 3 proyectos quizá 1-3 MB. Con 50 proyectos el blob es decenas de MB y cada tecleo (debounce 900 ms, línea 3667) re-serializa y re-sube todo. Cada evento realtime re-baja todo y dispara `renderTodas()`. Es O(toda-la-empresa) por escritura.
5. **10+ migraciones secuenciales corren en el navegador en cada carga** (index.html:3098-3470, bloques `_s3migrated`…`_monedaMigrated`). El costo de arranque crece para siempre y es frágil: si una migración falla a media ejecución, deja el blob inconsistente.

**Conclusión:** la prioridad #1 del roadmap no es una integración de API: es **partir el blob en filas por proyecto con Row-Level Security (RLS)**. Sin eso, conectar Meta/Google solo agrega más datos sensibles a un contenedor que ya filtra. Todas las integraciones de las secciones 4-7 dependen de esta base (sección 8, Fase 1).

---

## 1. AUDITORÍA DE FALLAS Y FRICCIONES ACTUALES

Tabla completa en `artefactos/01-auditoria-fallas.md`. Aquí el análisis por categoría con el módulo/función exactos.

### 1.1 Puntos de entrada de error humano
- **Ad Performance (captura manual de pauta).** Hoy alguien teclea gasto, CPR, CTR, conversiones de Meta/Google/TikTok a mano. Tres errores típicos: (a) tipear MXN como USD, (b) capturar gasto acumulado vs. del día, (c) olvidar registrar un día → el semáforo del Dashboard miente. No hay validación de rango ni de moneda más allá del flag `_monedaMigrated`.
- **Dashboard KPIs / metas vs. resultados.** Las metas (`kpi_metas`, migradas de localStorage a DB en index.html:3460-3470) y los resultados se capturan en flujos distintos; nada garantiza que la meta y el resultado se midan con la misma definición (¿alcance o impresiones? ¿seguidores netos o brutos?).
- **Presupuesto & Facturas (P/R/C).** Planeado/Real/Comprometido se teclea por partida y mes. Sin conexión a Ad Performance, el "Real" de medios se captura dos veces (una en pauta, otra en presupuesto) y divergen.
- **Contraseñas por proyecto y por miembro** se definen a mano con `btoa()` en la semilla; rotarlas implica editar el blob.

### 1.2 Fricciones de UX por rol
- **Socio-Director (cliente, no técnico).** Entra por contraseña de proyecto (index.html:2719) y cae en una app diseñada para operar, no para decidir. La restricción dice que su UX debe ser "de CEO": hoy no existe una vista de aterrizaje de 1 pantalla con 4 números y 2 frases. El **Modo Director** (`renderDirector`) es lo más cercano, pero convive con 16 módulos operativos que el cliente no debería ver.
- **Agencia externa.** Sube assets al DAM pero su navegador descarga el blob completo (ver hallazgo raíz). Fricción + riesgo: ve más de lo que debe y carga más de lo que necesita.
- **Coordinador.** Vive en el Kanban del Calendario de Contenido (`_buildKanbanCard`) y en Shooting, pero el cambio de estado idea→producción→…→publicado es manual y no dispara nada aguas abajo (ni tarea en CAOS, ni recordatorio de captura de métricas).
- **Paola (multi-proyecto).** Para ver el estado de los 3 clientes hoy tiene que entrar a cada uno. No hay un tablero "todos los proyectos a la vez" salvo lo que ella arme mentalmente.

### 1.3 Datos hoy manuales que deberían ser automáticos
| Dato | Módulo actual | Fuente automática real |
|---|---|---|
| Alcance, impresiones, engagement, seguidores | Dashboard (manual) | Instagram Graph API `GET /{ig-user-id}/insights` |
| Gasto, CPR, CTR, conversiones de pauta | Ad Performance (manual) | Meta Ads `GET /act_{id}/insights`, Google Ads `GoogleAdsService.SearchStream` |
| Sesiones, fuentes, conversiones web | (no existe) | GA4 Data API `runReport` |
| Reseñas y calificación | (no existe) | Google Business Profile API `accounts.locations.reviews` |
| Órdenes / ticket promedio (restaurante) | Presupuesto (manual) | Uber Eats / Rappi / DiDi partner APIs |
| Estado "publicado" del calendario | Kanban (manual) | Confirmación de publicación vía Graph API |

### 1.4 Módulos desconectados que deberían integrarse
- **Calendario de Contenido ↔ Ad Performance ↔ Dashboard.** Un post pasa a "Publicado" pero su rendimiento (alcance, guardados, ventas atribuidas) nunca regresa a la tarjeta. Imposible responder "¿qué post funcionó?". **Esta es la desconexión más cara**: rompe el bucle contenido→resultado del que vive una agencia.
- **Shooting ↔ DAM ↔ Calendario.** Una sesión fotográfica produce assets que se suben al DAM y se usan en posts, pero los tres viven como islas; no hay trazabilidad "este shooting alimentó estos 8 posts".
- **Brand Kit / Briefing ↔ generación de contenido.** El tono, paleta y reglas existen como ficha estática; no alimentan ninguna sugerencia de copy ni validación de marca.
- **Presupuesto ↔ Ad Performance.** Doble captura del gasto de medios (ver 1.1).
- **Usuarios/Roles ↔ aislamiento real.** El control de accesos (módulo 13) decide qué se *renderiza*, no qué se *descarga* (ver hallazgo raíz).

### 1.5 Riesgos de pérdida / inconsistencia de datos
- **Colisión de escritura sobre fila única** (hallazgo raíz #3): última escritura gana, sin merge por campo.
- **localStorage como fuente de verdad transitoria** (index.html:3700): un navegador con datos viejos puede re-emitir un blob obsoleto; el código pelea contra esto con heurísticas, no con CRDT/versionado.
- **Migraciones in-browser** (3098-3470): fallo a media migración = blob inconsistente replicado a todos por realtime.
- **Sin historial.** `lanka_db` guarda el estado actual; no hay tabla de métricas históricas con fecha. El Dashboard "semana a semana" depende de que alguien no haya sobrescrito la semana pasada.

### 1.6 Escalabilidad
- **Tamaño de payload** crece lineal con #proyectos × #datos; cada save/sync mueve todo (hallazgo raíz #4).
- **Render.** `renderTodas()` en cada evento realtime: con más datos, cada cambio ajeno congela la UI de todos.
- **Migraciones acumulativas** en el arranque: el time-to-interactive empeora con cada sprint.
- **Rate limits de futuras APIs.** Con Instagram limitado a ~200 llamadas/hora por cuenta ([Meta](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)), 50 proyectos sincronizando desde el cliente sería inviable; obliga a backend con caché (sección 8).

---

## 2. FLUJO DE TRABAJO IDEAL — PROYECTO NUEVO

Objetivo: pasar de "0 a operando" en < 30 min, con la IA haciendo el 80% del trabajo pesado.

### 2.1 Onboarding del proyecto (MVP para operar)
Wizard de 5 pasos (no 16 módulos vacíos):
1. **Identidad mínima:** nombre, `tipo` (wellness | restaurante | retail | moda — ya existe el campo `tipo` en index.html:2719), ciudad(es)/sucursales, moneda. → crea la **fila** del proyecto (no entrada en el blob).
2. **Conectar plataformas (OAuth, no claves):** botones "Conectar Instagram", "Conectar Google", "Conectar TikTok". Cada cliente conecta SU cuenta (restricción clave). Tokens guardados cifrados por proyecto (sección 8.6).
3. **Brand Kit semilla por IA:** Loptus toma logo + 3 fotos + el sitio web y propone paleta, tipografías y tono (co-creación, sección 2.6).
4. **Equipo y roles:** invitar Socio-Director, coordinador, agencia; cada uno con magic-link (no `btoa`).
5. **Metas trimestrales:** 3-4 KPIs con su definición fijada (alcance vs. impresiones, etc.) para cerrar el hueco de 1.1.

### 2.2 Onboarding de usuarios por rol (primer login)
- **Socio-Director →** aterriza en **Modo Director / vista CEO**: 4 números (alcance, gasto, leads/ventas, semáforo) + "Qué funcionó / Qué cambiamos" + 1 botón "Aprobar parrilla". Nada operativo.
- **Coordinador →** Kanban de la semana + tareas CAOS asignadas + huecos de shooting.
- **Agencia externa →** solo DAM de su proyecto + briefs asignados. Cero finanzas, cero otros proyectos (ahora sí, a nivel de datos).
- **Paola/Mathias →** selector multi-proyecto con semáforo de los N clientes.

### 2.3 Automatizaciones al crear el proyecto (trigger → acción → resultado)
- **Trigger:** se crea la fila del proyecto → **Acción:** seed de Kanban con plantilla por `tipo` (2.5), creación de calendario base 30 días, alta de canal CAOS del proyecto → **Resultado:** el coordinador entra y ya hay estructura, no lienzo en blanco.
- **Trigger:** OAuth de Instagram completado → **Acción:** primer pull de seguidores/alcance de 30 días al histórico → **Resultado:** Dashboard con baseline desde el día 1.
- **Trigger:** Brand Kit aprobado → **Acción:** Loptus genera 12 ejes de Mood (módulo 10) y 2 targets borrador → **Resultado:** estrategia inicial editable, no vacía.

### 2.4 Conexión de plataformas desde el día 1
OAuth, nunca pegar claves. Botón → flujo OAuth → token cifrado por proyecto en tabla `project_connections` (sección 8.6). Detalle por API en sección 4 y `artefactos/03-fichas-integraciones.md`.

### 2.5 Plantillas inteligentes por tipo de negocio
El campo `tipo` ya existe; se vuelve accionable:
- **wellness (Aitama):** ejes calma/ritual/autocuidado; formatos carrusel educativo + reels de tratamiento; mejores horas tarde-noche; KPI clave = citas agendadas.
- **restaurante (Mammut):** ejes antojo/proceso/lugar; reels de producto + UGC; horas pre-comida/pre-cena; KPI = órdenes (incluye Uber Eats/Rappi, sección 4d).
- **retail/moda (Pololo):** ejes lookbook/drop/detrás-de-cámara; carruseles de catálogo + reels de fit; KPI = tráfico a tienda/web + ventas.

### 2.6 Co-creación de estrategia por IA
Loptus, con acceso a datos reales (sección 5 + extensión CAOS de sección 8.7), recibe `tipo`, sitio web, competidores y primeras métricas y devuelve **borradores editables** de: Brand Kit, parrilla de 30 días, 2-3 targets y matriz Mood 12 meses. Paola edita y aprueba; nunca publica sin su OK.

---

## 3. FLUJO DE TRABAJO IDEAL — OPERACIÓN CONTINUA

Diagrama completo en `artefactos/02-flujo-operacion.md`. Resumen:

### 3.1 Datos que llegan solos
Sincronización por cron (Edge Function programada): Instagram/Meta Ads, GA4, Google Business, TikTok, delivery apps. El humano deja de capturar KPIs y pauta. Frecuencias en sección 4.

### 3.2 IA autónoma vs. IA con humano
| La IA hace sola | La IA propone, humano decide |
|---|---|
| Ingerir métricas, normalizar moneda, detectar anomalías | Pausar/escalar una campaña de pauta |
| Marcar tarea CAOS al confirmar publicación | Aprobar/publicar contenido |
| Redactar borradores de "Qué funcionó / Qué cambiamos" | Cambiar ejes o presupuesto del trimestre |
| Sugerir mejor hora/formato | Responder reseñas negativas / crisis |
| Alertar caídas > 20% | Reasignar presupuesto entre canales |

### 3.3 Flujo de contenido cerrado (el bucle que hoy está roto)
`Idea → Producción → Revisión → Aprobado (registro quién/cuándo, módulo 14) → Programado → Publicado → MÉTRICAS DE VUELTA A LA TARJETA`. El último eslabón es nuevo: al publicar, se guarda el `media_id` de Instagram en la tarjeta del Kanban; un cron trae alcance/guardados/comentarios a las 24 h, 72 h y 7 días y los pinta en la propia tarjeta. Así `_buildKanbanCard` muestra resultado, no solo estado.

### 3.4 Avisos proactivos
Trigger (anomalía/umbral) → acción (notificación) → resultado (decisión). Ejemplos: caída de alcance > 20% sem/sem; CPR de una campaña > 1.5× la media → sugiere pausar; reseña ≤ 2★ nueva → alerta a Paola; pico de comentarios negativos → alerta de crisis (sección 7). Entrega: push (ya existe `supabase/functions/send-push`) + tarea CAOS + resumen diario de Loptus.

### 3.5 IA analiza y propone ajustes
Mensualmente Loptus corre el motor de insights (sección 5) y entrega propuesta de ajuste estratégico: cambiar ejes que no rinden, mover presupuesto al canal con mejor CPA, ajustar horarios. Paola aprueba con un clic.

### 3.6 Multi-sucursal con contenido diferenciado
El modelo ya distingue `clientes` (marca) y `sucursales` (index.html:2722). Se formaliza: **marca** (Brand Kit, tono, ejes compartidos) vs. **sucursal** (calendario, métricas, pauta y cuentas sociales propias). Un post puede ser "de marca" (replica a todas) o "de sucursal" (solo una). Las métricas se agregan por marca para el Socio-Director y se desglosan por sucursal para el coordinador.

---

## 4. INTEGRACIONES DE APIs — DISEÑO TÉCNICO

Fichas completas en `artefactos/03-fichas-integraciones.md`. Principios transversales: (1) cada cliente conecta SU cuenta vía OAuth; (2) la sincronización ocurre en **Edge Functions**, nunca en el navegador (claves nunca en el cliente); (3) todo dato se escribe a la tabla de métricas históricas (sección 8.4) con `project_id` + `fecha`.

### 4a. META (Instagram + Facebook Ads)
- **Versión actual:** Graph API **v21.0** (Meta saca versión nueva cada trimestre — planear upgrades). ([Meta Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/), [guía 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/))
- **Instagram insights:** `GET /{ig-user-id}/insights?metric=reach,impressions,follower_count,profile_views` y por publicación `GET /{ig-media-id}/insights?metric=reach,saved,shares,total_interactions`. Stories/Reels tienen sus métricas propias.
- **Meta Ads:** `GET /act_{ad-account-id}/insights?fields=spend,cpr,ctr,actions,reach&level=campaign`. Estado de campaña vía `/{campaign-id}?fields=effective_status`.
- **Rate limit:** ~**200 llamadas/hora por cuenta** en insights ([Meta 2026](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026)) → obliga a caché y a no llamar desde el cliente.
- **Frecuencia sync:** orgánico cada 6 h; pauta cada 3 h (el gasto se mueve rápido).
- **Cómo se muestra:** reemplaza la captura manual del Dashboard y de Ad Performance; alimenta métricas en tarjetas del Kanban (3.3).
- **Acción automatizada:** publicación directa de posts aprobados vía `POST /{ig-user-id}/media` + `media_publish` (opcional, siempre con confirmación humana); anomalías → alertas (3.4).
- **Trade-off:** requiere App Review de Meta (permisos `instagram_basic`, `instagram_manage_insights`, `ads_read`) y cuentas Business/Creator vinculadas a una Página. Es semanas de aprobación: empezar el trámite ya.

### 4b. GOOGLE
- **GA4 — Data API v1beta:** `properties.runReport` con métricas `sessions, totalUsers, conversions` y dimensiones `sessionSource/Medium`. Scope OAuth `analytics.readonly`. Cuota por propiedad por tokens de análisis. Sync diario.
- **Google Ads API:** `GoogleAdsService.SearchStream` (GAQL) para campañas, keywords, CPC, Quality Score, conversiones. Requiere **developer token** (aprobación) + OAuth del cliente. Sync cada 6 h.
- **Google Business Profile API:** `accounts.locations.reviews` (reseñas/estrellas), `locations` (búsquedas, vistas del perfil). Clave para SEO local (sección 6) y crisis (sección 7). Sync cada 6 h; reseñas vía notificación push si hay webhook disponible.
- **Search Console API:** `searchanalytics.query` (queries, posición, impresiones, CTR orgánico). Sync diario. Es el insumo #1 de posicionamiento orgánico (sección 6).
- **Trade-off:** son 4 productos con consentimientos OAuth y cuotas distintas; Google Ads y GA4 piden aprobaciones separadas. Priorizar **Business Profile + Search Console** primero: bajo costo de aprobación, alto valor para clientes locales (spa, restaurante).

### 4c. TIKTOK
- **TikTok Business / Display API:** vistas, engagement, seguidores, alcance por video. **TikTok Marketing API:** gasto, CPM, CTR, conversiones.
- **Trade-off real:** requiere alta como developer, App Review y la disponibilidad/scopes varían por región (México OK, pero validar). Aprobación más lenta y documentación menos estable que Meta. **Prioridad media:** integrar después de Meta+Google, salvo que un cliente sea TikTok-first.

### 4d. UBER EATS / RAPPI / DIDI FOOD (restaurante → Mammut)
- **Uber Eats:** tiene Marketplace/Integration APIs (órdenes, menú, métricas de tienda) pero el acceso es **partner-gated** (alta como integrador). Rappi y DiDi Food tienen programas de partners con APIs no totalmente públicas.
- **Datos objetivo:** órdenes, ticket promedio, calificación, platillos más vendidos → al Dashboard de ventas del proyecto restaurante.
- **Realidad/trade-off:** la API pública abierta es limitada; **plan B pragmático** mientras se consigue acceso partner: importación semanal del CSV/reporte del portal de cada plataforma, parseado por Edge Function. Da el 80% del valor sin esperar aprobación.
- **Prioridad:** alta para Mammut (gran parte de su venta es delivery), baja para wellness/retail.

### 4e. OTRAS PLATAFORMAS — priorización para clientes LANKA
| Plataforma | Valor para LANKA | Prioridad |
|---|---|---|
| **WhatsApp Business API** (Cloud API) | Volumen de DMs, conversión, tiempo de respuesta — clave para spa/restaurante que cierran cita/reserva por WA. Ya hay ManyChat en el Briefing. | **Alta** |
| **Shopify / WooCommerce** | Ventas reales de retail/moda (Pololo) → cierra el bucle contenido→venta. Webhooks nativos, fácil. | **Alta** (si hay ecommerce) |
| **Mercado Libre** | Solo si el cliente vende ahí. | Media |
| **Pinterest** | Tráfico para moda/retail; bajo esfuerzo. | Baja-media |
| **Spotify for Podcasters** | Solo si el cliente tiene podcast. | Baja (on-demand) |

---

## 5. MOTOR DE INSIGHTS CON IA

Diseño: Edge Function `insights-engine` corre nightly + on-demand, lee la tabla de métricas históricas (8.4) y escribe a `insights` (proyecto, tipo, severidad, texto, evidencia, acción sugerida). Loptus las consume y las presenta. Nada se ejecuta sin humano salvo alertas informativas.

- **Detección de anomalías:** por cada KPI, compara ventana actual vs. anterior; marca caídas/subidas > 20% con z-score sobre 8 semanas para no gritar por ruido. Output: "Alcance de Aitama −34% sem/sem; coincide con 0 reels publicados (vs. 3 la semana previa)". El *porqué* sale de correlacionar con el calendario.
- **Correlación contenido → resultado:** une `media_id` del Kanban con métricas + (si hay) ventas/citas de la misma ventana. Responde "los reels de proceso de Mammut generan 2.3× más guardados y correlacionan con picos de órdenes en Uber Eats el mismo fin de semana".
- **Optimización de pauta:** regla + criterio. Pausar si CPR > 1.5× media histórica con gasto > X y conversiones = 0 por 3 días. Escalar si CPA < objetivo y volumen disponible. **Siempre propone, Paola/cliente confirma.**
- **Insights de audiencia (target real vs. definido):** compara `audience_gender_age`/`audience_city` de Instagram insights contra los `targets` del módulo 9. Output: "definiste 25-34 mujeres CDMX; quien realmente interactúa es 35-44 Morelia → ajustar target y pauta".
- **Recomendaciones de calendario:** mejores días/horas/formato por proyecto, derivados del histórico propio (no benchmarks genéricos).
- **Benchmark competitivo:** con datos públicos de competidores (seguidores/engagement vía scraping permitido o APIs) para contexto; etiquetado como estimación.
- **"Qué funcionó / Qué cambiamos":** Loptus redacta el borrador mensual desde anomalías + correlaciones; Paola edita. Alimenta el Reporte Mensual (módulo 16) y el Modo Director.
- **Propuesta mensual de ajuste estratégico:** cambio de ejes, formatos y reasignación de presupuesto, como tarea CAOS aprobable.

---

## 6. POSICIONAMIENTO ORGÁNICO — ESTRATEGIA INTEGRADA

- **SEO local** (alto ROI para spa/restaurante): Google Business Profile (reseñas, vistas, búsquedas) + Search Console (queries por las que ya apareces) → Loptus detecta queries con impresiones pero baja posición y propone contenido (post/blog/ficha) para subirlas. Trigger: query nueva con > N impresiones y posición > 10 → tarea "crear contenido para «X»".
- **Orgánico IG/TikTok:** del histórico propio salen hashtags, horarios y formatos que realmente mueven alcance —no listas genéricas. La IA propone hashtags por desempeño real medido, no por moda.
- **Contenido data-driven:** el calendario se llena desde lo que funciona (correlación de sección 5) y desde lo que se busca (Search Console), no desde intuición.
- **Copy + hashtags por IA:** Loptus genera variantes respetando Brand Kit/tono (módulos 7-8, hoy desconectados) y prioriza lo que históricamente rindió.
- **Conexión calendario ↔ orgánico:** cada idea del Kanban puede nacer de un insight de búsqueda/engagement, cerrando el círculo dato→idea→publicación→medición→dato.

---

## 7. GESTIÓN MULTI-PLATAFORMA UNIFICADA

Capa nueva "Publicar & Escuchar", construida sobre el backend de la sección 8.

- **Inbox unificado** de comentarios + DMs de Instagram, Facebook, TikTok y reseñas de Google, normalizados a un esquema `interactions(project_id, source, author, text, sentiment, status)`. Respeta el límite de DMs de Instagram (~200/h) con caché.
- **Publicación cross-platform** desde la parrilla: un post aprobado → IG + FB (+ TikTok cuando aplique) vía sus APIs, con confirmación.
- **Adaptación de formato** por plataforma (4:3 IG → 9:16 TikTok/Reels): recorte/relleno automático con plantilla, revisión humana antes de publicar.
- **Monitoreo de menciones/hashtags** de marca → al inbox; alimenta detección de crisis.
- **Reseñas Google con respuesta asistida por IA:** Loptus redacta respuesta acorde al tono; humano aprueba (especialmente en reseñas negativas).
- **Alertas de crisis:** trigger = pico de comentarios negativos (sentimiento < umbral en ventana corta) o caída de calificación → acción = alerta inmediata a Paola (push + CAOS) → resultado = respuesta coordinada antes de que escale.

---

## 8. ARQUITECTURA TÉCNICA RECOMENDADA

Razonada para el escenario de 50 proyectos, no para hoy.

### 8.1 Qué migra a backend real (y qué no)
- **Se queda en el cliente:** toda la UI actual (vanilla JS). No se reescribe a un framework — el presupuesto no lo justifica y funciona.
- **Migra a Edge Functions de Supabase:** (a) toda integración de API externa (claves nunca en el cliente), (b) el motor de insights, (c) los crons de sincronización, (d) los webhooks entrantes. Next.js **no** es necesario; Supabase Edge Functions cubre el caso y mantiene el stack barato.
- **Pricing que lo respalda:** Edge Functions incluye 500k invocaciones/mes en Free y 2M en Pro (~$25), luego $2 por 1M ([Supabase Pricing](https://supabase.com/docs/guides/functions/pricing)). Con crons cada pocas horas por proyecto, 50 proyectos caben holgadamente en Pro. Ojo: se cobran cold starts y ejecuciones fallidas — diseñar funciones idempotentes y con reintentos acotados.

### 8.2 El cambio estructural #1: partir el blob
Reemplazar la fila única `lanka_db(id:'main', data)` por filas por proyecto + RLS:
```
projects(id, nombre, tipo, moneda, created_at)
project_data(project_id, modulo, data jsonb)        -- estado operativo por módulo y proyecto
project_members(project_id, user_id, rol, created_at)
```
**RLS** en `project_data`/`project_members`: una fila solo es legible si el `auth.uid()` pertenece a ese `project_id`. Así el aislamiento deja de ser cosmético: el navegador de Mammut **no puede descargar** Aitama, aunque quiera. Paola/Mathias tienen rol global que sí ve todos. Esto requiere mover de "contraseña por proyecto" a **Supabase Auth** (magic link / email) — y elimina los `btoa()`.

### 8.3 Integraciones sin exponer claves
Tokens OAuth de cada cliente cifrados en `project_connections` (8.6); solo las Edge Functions (service role) los leen. El cliente nunca ve un token. El navegador llama a *tu* Edge Function, no a Meta/Google.

### 8.4 Modelo de datos para métricas históricas multi-plataforma
```
metrics(
  id, project_id, sucursal_id, source,      -- 'instagram'|'meta_ads'|'ga4'|'gbp'|'tiktok'|'ubereats'...
  metric, value numeric, currency,
  date date, granularity,                   -- 'day'|'week'|'month'
  entity_type, entity_id,                   -- 'account'|'post'|'campaign' + id externo (media_id, campaign_id)
  fetched_at
)
-- índice (project_id, source, date). Append-only → habilita series de tiempo reales (cierra 1.5 "sin historial").
```
Tabla aparte `insights` (sección 5) y `interactions` (sección 7).

### 8.5 Caché y rate limits
- **Sincronización por cron en backend**, no por usuario: 50 clientes no multiplican llamadas por #usuarios.
- **Respetar el ~200/h de Instagram:** batch de métricas, backoff exponencial ante error 4/17/32, y servir siempre desde `metrics` (no llamar a Meta en cada page-load).
- **Caché de lectura:** el front lee de `metrics`/`project_data`; las APIs externas solo las toca el backend en su ventana programada.

### 8.6 Seguridad por rol (tokens por proyecto)
```
project_connections(project_id, provider, access_token_encrypted, refresh_token_encrypted, scopes, expires_at)
```
Cifrado con Supabase Vault / pgsodium. Tokens **por proyecto, nunca globales** (restricción clave). Rotación de refresh tokens en Edge Function. Roles: Owner global (Paola/Mathias) > Socio-Director (su proyecto) > Coordinador > Equipo > Agencia (solo DAM+briefs). El control de accesos del módulo 13 pasa de filtro de render a **políticas RLS**.

### 8.7 Extender CAOS para que Loptus actúe sobre datos reales
Hoy Loptus opera CAOS (tareas) por API. Se añaden Edge Functions equivalentes para MKT.LANKA, con la misma autenticación por API key del CLAUDE.md de `lanka_hq`:
- `get-metrics` (lee `metrics` por proyecto/rango) → Loptus responde "¿cómo va Aitama?" con datos reales.
- `get-insights` / `create-insight` → leer y registrar hallazgos.
- `propose-action` (pausar pauta, mover presupuesto, agendar post) → crea una **propuesta aprobable**, no ejecuta directo.
- `publish-post` (tras aprobación humana).
Así Loptus es COO operativo *con* datos, manteniendo la barrera humano-en-el-loop de la sección 3.2.

### 8.8 Plan de migración sin romper lo que funciona
1. Crear tablas nuevas **en paralelo** a `lanka_db` (no tocar la fila `main`).
2. Script de backfill: parte `DB` en `projects` + `project_data` por `sucursal_id`/`cliente_id` ya existentes.
3. **Dual-write** temporal: la app escribe a ambos esquemas mientras se valida.
4. Cambiar lecturas al esquema nuevo detrás de un flag por proyecto (migrar Aitama primero, luego Mammut, luego Pololo).
5. Activar Supabase Auth + RLS proyecto por proyecto; retirar contraseñas `btoa`.
6. Apagar dual-write y archivar `lanka_db`.
7. **Mover las 10+ migraciones in-browser (3098-3470) a migraciones SQL versionadas** — el navegador deja de migrar en cada carga (cierra 1.6).

---

## 9. ROADMAP PRIORIZADO

Tabla completa con horas en `artefactos/04-roadmap-fases.md`. Estimaciones reales para **un dev sobre vanilla JS + Supabase, archivo único de 1.1 MB** (el costo de editar un monolito de 15k líneas es real y está incluido).

- **Fase 0 — Quick wins (2 sem, ~50-70 h):** sin integraciones. (1) Hash real de contraseñas + quitar `btoa` de la semilla; (2) validación de captura en Ad Performance (moneda/rango/duplicados); (3) vista CEO de aterrizaje para Socio-Director sobre `renderDirector`; (4) conectar Presupuesto↔Ad Performance para matar la doble captura; (5) "métricas en la tarjeta" como campos manuales en `_buildKanbanCard` (prepara 3.3). **Impacto alto, riesgo bajo.**
- **Fase 1 — Primera integración + base de datos (1-2 meses, ~160-220 h):** el cambio estructural (8.2: partir blob + RLS + Auth) **es prerrequisito** y va aquí; en paralelo, primera API: **Instagram Graph + Meta Ads** (mayor impacto, mata la captura manual del Dashboard y Ad Performance). Tabla `metrics`, Edge Functions de sync, OAuth. **Prerrequisito:** iniciar App Review de Meta el día 1.
  - ✅ Primer corte ya shipeado (2026-06-30): `project_data` por proyecto con dual-write contra `lanka_db`, elimina la colisión **entre** proyectos (Mammut ya no pisa Aitama). Auth/RLS real y el resto de Fase 1 siguen pendientes.
- **Fase 1.5 — Granularidad por ítem dentro de un proyecto (~40-60 h, propuesta 2026-06-30):** `project_data` (Fase 1) sigue siendo **un blob por proyecto** — si dos personas editan el *mismo* proyecto a la vez (ej. dos coordinadores moviendo tarjetas del Kanban de Mammut), sigue ganando el último `upsert` completo. El fix real es bajar de "1 fila = 1 proyecto" a "1 fila = 1 ítem": cada tarjeta de Kanban, producto de catálogo, anuncio, factura, etc. como su propia fila en Supabase (`kanban_cards`, `catalog_items`, `ads`, ...), cada una con su propio `update`/RLS, así dos ediciones simultáneas en *campos o tarjetas distintas* dejan de chocar. Reduce el blast radius de last-write-wins de "todo el proyecto" a "el campo que de verdad se tocó dos veces a la vez". **Prerrequisito:** Fase 1 (este patrón ya existe a nivel proyecto en `project_data`/`project_data_history`; se replica por tabla/ítem).
- **Fase 2 — Motor de insights básico (3-4 meses acumulado, ~120-160 h):** Edge Function `insights-engine` con anomalías + correlación contenido→resultado + "Qué funcionó/cambiamos" automatizado. Suma **Google Business Profile + Search Console** (bajo costo de aprobación, alto valor local). **Prerrequisito:** `metrics` poblada (Fase 1).
- **Fase 3 — Plataforma multi-canal con IA proactiva (6 meses, ~200-280 h):** inbox unificado + publicación cross-platform + alertas de crisis + TikTok + delivery apps (Mammut) + extensión CAOS para que Loptus actúe (8.7) + propuestas estratégicas mensuales. **Prerrequisito:** Fases 1-2 estables.

---

## 10. INDICADORES DE ÉXITO

- **Adopción por rol:** % de Socio-Directores que entran ≥ 1×/semana (meta > 70%); coordinadores que mueven el Kanban ≥ 3×/semana; agencias que suben al DAM sin soporte. Módulos más usados por rol (telemetría simple por evento).
- **Automatización:** **% de datos que entran solos vs. capturados a mano** (KPI estrella; meta: 0 captura manual de KPIs/pauta al cerrar Fase 2). #campos manuales eliminados por sprint. % de reportes mensuales generados por IA con < 2 ediciones humanas.
- **Impacto en el cliente:** mejora de engagement/alcance sostenida tras adoptar recomendaciones de la IA; CPA/CPR ↓ tras optimizaciones de pauta; tiempo de respuesta a DMs/reseñas ↓; órdenes/citas atribuibles a contenido ↑.
- **Salud operativa interna:** time-to-onboard de proyecto nuevo (< 30 min); horas/semana de Paola en captura manual (↓ a ~0); #incidentes de pérdida de datos (→ 0 tras Fase 1).
- **Señales de proyecto en riesgo (→ atención de Paola):** caída de alcance > 20% 2 semanas seguidas; pauta gastando con 0 conversiones 5+ días; calificación Google bajando; coordinador sin mover Kanban > 7 días; Socio-Director sin entrar > 30 días (riesgo de churn del cliente). Cada señal = alerta proactiva de Loptus.

---

## TABLA RESUMEN — TOP MEJORAS POR IMPACTO × FACILIDAD

Detalle y justificación en `artefactos/05-top-mejoras.md`.

| # | Mejora | Impacto | Facilidad | Prioridad | Fase |
|---|---|---|---|---|---|
| 1 | Hash real de contraseñas (quitar `btoa`) | Alto (seguridad) | Alta | 🔴 Crítico | 0 |
| 2 | Vista CEO de aterrizaje para Socio-Director | Alto | Alta | 🔴 | 0 |
| 3 | Validación de captura en Ad Performance | Medio-Alto | Alta | 🔴 | 0 |
| 4 | Conectar Presupuesto ↔ Ad Performance (1 captura) | Medio-Alto | Alta | 🟠 | 0 |
| 5 | Partir blob en filas por proyecto + RLS + Auth | **Muy alto** (aislamiento real, escala, datos) | Media-Baja | 🔴 | 1 |
| 6 | Integración Instagram Graph + Meta Ads (auto-KPIs) | **Muy alto** | Media | 🔴 | 1 |
| 7 | Tabla `metrics` histórica + métricas en la tarjeta del Kanban | Alto (cierra bucle contenido→resultado) | Media | 🟠 | 1-2 |
| 8 | Motor de insights: anomalías + "Qué funcionó/cambiamos" | Alto | Media | 🟠 | 2 |
| 9 | Google Business Profile + Search Console (SEO local) | Alto (spa/restaurante) | Media | 🟠 | 2 |
| 10 | Extensión CAOS para que Loptus actúe sobre datos reales | Alto (apalanca a Paola) | Media | 🟢 | 3 |
| 11 | Inbox unificado + alertas de crisis | Medio-Alto | Baja | 🟢 | 3 |
| 12 | Delivery APIs / CSV para Mammut (restaurante) | Medio (por tipo) | Baja | 🟢 | 3 |

**Orden de ejecución recomendado:** 1→2→3→4 (Fase 0, esta quincena) → **5 antes que 6** (sin aislamiento real, integrar APIs agrava el riesgo) → 7→8→9 → 10→11→12.

---

### Fuentes consultadas
- [Meta — Graph API Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/)
- [Instagram Graph API — Developer Guide 2026 (Elfsight)](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram API Rate Limits 2026 (Phyllo)](https://www.getphyllo.com/post/instagram-api-rate-limits-explained----and-how-to-scale-beyond-them-2026)
- [Supabase — Edge Functions Pricing](https://supabase.com/docs/guides/functions/pricing)
