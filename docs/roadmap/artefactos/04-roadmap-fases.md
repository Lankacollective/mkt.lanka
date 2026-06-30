# Artefacto 4 — Roadmap priorizado por fases

Estimaciones reales para **1 dev sobre vanilla JS + Supabase, archivo único de 1.1 MB / 15k líneas**. El sobrecosto de editar un monolito sin framework (buscar, no romper, sin tipado) está incluido.

## Fase 0 — Quick wins (2 semanas · ~50-70 h · sin integraciones)
| Feature | Horas | Impacto | Prerrequisito |
|---|---|---|---|
| Hash real de contraseñas + quitar `btoa` de la semilla y login | 8-12 | Alto (seguridad) | — |
| Validación de captura en Ad Performance (moneda, rango, duplicado de día) | 8-10 | Medio-Alto | — |
| Vista CEO de aterrizaje para Socio-Director (sobre `renderDirector`) | 16-20 | Alto | — |
| Conectar Presupuesto ↔ Ad Performance (gasto una sola vez) | 10-14 | Medio-Alto | — |
| Campos de métricas manuales en la tarjeta del Kanban (`_buildKanbanCard`) | 8-12 | Medio (prepara bucle) | — |

## Fase 1 — Base de datos real + primera API (1-2 meses · ~160-220 h)
| Feature | Horas | Impacto | Prerrequisito |
|---|---|---|---|
| Partir blob: `projects`/`project_data`/`project_members` + backfill + dual-write | 50-70 | **Muy alto** | — |
| Supabase Auth (magic link) + RLS por proyecto/rol; retirar contraseñas | 30-40 | **Muy alto** (aislamiento real) | tablas nuevas |
| Mover migraciones in-browser (3098-3470) a SQL versionadas | 12-18 | Medio (arranque) | tablas nuevas |
| OAuth Instagram/Meta + Edge Functions de sync + tabla `metrics` | 40-55 | **Muy alto** (auto-KPIs) | App Review iniciada día 1 |
| Dashboard y Ad Performance leyendo de `metrics` | 20-30 | Alto | metrics poblada |

## Fase 2 — Motor de insights básico (acumulado 3-4 meses · ~120-160 h)
| Feature | Horas | Impacto | Prerrequisito |
|---|---|---|---|
| `insights-engine`: anomalías (>20%, z-score) | 30-40 | Alto | metrics |
| Correlación contenido→resultado (media_id ↔ métricas/ventas) | 25-35 | Alto | Fase 1 + tarjeta con media_id |
| "Qué funcionó / Qué cambiamos" automatizado → Reporte Mensual | 20-28 | Alto | insights |
| Google Business Profile + Search Console (SEO local) | 35-50 | Alto (spa/restaurante) | OAuth Google |

## Fase 3 — Multi-canal + IA proactiva (6 meses · ~200-280 h)
| Feature | Horas | Impacto | Prerrequisito |
|---|---|---|---|
| Inbox unificado (IG/FB/TikTok/Google + WhatsApp) + `interactions` | 50-70 | Medio-Alto | webhooks |
| Publicación cross-platform + adaptación de formato | 40-55 | Medio-Alto | OAuth multi |
| Alertas de crisis (sentimiento, caída calificación) | 20-28 | Alto | inbox |
| TikTok + Delivery (Mammut) | 35-50 | Medio (por tipo) | aprobaciones |
| Extensión CAOS: `get-metrics`/`propose-action`/`publish-post` | 30-40 | Alto (apalanca Paola) | metrics/insights |
| Propuesta estratégica mensual aprobable | 20-30 | Alto | insights |

**Total estimado a 6 meses:** ~530-730 h de desarrollo (1 dev ≈ 4-6 meses a tiempo completo, o por hitos con apoyo de Loptus en backfill/scripts).
