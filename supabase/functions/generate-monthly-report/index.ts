/**
 * generate-monthly-report — Edge Function
 *
 * Genera un reporte mensual completo usando Claude AI.
 * Lee kpi_semanal, métricas de Instagram y contexto del proyecto,
 * produce análisis narrativo y lo guarda en project_data.reportes_mensuales.
 *
 * POST /generate-monthly-report
 *   body: { project_id: string, period?: string }  // period = 'YYYY-MM', default: mes anterior
 *
 * También se llama vía pg_cron el día 1 de cada mes con service_role.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return json({ ok: true }, 200);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Auth: JWT de usuario O service_role (desde pg_cron)
    const authHeader = req.headers.get('Authorization') || '';
    const isServiceRole = authHeader.includes(SUPABASE_SERVICE_KEY);

    if (!isServiceRole) {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(jwt);
        if (error || !user) return json({ error: 'No autorizado' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { project_id, period } = body as { project_id?: string; period?: string };

    // Si es pg_cron sin project_id → genera para todos los proyectos activos
    if (!project_id && isServiceRole) {
        const { data: projects } = await supabase.from('projects').select('id');
        const results: Record<string, unknown>[] = [];
        for (const p of (projects || [])) {
            try {
                const r = await generateReport(supabase, p.id, period);
                results.push({ project_id: p.id, ...r });
            } catch (e) {
                results.push({ project_id: p.id, error: String(e) });
            }
        }
        return json({ ok: true, results });
    }

    if (!project_id) return json({ error: 'project_id requerido' }, 400);

    try {
        const result = await generateReport(supabase, project_id, period);
        return json({ ok: true, project_id, ...result });
    } catch (e) {
        return json({ error: String(e) }, 500);
    }
});

async function generateReport(
    supabase: ReturnType<typeof createClient>,
    projectId: string,
    periodOverride?: string
) {
    // ── Calcular periodo (mes anterior por defecto) ─────────────────────────
    const now = new Date();
    const targetDate = periodOverride
        ? new Date(periodOverride + '-01')
        : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year  = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1; // 1-12
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const reportId = `rep_${projectId}_${period.replace('-', '')}`;

    // ── 1. Datos del proyecto (projects table) ──────────────────────────────
    const { data: proj } = await supabase
        .from('projects')
        .select('nombre, tipo, categorias_servicio')
        .eq('id', projectId)
        .single();

    // ── 2. Datos de project_data (kpi_semanal, briefing, kpi_metas, historico, reportes) ──
    const { data: pd } = await supabase
        .from('project_data')
        .select('data')
        .eq('project_id', projectId)
        .single();

    const data = pd?.data || {};
    const kpiSemanal: KpiSemana[] = (data.kpi_semanal || []).filter((s: KpiSemana) => {
        if (!s.fecha) return false;
        const [y, m] = s.fecha.split('-').map(Number);
        return y === year && m === month;
    });
    const briefing    = data.briefing || {};
    const kpiMetas    = data.kpi_metas || {};
    const histMensual = data.historico_mensual || [];
    const prevReportes: ReporteMensual[] = data.reportes_mensuales || [];

    // ── 3. Métricas de Instagram (tabla metrics) ────────────────────────────
    const sinceDate = `${period}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const untilDate = `${period}-${String(lastDay).padStart(2, '0')}`;

    const { data: igMetrics } = await supabase
        .from('metrics')
        .select('metric_date, metric_type, value')
        .eq('project_id', projectId)
        .eq('source', 'meta_instagram')
        .gte('metric_date', sinceDate)
        .lte('metric_date', untilDate);

    // Agregar métricas de Instagram por tipo
    const igAgg: Record<string, number> = {};
    for (const m of (igMetrics || [])) {
        igAgg[m.metric_type] = (igAgg[m.metric_type] || 0) + Number(m.value);
    }
    const followersEnd = igMetrics?.filter(m => m.metric_type === 'followers_count')
        .sort((a, b) => b.metric_date.localeCompare(a.metric_date))[0]?.value || null;

    // ── 4. Calcular totales del mes desde kpi_semanal ───────────────────────
    const totalVentas = kpiSemanal.reduce((s, k) => s + (k.ventas || 0), 0);
    const totalDMs    = kpiSemanal.reduce((s, k) => s + (k.dms || 0), 0);
    const totalCitasDM= kpiSemanal.reduce((s, k) => s + (k.citas_desde_dm || 0), 0);
    const clientesNuevos    = kpiSemanal.reduce((s, k) => s + (k.clientes_nuevos || 0), 0);
    const clientesRecurr    = kpiSemanal.reduce((s, k) => s + (k.clientes_recurrentes || 0), 0);
    const clientesRecup     = kpiSemanal.reduce((s, k) => s + (k.clientes_recuperados || 0), 0);
    const ticketMedio       = kpiSemanal.length ? Math.round(kpiSemanal.reduce((s,k)=>s+(k.ticket_medio||0),0)/kpiSemanal.length) : 0;
    const seguidoresInicio  = kpiSemanal[0]?.seguidores_ini || 0;
    const seguidoresFin     = kpiSemanal[kpiSemanal.length-1]?.seguidores_fin || 0;

    // Mes anterior para comparativo
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const prevMesNombre = MESES[prevMonth - 1];
    const prevHist = histMensual[prevMonth - 1];
    const ventasMesAnterior = prevHist?.ventas || 0;

    // Objetivo del mes desde kpi_metas
    const metaKey = `ventas_${MESES[month-1].toLowerCase()}`;
    const ventasObjetivo = kpiMetas[metaKey] || kpiMetas['ventas_mensual'] || 0;

    // Reporte del mes anterior para contexto
    const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const reporteMesAnt = prevReportes.find(r => r.periodo === prevPeriod);

    // Si ya existe reporte para este periodo, solo actualizar si los datos cambiaron
    const existingReport = prevReportes.find(r => r.periodo === period);
    if (existingReport?.generado_por_ia && totalVentas === 0 && kpiSemanal.length === 0) {
        return { period, skipped: true, reason: 'Sin datos de KPI para el periodo' };
    }

    // ── 5. Llamar a Claude para el análisis ────────────────────────────────
    const analisis = await callClaude({
        projectName:    proj?.nombre || projectId,
        projectType:    proj?.tipo || 'otro',
        categorias:     proj?.categorias_servicio || [],
        period:         `${MESES[month-1]} ${year}`,
        briefingTono:   briefing.tono_ejemplos || [],
        briefingReglas: briefing.reglas || [],
        kpiSemanal,
        totalVentas,
        ventasObjetivo,
        ventasMesAnterior,
        totalDMs,
        totalCitasDM,
        clientesNuevos,
        clientesRecurr,
        clientesRecup,
        ticketMedio,
        seguidoresInicio,
        seguidoresFin: followersEnd ? Number(followersEnd) : seguidoresFin,
        igMetrics: igAgg,
        prevMesNombre,
        reporteMesAnt: reporteMesAnt ? {
            ventas: reporteMesAnt.ventas_total,
            analisis: reporteMesAnt.analisis_ejecutivo?.slice(0, 400),
        } : null,
    });

    // ── 6. Construir objeto reporte ────────────────────────────────────────
    const periodos = kpiSemanal.map(k => ({
        nombre: k.semana || `Semana`,
        total:  k.ventas || 0,
        pct:    totalVentas ? Math.round((k.ventas || 0) / totalVentas * 100) : 0,
    }));

    const reporte: ReporteMensual = {
        id:                   reportId,
        mes:                  `${MESES[month-1]} ${year}`,
        periodo:              period,
        fecha_cierre:         untilDate,
        ventas_total:         totalVentas,
        ventas_objetivo:      ventasObjetivo || null,
        ventas_mes_anterior:  ventasMesAnterior || null,
        analisis_ejecutivo:   analisis.analisis,
        recomendaciones:      analisis.recomendaciones,
        fortalezas:           analisis.fortalezas,
        areas_mejora:         analisis.areas_mejora,
        periodos,
        servicios:            [],
        generado_por_ia:      true,
        ia_modelo:            'claude-haiku-4-5-20251001',
        generado_en:          new Date().toISOString(),
        kpis_adicionales: {
            clientes_nuevos:    clientesNuevos,
            clientes_recurrentes: clientesRecurr,
            ticket_medio:       ticketMedio,
            dms_totales:        totalDMs,
            citas_desde_dm:     totalCitasDM,
            seguidores_inicio:  seguidoresInicio,
            seguidores_fin:     followersEnd ? Number(followersEnd) : seguidoresFin,
            ig_reach:           igAgg['reach'] || 0,
            ig_impressions:     igAgg['impressions'] || 0,
        },
    };

    // ── 7. Upsert en project_data.reportes_mensuales ────────────────────────
    const existingIdx = (data.reportes_mensuales || []).findIndex((r: ReporteMensual) => r.periodo === period);
    let nuevosReportes: ReporteMensual[] = [...(data.reportes_mensuales || [])];
    if (existingIdx >= 0) {
        nuevosReportes[existingIdx] = reporte;
    } else {
        nuevosReportes.push(reporte);
    }

    const newData = { ...data, reportes_mensuales: nuevosReportes };
    const { error: upsertErr } = await supabase
        .from('project_data')
        .upsert({
            project_id:  projectId,
            data:        newData,
            updated_at:  new Date().toISOString(),
            updated_by:  'generate-monthly-report',
        }, { onConflict: 'project_id' });

    if (upsertErr) throw new Error(`Error guardando reporte: ${upsertErr.message}`);

    return {
        period,
        mes:     reporte.mes,
        ventas:  totalVentas,
        created: existingIdx < 0,
    };
}

// ── Claude API ─────────────────────────────────────────────────────────────

interface AnalisisResult {
    analisis:        string;
    fortalezas:      string[];
    areas_mejora:    string[];
    recomendaciones: string[];
}

async function callClaude(ctx: {
    projectName: string;
    projectType: string;
    categorias: string[];
    period: string;
    briefingTono: string[];
    briefingReglas: string[];
    kpiSemanal: KpiSemana[];
    totalVentas: number;
    ventasObjetivo: number;
    ventasMesAnterior: number;
    totalDMs: number;
    totalCitasDM: number;
    clientesNuevos: number;
    clientesRecurr: number;
    clientesRecup: number;
    ticketMedio: number;
    seguidoresInicio: number;
    seguidoresFin: number;
    igMetrics: Record<string, number>;
    prevMesNombre: string;
    reporteMesAnt: { ventas: number; analisis: string } | null;
}): Promise<AnalisisResult> {
    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const pct = (a: number, b: number) => b > 0 ? `${((a/b-1)*100).toFixed(1)}%` : '—';

    const kpiLineas = ctx.kpiSemanal.map(k =>
        `  • ${k.semana}: ${fmt(k.ventas||0)} ventas | ${k.clientes_nuevos||0} clientes nuevos | ${k.dms||0} DMs | ${k.clientes_recurrentes||0} recurrentes`
    ).join('\n');

    const igLineas = Object.entries(ctx.igMetrics)
        .filter(([k]) => !k.startsWith('post_') && k !== 'followers_count')
        .map(([k, v]) => `  • ${k}: ${v.toLocaleString()}`)
        .join('\n');

    const prompt = `Eres el director de marketing de ${ctx.projectName}, un negocio de ${ctx.projectType}${ctx.categorias.length ? ` (servicios: ${ctx.categorias.join(', ')})` : ''}.

Genera el reporte mensual de ${ctx.period} basándote en los siguientes datos reales:

## KPIs del mes
- Ventas totales: ${fmt(ctx.totalVentas)}
- Objetivo: ${ctx.ventasObjetivo ? fmt(ctx.ventasObjetivo) + ` (${pct(ctx.totalVentas, ctx.ventasObjetivo)} vs objetivo)` : 'no definido'}
- Mes anterior (${ctx.prevMesNombre}): ${ctx.ventasMesAnterior ? fmt(ctx.ventasMesAnterior) + ` (${pct(ctx.totalVentas, ctx.ventasMesAnterior)} variación)` : 'sin dato'}
- Clientes nuevos: ${ctx.clientesNuevos}
- Clientes recurrentes: ${ctx.clientesRecurr}
- Clientes recuperados: ${ctx.clientesRecup}
- Ticket promedio: ${fmt(ctx.ticketMedio)}
- DMs recibidos: ${ctx.totalDMs}
- Citas agendadas desde DM: ${ctx.totalCitasDM} (conversión: ${ctx.totalDMs > 0 ? ((ctx.totalCitasDM/ctx.totalDMs)*100).toFixed(1) : 0}%)
- Seguidores: ${ctx.seguidoresInicio.toLocaleString()} → ${ctx.seguidoresFin.toLocaleString()} (${ctx.seguidoresFin > ctx.seguidoresInicio ? '+' : ''}${(ctx.seguidoresFin - ctx.seguidoresInicio).toLocaleString()})

## Desglose semanal
${kpiLineas || '  (sin datos semanales)'}

## Instagram Business (si disponible)
${igLineas || '  (sin métricas de Instagram conectadas)'}

${ctx.reporteMesAnt ? `## Contexto mes anterior
Ventas ${ctx.prevMesNombre}: ${fmt(ctx.reporteMesAnt.ventas)}
Notas: ${ctx.reporteMesAnt.analisis}` : ''}

${ctx.briefingTono.length ? `## Tono de la marca\n${ctx.briefingTono.join(', ')}` : ''}

## Instrucciones
Genera un análisis CONCISO y EJECUTIVO. Responde SOLO con un JSON válido con esta estructura exacta:

{
  "analisis": "Párrafo de 4-6 oraciones con el análisis ejecutivo del mes. Menciona los números clave. Tono directo, profesional.",
  "fortalezas": ["Logro concreto 1 con número", "Logro concreto 2", "Logro concreto 3"],
  "areas_mejora": ["Área de mejora 1 con dato específico", "Área de mejora 2"],
  "recomendaciones": ["Acción concreta 1 para el próximo mes", "Acción concreta 2", "Acción concreta 3"]
}

Máximo 3 fortalezas, 2 áreas de mejora, 3 recomendaciones. Sin markdown. Solo JSON.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type':      'application/json',
            'x-api-key':         ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model:      'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error ${res.status}: ${err}`);
    }

    const claudeRes = await res.json();
    const text = claudeRes.content?.[0]?.text || '{}';

    // Extraer JSON del texto (puede venir con markdown ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude no retornó JSON válido');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
        analisis:        parsed.analisis        || '',
        fortalezas:      Array.isArray(parsed.fortalezas)      ? parsed.fortalezas      : [],
        areas_mejora:    Array.isArray(parsed.areas_mejora)    ? parsed.areas_mejora    : [],
        recomendaciones: Array.isArray(parsed.recomendaciones) ? parsed.recomendaciones : [],
    };
}

// ── Types ──────────────────────────────────────────────────────────────────

interface KpiSemana {
    id?: string;
    semana?: string;
    fecha?: string;
    fecha_hasta?: string;
    ventas?: number;
    dms?: number;
    citas_desde_dm?: number;
    ticket_medio?: number;
    clientes_nuevos?: number;
    clientes_recurrentes?: number;
    clientes_recuperados?: number;
    seguidores_ini?: number;
    seguidores_fin?: number;
}

interface ReporteMensual {
    id: string;
    mes: string;
    periodo: string;
    fecha_cierre: string;
    ventas_total: number;
    ventas_objetivo: number | null;
    ventas_mes_anterior: number | null;
    analisis_ejecutivo: string;
    recomendaciones: string[];
    fortalezas: string[];
    areas_mejora: string[];
    periodos: { nombre: string; total: number; pct: number }[];
    servicios: { nombre: string; monto: number; pct: number }[];
    generado_por_ia?: boolean;
    ia_modelo?: string;
    generado_en?: string;
    kpis_adicionales?: Record<string, number>;
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
