/**
 * meta-oauth — Edge Function
 *
 * Maneja el flujo OAuth de Meta (Facebook/Instagram).
 *
 * POST /meta-oauth/exchange
 *   body: { code: string, project_id: string, redirect_uri: string }
 *   → Intercambia el code por un short-lived token, lo extiende a long-lived,
 *     obtiene las páginas y cuentas de Instagram del usuario, guarda en meta_connections.
 *
 * POST /meta-oauth/disconnect
 *   body: { project_id: string, page_id: string }
 *   → Elimina la conexión (no revoca el token en Meta — el usuario debe hacerlo manualmente).
 *
 * GET /meta-oauth/status?project_id=xxx
 *   → Retorna las conexiones activas para el proyecto.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const META_APP_ID     = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const url  = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Verificar JWT del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verificar que el usuario es owner o lanka_team
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) return json({ error: 'Token inválido' }, 401);

    const rolId = (user.user_metadata?.rol_id || '') as string;
    if (!['owner', 'lanka_team'].includes(rolId)) {
        return json({ error: 'Solo owner o lanka_team puede gestionar conexiones Meta' }, 403);
    }

    // ── GET /status ───────────────────────────────────────────────────────────
    if (req.method === 'GET') {
        const projectId = url.searchParams.get('project_id');
        if (!projectId) return json({ error: 'project_id requerido' }, 400);

        const { data, error } = await supabase
            .from('meta_connections')
            .select('id, page_id, page_name, ig_user_id, scopes, token_expires_at, updated_at')
            .eq('project_id', projectId);

        if (error) return json({ error: error.message }, 500);
        return json({ connections: data });
    }

    const body = await req.json().catch(() => ({}));

    // ── POST /exchange ────────────────────────────────────────────────────────
    if (path === 'exchange') {
        const { code, project_id, redirect_uri } = body;
        if (!code || !project_id || !redirect_uri) {
            return json({ error: 'code, project_id y redirect_uri son requeridos' }, 400);
        }

        // 1. Short-lived token
        const shortRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
            `client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}` +
            `&client_secret=${META_APP_SECRET}&code=${code}`
        );
        const short = await shortRes.json();
        if (short.error) return json({ error: short.error.message }, 400);

        // 2. Long-lived token (60 días)
        const longRes = await fetch(
            `https://graph.facebook.com/v20.0/oauth/access_token?` +
            `grant_type=fb_exchange_token&client_id=${META_APP_ID}` +
            `&client_secret=${META_APP_SECRET}&fb_exchange_token=${short.access_token}`
        );
        const long = await longRes.json();
        if (long.error) return json({ error: long.error.message }, 400);

        const longToken = long.access_token;
        const expiresAt = long.expires_in
            ? new Date(Date.now() + long.expires_in * 1000).toISOString()
            : null;

        // 3. Listar páginas del usuario
        const pagesRes = await fetch(
            `https://graph.facebook.com/v20.0/me/accounts?access_token=${longToken}&fields=id,name,access_token,instagram_business_account`
        );
        const pagesData = await pagesRes.json();
        if (pagesData.error) return json({ error: pagesData.error.message }, 400);

        const pages = pagesData.data || [];
        const saved: unknown[] = [];

        for (const page of pages) {
            const igId = page.instagram_business_account?.id || null;

            const { error: upsertErr } = await supabase
                .from('meta_connections')
                .upsert({
                    project_id,
                    page_id:          page.id,
                    page_name:        page.name,
                    ig_user_id:       igId,
                    access_token:     page.access_token || longToken, // Page token es mejor para Graph API
                    token_expires_at: expiresAt,
                    scopes:           short.scopes?.split(',') || [],
                    connected_by:     user.id,
                    updated_at:       new Date().toISOString(),
                }, { onConflict: 'project_id,page_id' });

            if (upsertErr) {
                console.error('Error guardando conexión Meta:', upsertErr.message);
                continue;
            }
            saved.push({ page_id: page.id, page_name: page.name, ig_user_id: igId });
        }

        return json({ ok: true, connected: saved, expires_at: expiresAt });
    }

    // ── POST /disconnect ──────────────────────────────────────────────────────
    if (path === 'disconnect') {
        const { project_id, page_id } = body;
        if (!project_id || !page_id) return json({ error: 'project_id y page_id requeridos' }, 400);

        const { error } = await supabase
            .from('meta_connections')
            .delete()
            .eq('project_id', project_id)
            .eq('page_id', page_id);

        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
    }

    return json({ error: 'Ruta no encontrada' }, 404);
});

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
