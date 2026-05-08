export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.LANKA_API_KEY) {
        return res.status(401).json({ error: 'Acceso denegado' });
    }

    const { id } = req.query;
    const adAccounts = {
        'mammut': process.env.META_ACT_ID_MAMMUT,
        'aitama': process.env.META_ACT_ID_AITAMA
    };
    const adAccountId = adAccounts[id];
    const metaToken = process.env.META_ACCESS_TOKEN;

    if (!adAccountId || !metaToken || metaToken === 'PENDIENTE') {
        return res.status(200).json({ gastoReal: 0, impresiones: "0", cpm: "$0.00", status: "Pendiente" });
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?date_preset=this_month&fields=spend,impressions,cpm&access_token=${metaToken}`;
        const metaRes = await fetch(url);
        const metaData = await metaRes.json();

        if (metaData.error) {
            // En lugar de 500, regresa ceros con el mensaje de error
            return res.status(200).json({
                gastoReal: 0,
                impresiones: "0",
                cpm: "$0.00",
                status: "Error Meta: " + metaData.error.message
            });
        }

        const data = metaData.data?.[0] || { spend: 0, impressions: 0, cpm: 0 };
        let imp = parseInt(data.impressions || 0);
        let impFormatted = imp >= 1000000 ? (imp/1000000).toFixed(1)+'M' : imp >= 1000 ? (imp/1000).toFixed(1)+'K' : imp.toString();

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json({
            gastoReal: parseFloat(data.spend || 0),
            impresiones: impFormatted,
            cpm: `$${parseFloat(data.cpm || 0).toFixed(2)}`,
            status: "Conectado"
        });

    } catch (error) {
        return res.status(200).json({ gastoReal: 0, impresiones: "0", cpm: "$0.00", status: "Error de red" });
    }
}
}
