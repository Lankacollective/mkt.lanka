-- Cron job para generar reportes mensuales automáticamente el día 1 de cada mes.
--
-- REQUISITO: pg_cron debe estar habilitado en el proyecto Supabase.
-- Activar en: Dashboard → Database → Extensions → pg_cron → Enable
--
-- REQUISITO: ANTHROPIC_API_KEY debe estar configurada en Edge Functions:
-- Dashboard → Edge Functions → generate-monthly-report → Secrets → ANTHROPIC_API_KEY
--
-- Este script llama a la Edge Function generate-monthly-report con service_role
-- para todos los proyectos activos el día 1 de cada mes a las 08:00 CDMX (14:00 UTC).

-- Crear el job (se puede ejecutar varias veces — usa ON CONFLICT DO NOTHING lógica de cron)
SELECT cron.schedule(
    'generate-monthly-reports',          -- nombre único del job
    '0 14 1 * *',                        -- cron: día 1 de cada mes a las 08:00 CDMX (UTC-6)
    $$
    SELECT net.http_post(
        url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/generate-monthly-report',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body    := '{"period": null}'::jsonb
    );
    $$
);

-- Verificar que el job quedó registrado
-- SELECT * FROM cron.job WHERE jobname = 'generate-monthly-reports';
