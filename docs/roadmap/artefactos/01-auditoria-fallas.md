# Artefacto 1 — Tabla de auditoría de fallas y fricciones

Cada falla nombra el módulo/función exactos y, donde aplica, la línea en `index.html`.

| # | Falla / fricción | Módulo / función | Evidencia en código | Severidad | Impacto | Solución (fase) |
|---|---|---|---|---|---|---|
| F1 | Aislamiento entre proyectos es **cosmético**: cada navegador descarga el blob completo de todos los clientes | Arquitectura datos / suscripción realtime | `index.html:3080-3094`, `3671` (`upsert id:'main', data:DB`) | 🔴 Crítica | Fuga de finanzas/contraseñas entre clientes y a agencias externas | Partir blob + RLS + Auth (Fase 1) |
| F2 | Contraseñas en **base64** (`btoa`), no hash | Usuarios & Roles / semilla | `index.html:2719, 2723, 3023, 3099-3102` | 🔴 Crítica | `atob()` revela todas las credenciales | Hash real (Fase 0) |
| F3 | **Last-write-wins** sobre fila única: una sesión pisa el DB de otro proyecto | `guardarBD()` | `index.html:3650-3695`; heurística `_supabaseVerificado`/`_hadLocalData` 3643-3664 | 🔴 Crítica | Pérdida de datos entre usuarios concurrentes | Filas por proyecto + write por módulo (Fase 1) |
| F4 | Captura **manual** de KPIs orgánicos (alcance, engagement, seguidores) | Dashboard | (sin fuente externa) | 🟠 Alta | Error humano, datos tarde/incompletos | Instagram Graph API (Fase 1) |
| F5 | Captura **manual** de pauta (gasto, CPR, CTR, conv.) sin validación de moneda/rango | Ad Performance | flag `_monedaMigrated` ~3423 | 🟠 Alta | MXN/USD confundido, gasto acumulado vs. diario, días faltantes | Validación (Fase 0) → Meta/Google Ads API (Fase 1) |
| F6 | **Doble captura** del gasto de medios (Ad Performance y Presupuesto divergen) | Ad Performance ↔ Presupuesto & Facturas | módulos desconectados | 🟠 Alta | Inconsistencia P/R/C | Conectar módulos (Fase 0) |
| F7 | Bucle **contenido→resultado roto**: el post publicado nunca devuelve métricas a su tarjeta | Calendario/Kanban `_buildKanbanCard` ↔ Dashboard | sin `media_id` en la tarjeta | 🟠 Alta | Imposible saber "qué post funcionó" | Métricas en tarjeta (Fase 1-2) |
| F8 | **Sin historial** de métricas: `lanka_db` guarda solo estado actual | Dashboard "semana a semana" | fila única sin tabla de series | 🟠 Alta | "Semana pasada" se pierde si alguien sobrescribe | Tabla `metrics` append-only (Fase 1) |
| F9 | **10+ migraciones in-browser** corren en cada carga | bloque migraciones | `index.html:3098-3470` (`_s3migrated`…`_monedaMigrated`) | 🟡 Media | Arranque cada vez más lento; fallo deja blob inconsistente | Migraciones SQL versionadas (Fase 1) |
| F10 | Socio-Director (no técnico) aterriza en app **operativa**, no en vista de decisión | Modo Director / navegación | `renderDirector` coexiste con 16 módulos | 🟠 Alta | Cliente no encuentra valor → churn | Vista CEO de aterrizaje (Fase 0) |
| F11 | Agencia externa **descarga todo** y ve de más | Control de Accesos (módulo 13) | filtro de render, no de datos (ver F1) | 🔴 Crítica | Confidencialidad rota | RLS por rol (Fase 1) |
| F12 | Cambios de estado del Kanban **no disparan nada** aguas abajo | Calendario ↔ CAOS / métricas | sin automatización | 🟡 Media | Trabajo manual de seguimiento | Triggers (Fase 2-3) |
| F13 | Brand Kit / Briefing son **fichas estáticas** sin alimentar generación de contenido | Brand Kit / Briefing | módulos aislados | 🟡 Media | Conocimiento de marca no se apalanca | IA copy/hashtags (Fase 2-3) |
| F14 | Shooting ↔ DAM ↔ Calendario sin **trazabilidad** sesión→posts | Shooting / DAM / Calendario | islas | 🟡 Media | No se mide ROI de producción | Vincular entidades (Fase 2-3) |
| F15 | **Payload crece lineal** con #proyectos; cada save sube todo, cada sync re-renderiza todo | guardarBD / renderTodas | `3671`, `3089` | 🟠 Alta | Inviable a 50 proyectos | Write/read por proyecto (Fase 1) |
| F16 | Targets definidos vs. audiencia real **nunca se comparan** | Estrategia/Target (módulo 9) | sin datos de audiencia | 🟡 Media | Pauta apuntando al público equivocado | Insights de audiencia (Fase 2) |
| F17 | `localStorage` puede re-emitir blob **obsoleto** | inicializarDB | `index.html:3700-3707` | 🟡 Media | Datos viejos sobrescriben nuevos | Versionado/RLS (Fase 1) |
