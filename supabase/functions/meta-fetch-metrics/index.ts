/**
 * meta-fetch-metrics — Edge Function
 *
 * Obtiene métricas de Instagram Business via Meta Graph API y las guarda
 * en la tabla `metrics`. Se puede llamar manualmente desde la app o
 * programar via pg_cron (diariamente).
 *
 * POST /meta-fetch-metrics
 *   body: {
 *     project_id: string,
 *     since?: string,   // YYYY-MM-DD, default: ayer
 *     until?: string,   // YYYY-MM-DD, default: hoy
 *   }
 *
 * Métricas que extrae:
 *   - followers_count      (snapshot diario)
 *   - reach                (diario, por tipo de contenido si disponible)
 *   - impressions          (diario)
 *   - profile_views        (diario)
 *   - website_clicks       (diario)
 *   - accounts_engaged     (diario)
 *   Por cada post publicado en el periodo:
 *   - post.reach, post.impressions, post.likes, post.comments, post.saved, post.shares
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IG_METRICS_DAILY = [
    'reach', 'impressions', 'profile_views',
    'website_clicks', 'accounts_engaged', 'follows_and_unfollows',
];

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return json({ error: 'Token inválido' }, 401);

    const body = await req.json().catch(() => ({}));
    const { project_id, since, until } = body as {
        project_id?: string; since?: string; until?: string;
    };

    if (!project_id) return json({ error: 'project_id requerido' }, 400);

    // Fechas
    const today    = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const sinceDate = since  || yesterday.toISOString().split('T')[0];
    const untilDate = until  || today.toISOString().split('T')[0];
    const sinceTs   = Math.floor(new Date(sinceDate).getTime() / 1000);
    const untilTs   = Math.floor(new Date(untilDate + 'T23:59:59').getTime() / 1000);

    // Obtener conexiones del proyecto
    const { data: connections, error: connErr } = await supabase
        .from('meta_connections')
        .select('ig_user_id, access_token, page_id, page_name')
        .eq('project_id', project_id)
        .not('ig_user_id', 'is', null);

    if (connErr) return json({ error: connErr.message }, 500);
    if (!connections || connections.length === 0) {
        return json({ error: 'No hay cuenta de Instagram conectada para este proyecto' }, 404);
    }

    const conn = connections[0];
    const igId = conn.ig_user_id;
    const token = conn.access_token;
    const results: Record<string, unknown> = { project_id, ig_user_id: igId, fetched: [] as unknown[] };

    // ── 1. Followers count (snapshot) ────────────────────────────────────────
    const follRes = await graphFetch(
        `/${igId}?fields=followers_count,media_count&access_token=${token}`
    );
    if (!follRes.error) {
        await upsert(supabase, project_id, 'meta_instagram', sinceDate, 'followers_count', follRes.followers_count || 0);
        await upsert(supabase, project_id, 'meta_instagram', sinceDate, 'media_count', follRes.media_count || 0);
        (results.fetched as unknown[]).push('followers_count');
    }

    // ── 2. Métricas diarias de cuenta ─────────────────────────────────────────
    const insRes = await graphFetch(
        `/${igId}/insights?metric=${IG_METRICS_DAILY.join(',')}&period=day` +
        `&since=${sinceTs}&until=${untilTs}&access_token=${token}`
    );
    if (!insRes.error && insRes.data) {
        for (const metricObj of insRes.data) {
            const metricName: string = metricObj.name;
            for (const point of (metricObj.values || [])) {
                const dateStr = point.end_time?.split('T')[0] || sinceDate;
                await upsert(supabase, project_id, 'meta_instagram', dateStr, metricName, Number(point.value) || 0);
            }
        }
        (results.fetched as unknown[]).push('account_insights');
    } else if (insRes.error) {
        (results as Record<string, unknown>).insights_error = insRes.error.message;
    }

    // ── 3. Posts publicados en el periodo ────────────────────────────────────
    const mediaRes = await graphFetch(
        `/${igId}/media?fields=id,timestamp,media_type,permalink&` +
        `access_token=${token}&limit=50`
    );
    if (!mediaRes.error && mediaRes.data) {
        const postsInRange = (mediaRes.data as {timestamp:string, id:string, media_type:string, permalink:string}[])
            .filter(p => {
                const d = p.timestamp?.split('T')[0];
                return d >= sinceDate && d <= untilDate;
            });

        for (const post of postsInRange) {
            const postDate = post.timestamp.split('T')[0];
            const insightRes = await graphFetch(
                `/${post.id}/insights?metric=reach,impressions,likes,comments,saved,shares` +
                `&access_token=${token}`
            );
            if (!insightRes.error && insightRes.data) {
                for (const m of insightRes.data) {
                    await upsert(
                        supabase, project_id, 'meta_instagram', postDate,
                        `post_${m.name}`,
                        Number(m.values?.[0]?.value) || 0,
                        { post_id: post.id, media_type: post.media_type, permalink: post.permalink }
                    );
                }
            }
        }
        (results.fetched as unknown[]).push(`posts (${postsInRange.length})`);
    }

    // ── 4. Actualizar token si está cerca de expirar ──────────────────────────
    const { data: connFull } = await supabase
        .from('meta_connections')
        .select('token_expires_at')
        .eq('project_id', project_id)
        .eq('ig_user_id', igId)
        .single();

    if (connFull?.token_expires_at) {
        const daysLeft = (new Date(connFull.token_expires_at).getTime() - Date.now()) / 86400000;
        results.token_days_remaining = Math.round(daysLeft);
        if (daysLeft < 7) results.token_warning = 'Token expira en menos de 7 días — reconecta desde Configuración';
    }

    return json({ ok: true, ...results });
});

async function graphFetch(path: string) {
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0${path}`);
        return await res.json();
    } catch (e) {
        return { error: { message: String(e) } };
    }
}

async function upsert(
    supabase: ReturnType<typeof createClient>,
    project_id: string,
    source: string,
    date: string,
    metric_type: string,
    value: number,
    metadata: Record<string, unknown> = {}
) {
    await supabase.rpc('upsert_metric', {
        p_project_id: project_id,
        p_source:     source,
        p_date:       date,
        p_type:       metric_type,
        p_value:      value,
        p_metadata:   metadata,
    });
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
