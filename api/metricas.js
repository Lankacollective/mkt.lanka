export default async function handler(req, res) {
    // 1. Permisos para que tu frontend pueda leer estos datos (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Seguridad: Nadie que no tenga tu llave secreta puede consultar esto
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.LANKA_API_KEY) {
        return res.status(401).json({ error: 'Acceso denegado a LANKA Engine' });
    }

    // 3. Identificar si el dashboard pide los datos de Mammut o Aitama
    const { id } = req.query;
    const adAccounts = {
        'mammut': process.env.META_ACT_ID_MAMMUT,
        'aitama': process.env.META_ACT_ID_AITAMA
    };

    const adAccountId = adAccounts[id];
    const metaToken = process.env.META_ACCESS_TOKEN;

    // 4. FALLBACK: Si aún no pones el token de Meta porque el SMS no llega,
    // manda datos en ceros para que el Dashboard no se rompa de mientras.
    if (!adAccountId || !metaToken || metaToken === 'PENDIENTE') {
        return res.status(200).json({
            gastoReal: 0,
            impresiones: "0",
            cpm: "$0.00",
            status: "Meta API Pendiente"
        });
    }

    // 5. Llamada Real a los servidores de Meta
    try {
        const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?date_preset=this_month&fields=spend,impressions,cpm&access_token=${metaToken}`;
        
        const metaRes = await fetch(url);
        const metaData = await metaRes.json();

        if (metaData.error) {
            console.error("Meta API Error:", metaData.error);
            throw new Error(metaData.error.message);
        }

        const data = metaData.data[0] || { spend: 0, impressions: 0, cpm: 0 };

        // 6. Edge Caching: Guarda la respuesta por 1 hora en los servidores de Vercel
        // para que tu app cargue en milisegundos y Meta no te bloquee por exceso de peticiones.
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        // Formato para que los números largos se vean limpios (Ej. 1.4M o 12K)
        let imp = parseInt(data.impressions || 0);
        let impFormatted = imp >= 1000000 ? (imp/1000000).toFixed(1) + 'M' : (imp >= 1000 ? (imp/1000).toFixed(1) + 'K' : imp.toString());

        return res.status(200).json({
            gastoReal: parseFloat(data.spend || 0),
            impresiones: impFormatted,
            cpm: `$${parseFloat(data.cpm || 0).toFixed(2)}`,
            status: "Conectado"
        });

    } catch (error) {
        return res.status(500).json({ error: 'Error conectando con Meta API' });
    }
}
