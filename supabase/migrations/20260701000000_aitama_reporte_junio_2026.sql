-- Agrega el reporte mensual de Junio 2026 al data blob de aitama en project_data.
-- Los reportes viven en data->'reportes_mensuales' (array).
-- El análisis se genera desde la herramienta mkt.lanka, no en Notion.

UPDATE public.project_data
SET
    data = jsonb_set(
        data,
        '{reportes_mensuales}',
        COALESCE(data->'reportes_mensuales', '[]'::jsonb) ||
        '[{
            "id": "rep_aitama_202606",
            "mes": "Junio 2026",
            "periodo": "2026-06",
            "fecha_cierre": "2026-07-01",
            "ventas_total": 36270,
            "ventas_objetivo": 30000,
            "ventas_mes_anterior": 29630,
            "ticket_promedio": 1008,
            "servicios_count": 36,
            "periodos": [
                { "label": "01–07 Jun", "total": 8240 },
                { "label": "08–22 Jun", "total": 17020 },
                { "label": "23–30 Jun", "total": 11010 }
            ],
            "servicios": [
                { "nombre": "Micropigmentación", "pct": 35, "monto": 12695 },
                { "nombre": "Tratamientos Faciales", "pct": 28, "monto": 10156 },
                { "nombre": "Limpieza Profunda", "pct": 22, "monto": 7979 },
                { "nombre": "Cejas / Laminado", "pct": 15, "monto": 5441 }
            ],
            "fortalezas": [
                "Mejor mes desde apertura — $36,270 vs objetivo de $30,000",
                "Micropigmentación como ancla de ingresos (35% del total)",
                "Semana 08–22 especialmente fuerte: $17,020 en 15 días",
                "Ticket promedio saludable: $1,008 por servicio"
            ],
            "areas_mejora": [
                "Instagram Insights 08–30 jun pendiente de captura (solo tenemos 01–07)",
                "Alta concentración en 2 servicios estrella — diversificar mix",
                "Semana final más débil: $11,010 vs $17,020 semana central"
            ],
            "analisis_ejecutivo": "Junio 2026 fue el mejor mes de Aitama desde su apertura, con $36,270 en ventas — un 20.9% sobre el objetivo de $30,000 y un 22.4% por encima de mayo 2026 ($29,630).\n\nLa semana central (08–22 jun) fue la más fuerte con $17,020, impulsada por micropigmentación y tratamientos faciales. La primera semana arrancó sólida con $8,240 en solo 7 días. La semana final cerró con $11,010, mostrando ligera desaceleración hacia fin de mes.\n\nEl ticket promedio de $1,008 por servicio confirma un posicionamiento de valor medio-alto bien consolidado. La micropigmentación sigue siendo el ancla de ingresos (35%), seguida de tratamientos faciales (28%) y limpieza profunda (22%).\n\nNota: métricas de Instagram solo disponibles para 01–07 jun — se integrará la sección digital cuando Ángeles capture los datos del 08–30 desde Instagram Insights.",
            "recomendaciones": [
                "Activar campaña de verano segunda quincena julio — aprovechar momentum de junio",
                "Paquete combo: micropigmentación + limpieza profunda con 10% descuento para fidelización",
                "Analizar qué impulsó la semana 08–22 para replicarlo mensualmente",
                "Capturar Instagram Insights 08–30 jun para cerrar el análisis digital del mes",
                "Establecer objetivo julio en $38,000 dado el récord de junio"
            ]
        }]'::jsonb
    ),
    updated_at = now(),
    updated_by = 'migration'
WHERE project_id = 'aitama';
