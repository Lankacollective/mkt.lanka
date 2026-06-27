# Artefacto 3 — Fichas técnicas por integración

Principio común: **cada cliente conecta SU cuenta vía OAuth**; el sync corre en Edge Functions; los datos van a `metrics` con `project_id` + `date`. Claves nunca en el navegador.

---

## Ficha A — META (Instagram + Facebook Ads)
- **API / versión:** Graph API **v21.0** (nueva versión cada trimestre — planear upgrades).
- **Permisos / App Review:** `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `ads_read`, `pages_show_list`. Requiere App Review (semanas) y cuenta IG Business/Creator ligada a una Página.
- **Endpoints clave:**
  - Orgánico cuenta: `GET /{ig-user-id}/insights?metric=reach,impressions,follower_count,profile_views`
  - Por publicación: `GET /{ig-media-id}/insights?metric=reach,saved,shares,total_interactions`
  - Audiencia: `GET /{ig-user-id}/insights?metric=audience_gender_age,audience_city`
  - Ads: `GET /act_{ad-account-id}/insights?fields=spend,cpr,ctr,actions,reach&level=campaign`
  - Estado campaña: `GET /{campaign-id}?fields=effective_status`
  - Publicar: `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish`
- **Datos que trae:** alcance, impresiones, engagement, seguidores, stories, reels; gasto, CPR, CTR, conversiones, estado de campaña, audiencias.
- **Rate limit:** ~**200 llamadas/h por cuenta** en insights → batch + caché + servir desde `metrics`.
- **Frecuencia:** orgánico 6 h, pauta 3 h.
- **Se muestra en:** Dashboard (reemplaza captura manual), Ad Performance, métricas en tarjeta del Kanban.
- **Automatiza:** anomalías → alertas; pausar/escalar pauta (propuesta); publicación de aprobados (con confirmación).
- **Riesgo / trade-off:** App Review lento → iniciar el día 1. Versionado trimestral → contrato de tests ante breaking changes.

---

## Ficha B — GOOGLE (4 productos)
- **GA4 Data API v1beta:** `properties.runReport`; métricas `sessions,totalUsers,conversions`, dim. `sessionSourceMedium`. Scope `analytics.readonly`. Cuota por tokens de análisis. Sync diario.
- **Google Ads API:** `GoogleAdsService.SearchStream` (GAQL): campañas, keywords, CPC, Quality Score, conversiones. Requiere **developer token** + OAuth cliente. Sync 6 h.
- **Google Business Profile API:** `accounts.locations.reviews`, `locations` (búsquedas, vistas). Sync 6 h. → SEO local + crisis.
- **Search Console API:** `searchanalytics.query` (query, posición, impresiones, CTR). Sync diario. → posicionamiento orgánico.
- **Se muestra en:** Dashboard (web), nuevo panel SEO local, insights de búsqueda en el calendario.
- **Automatiza:** query con impresiones + posición > 10 → tarea "crear contenido para «X»"; reseña ≤ 2★ → alerta.
- **Trade-off:** 4 consentimientos y cuotas distintas. **Priorizar Business Profile + Search Console** (aprobación barata, alto valor local para spa/restaurante) antes que GA4/Ads.

---

## Ficha C — TIKTOK
- **TikTok Business/Display API:** vistas, engagement, seguidores, alcance por video.
- **TikTok Marketing API:** gasto, CPM, CTR, conversiones.
- **Requisitos:** alta developer + App Review; scopes y disponibilidad **varían por región** (validar México).
- **Frecuencia:** 6 h. **Se muestra en:** Dashboard, Ad Performance.
- **Trade-off:** aprobación más lenta y docs menos estables que Meta. **Prioridad media** salvo cliente TikTok-first.

---

## Ficha D — DELIVERY (Uber Eats / Rappi / DiDi Food) — restaurante
- **Uber Eats:** Marketplace/Integration APIs (órdenes, menú, métricas de tienda), acceso **partner-gated**.
- **Rappi / DiDi:** programas partner; API no totalmente pública.
- **Datos:** órdenes, ticket promedio, calificación, platillos más vendidos.
- **Plan B pragmático:** importación semanal del CSV/reporte del portal, parseado por Edge Function. 80% del valor sin esperar aprobación.
- **Se muestra en:** Dashboard de ventas del proyecto restaurante; se correlaciona con contenido (sección 5).
- **Prioridad:** **alta para Mammut**, baja para wellness/retail.

---

## Ficha E — OTRAS
| Plataforma | Endpoint base | Datos | Prioridad |
|---|---|---|---|
| WhatsApp Business (Cloud API) | webhooks de mensajes | volumen DMs, conversión, tiempo respuesta | **Alta** (cierre cita/reserva) |
| Shopify | webhooks `orders/create` + Admin API | ventas reales | **Alta** si hay ecommerce (Pololo) |
| WooCommerce | REST API / webhooks | ventas | Alta si aplica |
| Mercado Libre | Orders API | ventas marketplace | Media |
| Pinterest | Analytics API | tráfico moda/retail | Baja-media |
| Spotify for Podcasters | API | escuchas | Baja (on-demand) |
