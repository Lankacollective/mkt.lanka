// ==========================================================================
// LANKA CORE API - Servidor Node.js
// Archivo: server.js
// Local:  npm install express axios cors dotenv && node server.js
// Vercel: automático desde vercel.json
// ==========================================================================

const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Lee los orígenes del .env; en Vercel los defines en Environment Variables
const origenesPermitidos = (process.env.ORIGENES_PERMITIDOS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin origen (Postman, server-to-server) o desde lista blanca
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para origen: ${origin}`));
  }
}));

app.use(express.json());

// ── VARIABLES DE ENTORNO ─────────────────────────────────────────────────────
const META_APP_ID     = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const REDIRECT_URI    = process.env.REDIRECT_URI || 'http://localhost:3000/auth/meta/callback';
const API_KEY_INTERNA = process.env.API_KEY_INTERNA;

// ── MIDDLEWARE: API KEY INTERNA ───────────────────────────────────────────────
// Todas las rutas /api/* requieren el header x-lanka-key
function requireApiKey(req, res, next) {
  const key = req.headers['x-lanka-key'];
  if (!API_KEY_INTERNA || key !== API_KEY_INTERNA) {
    return res.status(401).json({ error: 'No autorizado. Header x-lanka-key inválido.' });
  }
  next();
}

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'LANKA Core API', ts: new Date().toISOString() });
});

// ── 1. INICIO OAUTH META ──────────────────────────────────────────────────────
// GET /api/auth/meta  →  redirige al diálogo de permisos de Meta
app.get('/api/auth/meta', (req, res) => {
  if (!META_APP_ID) return res.status(500).json({ error: 'META_APP_ID no configurado en el servidor.' });
  const url = `https://www.facebook.com/v19.0/dialog/oauth`
    + `?client_id=${META_APP_ID}`
    + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    + `&scope=ads_management,ads_read,business_management`
    + `&response_type=code`;
  res.redirect(url);
});

// ── 2. CALLBACK OAUTH META ────────────────────────────────────────────────────
// GET /auth/meta/callback  →  intercambia code por access_token
app.get('/auth/meta/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).json({ error, descripcion: req.query.error_description });

  try {
    const { data } = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri:  REDIRECT_URI,
        code
      }
    });
    // En producción guarda el token en tu DB / Redis, nunca en el frontend
    // Por ahora lo devolvemos para que lo copies a ORIGENES_PERMITIDOS o tu DB
    res.json({
      mensaje:       'Autenticación exitosa',
      access_token:  data.access_token,
      token_type:    data.token_type,
      expires_in:    data.expires_in
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al intercambiar token', detalle: err.response?.data || err.message });
  }
});

// ── 3. MÉTRICAS POR PROYECTO ──────────────────────────────────────────────────
// GET /api/proyectos/:id/metricas
// Headers: x-lanka-key, x-meta-token (access token del usuario autenticado)
//
// Si no hay token real, cae al simulador para que el frontend funcione hoy.
app.get('/api/proyectos/:id/metricas', requireApiKey, async (req, res) => {
  const proyectoId  = req.params.id;
  const metaToken   = req.headers['x-meta-token'];

  // ── SIMULADOR (sin token real) ──────────────────────────────────────────
  if (!metaToken || metaToken === 'SIMULADO') {
    const mock = {
      aitama: { fuente:'simulado', gastoReal:4850.50, impresiones:'1.6M', conversiones:342, cpa:'$14.18', alcance:62000, ctr:'2.4%' },
      mammut: { fuente:'simulado', gastoReal:1240.00, impresiones:'850K', conversiones:120, cpa:'$10.33', alcance:28000, ctr:'1.8%' },
      lanka:  { fuente:'simulado', gastoReal:2100.00, impresiones:'420K', conversiones:45,  cpa:'$46.66', alcance:15000, ctr:'0.9%' }
    };
    const datos = mock[proyectoId];
    if (!datos) return res.status(404).json({ error: `Proyecto "${proyectoId}" no existe en el simulador.` });
    return setTimeout(() => res.json(datos), 400);
  }

  // ── META GRAPH API REAL ─────────────────────────────────────────────────
  // Necesitas pasar el Ad Account ID como query param: ?ad_account=act_XXXXXXXXX
  const adAccount = req.query.ad_account;
  if (!adAccount) return res.status(400).json({ error: 'Falta query param ?ad_account=act_XXXXXXX' });

  try {
    const campos = 'spend,impressions,reach,clicks,ctr,actions,cost_per_action_type';
    const { data } = await axios.get(
      `https://graph.facebook.com/v19.0/${adAccount}/insights`,
      {
        params: {
          access_token: metaToken,
          fields:       campos,
          date_preset:  'last_30d',
          level:        'account'
        }
      }
    );

    const insight = data.data?.[0] || {};
    const conversiones = (insight.actions || []).find(a => a.action_type === 'lead')?.value || 0;

    res.json({
      fuente:       'meta_real',
      gastoReal:    parseFloat(insight.spend || 0),
      impresiones:  insight.impressions || '0',
      alcance:      insight.reach || '0',
      clics:        insight.clicks || '0',
      ctr:          insight.ctr ? `${parseFloat(insight.ctr).toFixed(2)}%` : '0%',
      conversiones: parseInt(conversiones),
      cpa:          conversiones > 0
                      ? `$${(parseFloat(insight.spend) / conversiones).toFixed(2)}`
                      : 'N/A'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en Meta Graph API', detalle: err.response?.data || err.message });
  }
});

// ── 4. LISTA DE CAMPAÑAS ACTIVAS ──────────────────────────────────────────────
// GET /api/proyectos/:id/campanas?ad_account=act_XXX
app.get('/api/proyectos/:id/campanas', requireApiKey, async (req, res) => {
  const metaToken = req.headers['x-meta-token'];
  const adAccount = req.query.ad_account;

  if (!metaToken || metaToken === 'SIMULADO' || !adAccount) {
    // Simulador
    return res.json([
      { id:'c1', nombre:'Día de Madres — Mensajes', estado:'ACTIVE',  presupuesto:'$600',  alcance:18400, conversiones:24, cpr:'$25.00' },
      { id:'c2', nombre:'ASMR Facial — Awareness',  estado:'PAUSED',  presupuesto:'$400',  alcance:22000, conversiones:11, cpr:'$36.36' },
      { id:'c3', nombre:'Masaje Holístico — Leads',  estado:'ARCHIVED',presupuesto:'$800',  alcance:31000, conversiones:38, cpr:'$21.05' }
    ]);
  }

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v19.0/${adAccount}/campaigns`,
      { params: { access_token: metaToken, fields: 'name,status,daily_budget,lifetime_budget', limit: 20 } }
    );
    res.json(data.data || []);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo campañas', detalle: err.response?.data || err.message });
  }
});

// ── INICIAR ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LANKA API corriendo en http://localhost:${PORT}`);
  console.log(`   Orígenes permitidos: ${origenesPermitidos.join(', ') || 'todos (⚠️ configura ORIGENES_PERMITIDOS)'}`);
  console.log(`   Meta App ID: ${META_APP_ID ? '✅ configurado' : '❌ falta META_APP_ID en .env'}`);
});
