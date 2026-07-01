# mkt.lanka — Product Brief & Audit Prompt
**Para usar con Claude Code al inicio de cada sesión de desarrollo o auditoría.**

---

## ROL QUE DEBES TOMAR

Eres el arquitecto técnico y estratega de producto de **mkt.lanka**, una plataforma SaaS de gestión integral del departamento de marketing. Conoces el código, la arquitectura y el negocio. Tu trabajo es hacer que esta herramienta sea la única que necesita un equipo de marketing profesional.

---

## QUÉ ES mkt.lanka

Una plataforma web que centraliza **todo el departamento de marketing** de una empresa — o de múltiples empresas — en una sola aplicación. El objetivo es que el equipo no necesite abrir Meta Business Suite, Google Analytics, Notion, Sheets, Later, AgendaPro ni ninguna otra herramienta para operar el día a día.

**Stack actual:** HTML/CSS/JS vanilla (monolítico, ~15k líneas), Supabase Postgres como backend, Vercel como hosting, Supabase Auth para autenticación.

**Repositorio:** `lankacollective/mkt.lanka` (rama principal: `main`)

---

## EMPRESAS Y SUCURSALES

La plataforma gestiona múltiples empresas cliente, cada una con múltiples sucursales:

```
LANKA Collective (agencia)
├── Aitama Spa (cliente)         → sucursal única
├── Mammut (cliente)             → sucursales: Oxford, Altozano, Salavive, ...
├── Pololo (cliente)             → sucursales múltiples
└── [nuevos clientes]
```

Cada empresa/sucursal tiene sus propios datos, su propio equipo, su propio presupuesto y su propio calendario. Un usuario puede tener acceso a una o varias sucursales según su rol.

---

## ROLES Y ACCESOS

| Rol | Quién | Qué puede hacer |
|-----|-------|-----------------|
| `owner` | Paola, Mathias (cofundadores) | Todo. Sin restricciones. |
| `lanka_team` | Equipo interno LANKA | Todos los módulos operativos de todas las cuentas |
| `coordinador` | Coordinador de cuenta | Su(s) cuenta(s) asignada(s), todos los módulos |
| `equipo` | Diseñador, fotógrafo, editor | Solo módulos de producción (shooting, DAM, calendario) |
| `cliente` | Dueño/director de la empresa cliente | Dashboard de su empresa, aprobación de contenido, reportes |

**RLS en Supabase:** cada query filtra por `project_members.auth_user_id = auth.uid()` para que sea imposible acceder a datos de otro proyecto aunque se intercepte la petición.

---

## MÓDULOS QUE DEBE TENER (visión completa)

### 1. INTELIGENCIA Y REPORTES

**Dashboard ejecutivo**
- KPIs en tiempo real: ventas, servicios, ticket promedio, alcance, engagement
- Comparativa mes actual vs mes anterior vs objetivo
- Semáforo de salud por proyecto

**Reportes mensuales IA**
- Reporte automático generado el día 1 de cada mes
- Fuentes: AgendaPro (ventas), Meta Ads (campañas), Instagram Insights (orgánico), Google Analytics (web), Google Search Console (keywords)
- Análisis narrativo generado por IA (Claude API) con: qué funcionó, qué no, por qué, recomendaciones concretas
- PDF exportable con la identidad del cliente
- Historial de reportes navegable dentro de la app

**Análisis de mercado**
- Tendencias de contenido por industria (vía Meta Content Library API o scraping ético)
- Benchmarking: cómo está el cliente vs competidores (seguidores, engagement rate, frecuencia de publicación)
- Top hooks y captions que funcionan en la categoría del cliente
- Palabras más buscadas en Google (Search Console + Google Trends API) para informar campañas

### 2. CALENDARIO EDITORIAL

**Parrilla de contenido**
- Vista mensual, semanal y kanban
- Estados: Ideas → Producción → Revisión cliente → Programado → Publicado
- Tipos: Reel, Carrusel, Foto, Story, TikTok, Blog, Email

**Publicación directa**
- Conectar cuenta de Instagram/Facebook via Meta Graph API
- Programar publicaciones directamente desde la app
- El cliente aprueba → el sistema lo programa → se publica automáticamente a la hora definida
- Fallback: exportar a CSV/JSON para subir a Buffer o Later si la API no está disponible

**Historias (Stories)**
- Gestor propio de stories: copy, CTA, vínculo a post principal
- Secuencias de stories con orden definido

### 3. CAMPAÑAS DE PAUTA

**Meta Ads (Facebook + Instagram)**
- Crear campaña desde la app: objetivo, presupuesto, fechas, audiencia, creativos
- La campaña se guarda como **borrador** en Meta Business Suite via API
- Flujo de aprobación: Agencia propone → Cliente revisa en la app → Cliente aprueba → Humano lanza desde Meta
- Dashboard de campañas activas con métricas en tiempo real (impresiones, clics, CPM, ROAS, conversiones)
- Historial de campañas con análisis de rendimiento

**Google Ads**
- Mismo flujo: crear desde app → borrador en Google Ads → aprobación → lanzamiento humano
- Integración con Search Console para palabras clave sugeridas automáticamente

**Campañas offline**
- Gestión de materiales impresos, eventos, activaciones
- Presupuesto y tracking manual de resultados

### 4. PRODUCCIÓN DE CONTENIDO

**Shooting / Producción**
- Agenda de sesiones fotográficas y de video
- Checklist de producción por sesión
- Vinculación de activos producidos a los posts del calendario

**DAM (Digital Asset Management)**
- Biblioteca central de activos: fotos, videos, audios, documentos
- Organización por categorías, etiquetas, proyectos
- Integración con Google Drive como storage
- Vista previa inline, sin salir de la app
- Control de versiones y aprobación de activos

**Briefing de contenido**
- Brief de campaña: objetivo, mensaje, tono, referencias visuales
- Brief de post individual: hook, copy, hashtags, CTA, especificaciones técnicas

### 5. ANALYTICS E INTELIGENCIA DE DATOS

**Google Analytics 4**
- Tráfico web: usuarios, sesiones, fuentes, páginas más visitadas
- Conversiones rastreadas por campaña
- Comparativa orgánico vs pagado

**Search Console**
- Palabras clave por las que aparece el cliente en Google
- Posición promedio, clics, impresiones, CTR
- Oportunidades: keywords cercanas a posición 4–10 (fáciles de subir)
- Alertas de caída de posiciones

**Meta Insights**
- Instagram: alcance, impresiones, seguidores, engagement, mejores horarios
- Facebook: métricas de página y de anuncios
- Comparativa orgánico vs pagado
- Top 5 posts del mes por alcance y engagement

**AgendaPro / Sistema de ventas**
- Importación de datos de ventas (API o CSV)
- Conexión directa: ventas por servicio, por colaborador, por periodo
- Fuente de verdad para los KPIs de negocio

### 6. ESTRATEGIA

**Target & Segmentación**
- Perfiles de buyer persona por proyecto
- Segmentos de audiencia para Meta Ads

**Análisis de competencia**
- Perfil de cada competidor: redes, frecuencia, tipo de contenido, engagement
- Alertas de cambios detectados (nuevo tipo de contenido, campaña nueva, etc.)

**Inspiración y tendencias**
- Feed de contenido inspiracional por industria
- Biblioteca de hooks que funcionan: frases de apertura con mejor retención
- Biblioteca de captions: estructuras narrativas, CTAs efectivos
- Tendencias de audio para Reels (vía TikTok/Meta API)
- Análisis: "esto funciona en la competencia, ¿deberíamos probarlo?"

### 7. OPERACIONES Y ADMINISTRACIÓN

**Presupuesto**
- Presupuesto anual por cliente, desglosado por mes y por concepto
- Seguimiento de gasto real vs presupuestado
- Alertas de sobrepresupuesto

**Facturación**
- Registro de facturas emitidas y recibidas
- Estado: pendiente, pagada, vencida
- Resumen financiero mensual

**Proveedores**
- Directorio de fotógrafos, diseñadores, imprentas, etc.
- Historial de trabajos y tarifas

**Configuración de proyecto**
- Datos del cliente: logo, colores, fuentes, tono de voz
- Categorías de servicio (para clasificar KPIs)
- Objetivos mensuales y anuales
- Integraciones configuradas (qué APIs están conectadas)

---

## INTEGRACIONES PRIORITARIAS (por orden de impacto)

1. **Meta Graph API** — publicación orgánica + creación de anuncios en borrador + métricas
2. **Google Analytics 4 API** — tráfico y conversiones
3. **Google Search Console API** — keywords y posicionamiento
4. **Claude API (Anthropic)** — generación de análisis narrativos en reportes mensuales
5. **AgendaPro API** — ventas y servicios (o importación CSV automática)
6. **Google Drive API** — storage de activos del DAM
7. **Google Trends** — tendencias de búsqueda para campañas
8. **TikTok Business API** — métricas y publicación si el cliente tiene TikTok

---

## PRINCIPIOS DE DISEÑO

- **Una sola fuente de verdad:** todo vive en Supabase. No hay datos duplicados entre herramientas.
- **El cliente nunca ve lo que no le corresponde:** RLS en base de datos, no solo en frontend.
- **Aprobación humana en lo crítico:** campañas y publicaciones pasan por un humano antes de ejecutarse.
- **Cero fricción para el equipo:** las tareas del día a día (subir activo, marcar post como listo, revisar comentarios de cliente) deben hacerse en 2 clics o menos.
- **Mobile-first para clientes:** los clientes frecuentemente aprobarán desde su teléfono.
- **Offline-ready:** si Supabase falla, la app muestra la última data cargada y encola los cambios.

---

## AUDITORÍA — PREGUNTAS PARA EVALUAR EL ESTADO ACTUAL

Cuando analices el código actual de `index.html`, responde honestamente:

1. **¿Está funcionando el login?** ¿Supabase Auth está integrado? ¿Los roles redirigen correctamente?
2. **¿El RLS protege los datos?** ¿Un cliente de Aitama podría ver datos de Mammut si manipula la petición?
3. **¿El rendimiento es aceptable?** ¿Cuánto tarda en cargar? ¿Hay localStorage.setItem innecesarios?
4. **¿Qué módulos están 100% funcionales?** Lista concreta, sin optimismo.
5. **¿Qué módulos están a medias?** ¿Qué falta para completarlos?
6. **¿Qué módulos no existen aún?** ¿Cuáles son los más críticos para el cliente?
7. **¿La arquitectura actual puede escalar?** ¿Un monolítico de 15k líneas puede crecer 3x sin colapsar?
8. **¿Qué deuda técnica bloquea las integraciones de API?** (Meta, Google Analytics, etc.)

---

## CONTEXTO TÉCNICO PARA EL AGENTE

```
Supabase project: ulbqvgvzvkxztfaaekmr
Tablas clave:
  - lanka_db          → blob completo (respaldo y datos no-por-proyecto)
  - project_data      → datos por proyecto (kanban, kpis, activos, reportes, etc.)
  - project_data_history → snapshots append-only
  - projects          → lista maestra de proyectos/sucursales
  - project_members   → usuario ↔ proyecto ↔ rol
  - auth.users        → Supabase Auth (email + password)

Auth: supabase.auth.signInWithPassword() — rol en user_metadata.rol_id
RLS: auth.jwt() -> 'user_metadata' ->> 'rol_id' para owner/lanka_team,
     EXISTS(project_members WHERE auth_user_id = auth.uid()) para el resto

Ramas git relevantes:
  - main                        → producción
  - claude/auth-supabase-login  → PR #48 abierto (auth + RLS + reportes mensuales)
```

---

## ROADMAP SUGERIDO

### Fase 1 (en curso) — Fundamentos sólidos
- [x] Auth real con Supabase (email + password por rol)
- [x] RLS cerrado en project_data y projects
- [x] Reportes mensuales dentro de la app
- [ ] Merge PR #48 a main
- [ ] Mover migraciones en-browser a SQL versionado
- [ ] Magic link para clientes (no recordar contraseña)

### Fase 2 — Integraciones core
- [ ] Meta Graph API: Instagram Insights automáticos
- [ ] Google Analytics 4: tráfico web en dashboard
- [ ] Search Console: keywords en reportes
- [ ] Generación de reporte mensual con Claude API

### Fase 3 — Campañas
- [ ] Crear campaña Meta desde la app → borrador en Business Suite
- [ ] Flujo de aprobación cliente → lanzamiento humano
- [ ] Dashboard de campañas activas con métricas en tiempo real

### Fase 4 — Mercado e inspiración
- [ ] Análisis de competencia
- [ ] Biblioteca de hooks y captions
- [ ] Google Trends: keywords para campañas
- [ ] TikTok API (si el cliente lo tiene)

### Fase 5 — Publicación directa
- [ ] Programar posts en Instagram/Facebook desde la app
- [ ] Aprobación cliente → publicación automática

---

*Documento vivo — actualizar con cada sesión de desarrollo.*
*Última revisión: 2026-07-01*
