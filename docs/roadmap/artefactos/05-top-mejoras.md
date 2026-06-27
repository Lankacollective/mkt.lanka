# Artefacto 5 — Top mejoras ordenadas por impacto × facilidad

Score = Impacto (1-5) × Facilidad (1-5). Mayor score arriba. "Facilidad" baja = más esfuerzo.

| # | Mejora | Impacto | Facilidad | Score | Fase | Por qué |
|---|---|---|---|---|---|---|
| 1 | Hash real de contraseñas (quitar `btoa`) | 5 | 5 | **25** | 0 | Hoy `atob()` revela toda credencial; arreglo de horas |
| 2 | Vista CEO de aterrizaje (Socio-Director) | 5 | 4 | **20** | 0 | El cliente que paga no encuentra valor → retención |
| 3 | Validación de captura en Ad Performance | 4 | 5 | **20** | 0 | Mata el error de moneda/duplicado que hace mentir al semáforo |
| 4 | Conectar Presupuesto ↔ Ad Performance | 4 | 4 | **16** | 0 | Elimina doble captura e inconsistencia P/R/C |
| 5 | Integración Instagram + Meta Ads (auto-KPIs) | 5 | 3 | **15** | 1 | Elimina la captura manual de mayor volumen |
| 6 | Partir blob + RLS + Auth | 5 | 2 | **10** | 1 | Aislamiento real, escala y seguridad; base de todo lo demás |
| 7 | Tabla `metrics` + métricas en la tarjeta del Kanban | 4 | 3 | **12** | 1-2 | Cierra el bucle contenido→resultado (hoy roto) |
| 8 | Google Business Profile + Search Console (SEO local) | 4 | 3 | **12** | 2 | Altísimo valor para spa/restaurante locales, aprobación barata |
| 9 | Motor de insights (anomalías + "Qué funcionó") | 4 | 3 | **12** | 2 | Convierte datos en decisiones; automatiza el Reporte Mensual |
| 10 | Extensión CAOS (Loptus actúa sobre datos reales) | 4 | 3 | **12** | 3 | Apalanca a Paola como COO con datos, no solo tareas |
| 11 | Inbox unificado + alertas de crisis | 4 | 2 | **8** | 3 | Escucha y reputación centralizada |
| 12 | Delivery API/CSV (Mammut) | 3 | 2 | **6** | 3 | Alto para restaurante, nulo para otros tipos |

## Nota de secuenciación (no es solo el score)
El score puro pondría #6 (partir blob) abajo por su esfuerzo. **Pero es prerrequisito de #5, #7, #8, #9.** Regla: ejecutar Fase 0 por score (1→2→3→4), y dentro de Fase 1 hacer **#6 antes que #5** — integrar APIs sobre un blob que ya filtra datos solo agrega más información sensible a un contenedor inseguro. La seguridad y el aislamiento van primero por riesgo, no por score.
