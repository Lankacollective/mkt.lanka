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
    if (req.method === 'OPTIONS') return respond({ ok: true }, 200);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const authHeader = req.headers.get('Authorization') || '';
    const isServiceRole = authHeader.includes(SUPABASE_SERVICE_KEY);

    if (!isServiceRole) {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(jwt);
        if (error || !user) return respond({ error: 'No autorizado' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { project_id, period } = body as { project_id?: string; period?: string };

    if (!project_id && isServiceRole) {
        const { data: projects } = await supabase.from('projects').select('id');
        const results: Record<string, unknown>[] = [];
        for (const p of (projects || [])) {
            try { results.push({ project_id: p.id, ...(await generateReport(supabase, p.id, period)) }); }
            catch (e) { results.push({ project_id: p.id, error: String(e) }); }
        }
        return respond({ ok: true, results });
    }

    if (!project_id) return respond({ error: 'project_id requerido' }, 400);

    try {
        return respond({ ok: true, project_id, ...(await generateReport(supabase, project_id, period)) });
    } catch (e) {
        return respond({ error: String(e) }, 500);
    }
});

async function generateReport(
    supabase: ReturnType<typeof createClient>,
    projectId: string,
    periodOverride?: string
) {
    const now = new Date();
    const targetDate = periodOverride
        ? new Date(periodOverride + '-01T12:00:00')
        : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year  = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const reportId = `rep_${projectId}_${period.replace('-', '')}`;

    const { data: proj } = await supabase
        .from('projects').select('nombre, tipo, categorias_servicio')
        .eq('id', projectId).single();

    const { data: pd } = await supabase
        .from('project_data').select('data')
        .eq('project_id', projectId).single();

    const data = pd?.data || {};
    const kpiSemanal = ((data.kpi_semanal || []) as KpiSemana[]).filter((s) => {
        if (!s.fecha) return false;
        const [y, m] = s.fecha.split('-').map(Number);
        return y === year && m === month;
    });
    const briefing    = data.briefing    || {};
    const kpiMetas    = data.kpi_metas   || {};
    const histMensual = data.historico_mensual || [];
    const prevReportes = (data.reportes_mensuales || []) as ReporteMensual[];

    const lastDay   = new Date(year, month, 0).getDate();
    const sinceDate = `${period}-01`;
    const untilDate = `${period}-${String(lastDay).padStart(2, '0')}`;

    const { data: igMetrics } = await supabase
        .from('metrics').select('metric_date, metric_type, value')
        .eq('project_id', projectId).eq('source', 'meta_instagram')
        .gte('metric_date', sinceDate).lte('metric_date', untilDate);

    const igAgg: Record<string, number> = {};
    for (const m of (igMetrics || [])) {
        igAgg[m.metric_type] = (igAgg[m.metric_type] || 0) + Number(m.value);
    }
    const followersEnd = (igMetrics || [])
        .filter(m => m.metric_type === 'followers_count')
        .sort((a, b) => b.metric_date.localeCompare(a.metric_date))[0]?.value || null;

    const totalVentas       = kpiSemanal.reduce((s, k) => s + (k.ventas || 0), 0);
    const totalDMs          = kpiSemanal.reduce((s, k) => s + (k.dms || 0), 0);
    const totalCitasDM      = kpiSemanal.reduce((s, k) => s + (k.citas_desde_dm || 0), 0);
    const clientesNuevos    = kpiSemanal.reduce((s, k) => s + (k.clientes_nuevos || 0), 0);
    const clientesRecurr    = kpiSemanal.reduce((s, k) => s + (k.clientes_recurrentes || 0), 0);
    const clientesRecup     = kpiSemanal.reduce((s, k) => s + (k.clientes_recuperados || 0), 0);
    const ticketMedio       = kpiSemanal.length
        ? Math.round(kpiSemanal.reduce((s, k) => s + (k.ticket_medio || 0), 0) / kpiSemanal.length) : 0;
    const seguidoresInicio  = kpiSemanal[0]?.seguidores_ini || 0;
    const seguidoresFin     = kpiSemanal[kpiSemanal.length - 1]?.seguidores_fin || 0;

    const prevMonth     = month === 1 ? 12 : month - 1;
    const prevYear      = month === 1 ? year - 1 : year;
    const prevMesNombre = MESES[prevMonth - 1];
    const ventasMesAnt  = (histMensual[prevMonth - 1] as { ventas?: number })?.ventas || 0;
    const ventasObj     = (kpiMetas[`ventas_${MESES[month-1].toLowerCase()}`] as number)
                       || (kpiMetas['ventas_mensual'] as number) || 0;

    const prevPeriod   = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const reporteAnt   = prevReportes.find(r => r.periodo === prevPeriod);
    const existing     = prevReportes.find(r => r.periodo === period);

    if (existing?.generado_por_ia && totalVentas === 0 && kpiSemanal.length === 0) {
        return { period, skipped: true, reason: 'Sin datos de KPI para el periodo' };
    }

    const analisis = await callClaude({
        projectName: proj?.nombre || projectId,
        projectType: proj?.tipo || 'otro',
        categorias:  proj?.categorias_servicio || [],
        period:      `${MESES[month - 1]} ${year}`,
        briefingTono: briefing.tono_ejemplos || [],
        kpiSemanal, totalVentas, ventasObj, ventasMesAnt,
        totalDMs, totalCitasDM, clientesNuevos, clientesRecurr, clientesRecup,
        ticketMedio, seguidoresInicio,
        seguidoresFin: followersEnd ? Number(followersEnd) : seguidoresFin,
        igMetrics: igAgg, prevMesNombre,
        reporteAnt: reporteAnt ? {
            ventas: reporteAnt.ventas_total,
            analisis: (reporteAnt.analisis_ejecutivo || '').slice(0, 400),
        } : null,
    });

    const periodos = kpiSemanal.map(k => ({
        nombre: k.semana || 'Semana',
        total:  k.ventas || 0,
        pct:    totalVentas ? Math.round((k.ventas || 0) / totalVentas * 100) : 0,
    }));

    const reporte: ReporteMensual = {
        id:                  reportId,
        mes:                 `${MESES[month - 1]} ${year}`,
        periodo:             period,
        fecha_cierre:        untilDate,
        ventas_total:        totalVentas,
        ventas_objetivo:     ventasObj || null,
        ventas_mes_anterior: ventasMesAnt || null,
        analisis_ejecutivo:  analisis.analisis,
        recomendaciones:     analisis.recomendaciones,
        fortalezas:          analisis.fortalezas,
        areas_mejora:        analisis.areas_mejora,
        periodos,
        servicios:           [],
        generado_por_ia:     true,
        ia_modelo:           'claude-haiku-4-5-20251001',
        generado_en:         new Date().toISOString(),
        kpis_adicionales: {
            clientes_nuevos:      clientesNuevos,
            clientes_recurrentes: clientesRecurr,
            ticket_medio:         ticketMedio,
            dms_totales:          totalDMs,
            citas_desde_dm:       totalCitasDM,
            seguidores_inicio:    seguidoresInicio,
            seguidores_fin:       followersEnd ? Number(followersEnd) : seguidoresFin,
            ig_reach:             igAgg['reach'] || 0,
            ig_impressions:       igAgg['impressions'] || 0,
        },
    };

    const existingIdx = prevReportes.findIndex(r => r.periodo === period);
    const nuevosReportes = [...prevReportes];
    if (existingIdx >= 0) nuevosReportes[existingIdx] = reporte;
    else nuevosReportes.push(reporte);

    const { error: upsertErr } = await supabase.from('project_data').upsert({
        project_id:  projectId,
        data:        { ...data, reportes_mensuales: nuevosReportes },
        updated_at:  new Date().toISOString(),
        updated_by:  'generate-monthly-report',
    }, { onConflict: 'project_id' });

    if (upsertErr) throw new Error(`Error guardando reporte: ${upsertErr.message}`);

    return { period, mes: reporte.mes, ventas: totalVentas, created: existingIdx < 0 };
}

async function callClaude(ctx: {
    projectName: string; projectType: string; categorias: string[];
    period: string; briefingTono: string[]; kpiSemanal: KpiSemana[];
    totalVentas: number; ventasObj: number; ventasMesAnt: number;
    totalDMs: number; totalCitasDM: number; clientesNuevos: number;
    clientesRecurr: number; clientesRecup: number; ticketMedio: number;
    seguidoresInicio: number; seguidoresFin: number;
    igMetrics: Record<string, number>; prevMesNombre: string;
    reporteAnt: { ventas: number; analisis: string } | null;
}) {
    const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
    const pct = (a: number, b: number) => b > 0 ? `${((a / b - 1) * 100).toFixed(1)}%` : '—';

    const kpiLineas = ctx.kpiSemanal.map(k =>
        `  • ${k.semana}: ${fmt(k.ventas || 0)} | ${k.clientes_nuevos || 0} nuevos | ${k.dms || 0} DMs | ${k.clientes_recurrentes || 0} recurrentes`
    ).join('\n');

    const igLineas = Object.entries(ctx.igMetrics)
        .filter(([k]) => !k.startsWith('post_') && k !== 'followers_count')
        .map(([k, v]) => `  • ${k}: ${v.toLocaleString()}`).join('\n');

    const prompt = `Eres el director de marketing de ${ctx.projectName}, negocio de ${ctx.projectType}${ctx.categorias.length ? ` (${ctx.categorias.join(', ')})` : ''}.

Reporte mensual ${ctx.period}:

KPIs:
- Ventas: ${fmt(ctx.totalVentas)}
- Objetivo: ${ctx.ventasObj ? fmt(ctx.ventasObj) + ` (${pct(ctx.totalVentas, ctx.ventasObj)} vs objetivo)` : 'no definido'}
- Mes anterior (${ctx.prevMesNombre}): ${ctx.ventasMesAnt ? fmt(ctx.ventasMesAnt) + ` (${pct(ctx.totalVentas, ctx.ventasMesAnt)})` : 'sin dato'}
- Nuevos: ${ctx.clientesNuevos} | Recurrentes: ${ctx.clientesRecurr} | Recuperados: ${ctx.clientesRecup}
- Ticket promedio: ${fmt(ctx.ticketMedio)}
- DMs: ${ctx.totalDMs} | Citas: ${ctx.totalCitasDM} (${ctx.totalDMs > 0 ? ((ctx.totalCitasDM / ctx.totalDMs) * 100).toFixed(1) : 0}% conv.)
- Seguidores: ${ctx.seguidoresInicio.toLocaleString()} → ${ctx.seguidoresFin.toLocaleString()}

Desglose semanal:
${kpiLineas || '(sin datos semanales)'}

Instagram:
${igLineas || '(sin métricas Instagram)'}

${ctx.reporteAnt ? `Mes anterior ${ctx.prevMesNombre}: ${fmt(ctx.reporteAnt.ventas)}. Notas: ${ctx.reporteAnt.analisis}` : ''}
${ctx.briefingTono.length ? `Tono de marca: ${ctx.briefingTono.join(', ')}` : ''}

Responde SOLO con JSON (sin markdown):
{
  "analisis": "4-6 oraciones ejecutivas con números clave",
  "fortalezas": ["logro 1 con número", "logro 2", "logro 3"],
  "areas_mejora": ["área 1 con dato", "área 2"],
  "recomendaciones": ["acción 1 próximo mes", "acción 2", "acción 3"]
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);

    const claudeRes = await res.json();
    const text = claudeRes.content?.[0]?.text || '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Claude no retornó JSON');

    const parsed = JSON.parse(match[0]);
    return {
        analisis:        parsed.analisis        || '',
        fortalezas:      Array.isArray(parsed.fortalezas)      ? parsed.fortalezas      : [],
        areas_mejora:    Array.isArray(parsed.areas_mejora)    ? parsed.areas_mejora    : [],
        recomendaciones: Array.isArray(parsed.recomendaciones) ? parsed.recomendaciones : [],
    };
}

interface KpiSemana {
    semana?: string; fecha?: string; ventas?: number; dms?: number;
    citas_desde_dm?: number; ticket_medio?: number; clientes_nuevos?: number;
    clientes_recurrentes?: number; clientes_recuperados?: number;
    seguidores_ini?: number; seguidores_fin?: number;
}

interface ReporteMensual {
    id: string; mes: string; periodo: string; fecha_cierre: string;
    ventas_total: number; ventas_objetivo: number | null; ventas_mes_anterior: number | null;
    analisis_ejecutivo: string; recomendaciones: string[];
    fortalezas: string[]; areas_mejora: string[];
    periodos: { nombre: string; total: number; pct: number }[];
    servicios: { nombre: string; monto: number; pct: number }[];
    generado_por_ia?: boolean; ia_modelo?: string; generado_en?: string;
    kpis_adicionales?: Record<string, number>;
}

function respond(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
