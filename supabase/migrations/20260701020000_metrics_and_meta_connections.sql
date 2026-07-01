-- Tabla de métricas externas (Meta/Instagram, Google Analytics, Search Console)
-- y tabla de conexiones OAuth por proyecto.

-- ── meta_connections ─────────────────────────────────────────────────────────
-- Una fila por cuenta de Meta conectada a un proyecto.
-- access_token se guarda cifrado (Vault en producción; por ahora texto plano en dev).

CREATE TABLE IF NOT EXISTS public.meta_connections (
    id               bigint generated always as identity primary key,
    project_id       text not null references public.projects(id) ON DELETE CASCADE,
    page_id          text not null,                  -- Facebook Page ID
    page_name        text,
    ig_user_id       text,                           -- Instagram Business Account ID
    access_token     text not null,                  -- long-lived user token
    token_expires_at timestamptz,
    scopes           text[] not null default '{}',
    connected_by     uuid references auth.users(id),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    UNIQUE (project_id, page_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Solo owner/lanka_team puede ver y gestionar conexiones OAuth
CREATE POLICY "meta_connections_select" ON public.meta_connections
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = meta_connections.project_id
              AND pm.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "meta_connections_insert" ON public.meta_connections
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    );

CREATE POLICY "meta_connections_update" ON public.meta_connections
    FOR UPDATE TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team'))
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team'));

CREATE POLICY "meta_connections_delete" ON public.meta_connections
    FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team'));

-- ── metrics ───────────────────────────────────────────────────────────────────
-- Una fila por (proyecto, fuente, fecha, tipo de métrica).
-- Permite histórico diario/semanal de cualquier fuente externa.

CREATE TABLE IF NOT EXISTS public.metrics (
    id          bigint generated always as identity primary key,
    project_id  text not null references public.projects(id) ON DELETE CASCADE,
    source      text not null,       -- 'meta_instagram' | 'meta_facebook' | 'google_analytics' | 'google_search_console'
    metric_date date not null,
    metric_type text not null,       -- 'followers' | 'reach' | 'impressions' | 'engagement' | 'profile_views' | 'website_clicks' | 'sessions' | 'clicks' | 'position' ...
    value       numeric not null default 0,
    metadata    jsonb  not null default '{}',  -- datos extra: breakdown por tipo de contenido, etc.
    fetched_at  timestamptz not null default now(),
    created_at  timestamptz not null default now(),
    UNIQUE (project_id, source, metric_date, metric_type)
);

CREATE INDEX IF NOT EXISTS metrics_lookup_idx
    ON public.metrics (project_id, source, metric_date DESC);

CREATE INDEX IF NOT EXISTS metrics_type_idx
    ON public.metrics (project_id, metric_type, metric_date DESC);

ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_select" ON public.metrics
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = metrics.project_id
              AND pm.auth_user_id = auth.uid()
        )
    );

-- Solo Edge Functions (service_role) escriben métricas — no el browser directamente
CREATE POLICY "metrics_insert_service" ON public.metrics
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "metrics_upsert_service" ON public.metrics
    FOR UPDATE TO service_role
    USING (true) WITH CHECK (true);

-- ── Función helper: upsert métrica ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_metric(
    p_project_id  text,
    p_source      text,
    p_date        date,
    p_type        text,
    p_value       numeric,
    p_metadata    jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
    INSERT INTO public.metrics (project_id, source, metric_date, metric_type, value, metadata, fetched_at)
    VALUES (p_project_id, p_source, p_date, p_type, p_value, p_metadata, now())
    ON CONFLICT (project_id, source, metric_date, metric_type)
    DO UPDATE SET
        value      = EXCLUDED.value,
        metadata   = EXCLUDED.metadata,
        fetched_at = now();
$$;
