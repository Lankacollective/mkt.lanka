-- Normalización definitiva de project_data.data para todos los proyectos existentes.
-- Esto reemplaza las migraciones en-browser (Sprints 3–10b).
-- Ejecutar UNA VEZ contra Supabase. Después el browser solo necesita _ensureDefaults().

DO $$
DECLARE
    _rec     RECORD;
    _d       JSONB;
    _changed BOOLEAN;
    _mc      TEXT[] := ARRAY['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    _hm      JSONB;
    _i       INT;
    _arr     JSONB;
    _elem    JSONB;
BEGIN
    FOR _rec IN SELECT project_id, data FROM public.project_data LOOP
        _d       := _rec.data;
        _changed := FALSE;

        -- ── Arrays de primer nivel ─────────────────────────────────────────
        FOREACH _arr IN ARRAY ARRAY[
            'kanban','ads','offline','shooting','stories_ind','dam',
            'insights','presupuesto','facturas','kpi_semanal',
            'engagement_formato','reportes_mensuales'
        ]::text[] LOOP
            IF _d->_arr IS NULL THEN
                _d := _d || jsonb_build_object(_arr, '[]'::jsonb);
                _changed := TRUE;
            END IF;
        END LOOP;

        -- ── kpi_metas ──────────────────────────────────────────────────────
        IF _d->'kpi_metas' IS NULL THEN
            _d := _d || '{"kpi_metas": {}}'::jsonb;
            _changed := TRUE;
        END IF;

        -- ── historico_mensual (12 meses) ───────────────────────────────────
        IF _d->'historico_mensual' IS NULL OR
           jsonb_array_length(COALESCE(_d->'historico_mensual','[]'::jsonb)) != 12 THEN
            _hm := '[]'::jsonb;
            FOR _i IN 1..12 LOOP
                _hm := _hm || jsonb_build_array(
                    jsonb_build_object('mes', _mc[_i], 'ventas', 0, 'seguidores', 0, 'dms', 0)
                );
            END LOOP;
            _d := jsonb_set(_d, '{historico_mensual}', _hm);
            _changed := TRUE;
        END IF;

        -- ── briefing ──────────────────────────────────────────────────────
        IF _d->'briefing' IS NULL THEN
            _d := _d || jsonb_build_object('briefing', jsonb_build_object(
                'reglas', '[]',
                'cofepris', false,
                'cofepris_notas', '',
                'tono_ejemplos', '[]',
                'palabras_prohibidas', '[]',
                'palabras_clave', '[]',
                'manychat', '[]',
                'horarios', jsonb_build_object(
                    'grid', '{}',
                    'por_formato', jsonb_build_object('reel','','story','','post','','pauta','')
                )
            ));
            _changed := TRUE;
        END IF;

        -- ── Campos en kanban cards ─────────────────────────────────────────
        IF jsonb_array_length(COALESCE(_d->'kanban','[]'::jsonb)) > 0 THEN
            _arr := '[]'::jsonb;
            FOR _elem IN SELECT * FROM jsonb_array_elements(_d->'kanban') LOOP
                IF _elem->>'asignado_a'     IS NULL THEN _elem := _elem || '{"asignado_a":""}';            _changed := TRUE; END IF;
                IF _elem->>'scope'           IS NULL THEN _elem := _elem || '{"scope":"local"}';            _changed := TRUE; END IF;
                IF _elem->>'formato'         IS NULL THEN _elem := _elem || '{"formato":""}';               _changed := TRUE; END IF;
                IF _elem->>'caption_ig'      IS NULL THEN _elem := _elem || jsonb_build_object('caption_ig', COALESCE(_elem->>'copy','')); _changed := TRUE; END IF;
                IF _elem->>'hashtags_ig'     IS NULL THEN _elem := _elem || jsonb_build_object('hashtags_ig', COALESCE(_elem->>'hashtags','')); _changed := TRUE; END IF;
                IF _elem->>'caption_tiktok'  IS NULL THEN _elem := _elem || '{"caption_tiktok":""}';        _changed := TRUE; END IF;
                IF _elem->>'hashtags_tiktok' IS NULL THEN _elem := _elem || '{"hashtags_tiktok":""}';       _changed := TRUE; END IF;
                IF _elem->>'aprobado_por'    IS NULL THEN _elem := _elem || '{"aprobado_por":""}';          _changed := TRUE; END IF;
                IF _elem->>'aprobado_fecha'  IS NULL THEN _elem := _elem || '{"aprobado_fecha":""}';        _changed := TRUE; END IF;
                IF _elem->>'rechazo_nota'    IS NULL THEN _elem := _elem || '{"rechazo_nota":""}';          _changed := TRUE; END IF;
                IF _elem->>'pauta_activa'    IS NULL THEN _elem := _elem || '{"pauta_activa":false}';       _changed := TRUE; END IF;
                IF _elem->>'manychat_flujo'  IS NULL THEN _elem := _elem || '{"manychat_flujo":""}';        _changed := TRUE; END IF;
                IF _elem->'vinculos'          IS NULL THEN _elem := _elem || '{"vinculos":{"stories":[],"campana_ad":null,"escenas_shooting":[]}}'; _changed := TRUE; END IF;
                IF _elem->'stories_vinculadas' IS NULL THEN _elem := _elem || '{"stories_vinculadas":[]}';  _changed := TRUE; END IF;
                IF _elem->>'drive_doc_url'   IS NULL THEN _elem := _elem || '{"drive_doc_url":""}';         _changed := TRUE; END IF;
                _arr := _arr || jsonb_build_array(_elem);
            END LOOP;
            IF _changed THEN _d := jsonb_set(_d, '{kanban}', _arr); END IF;
        END IF;

        -- ── DAM: normalizar tipos y estados ───────────────────────────────
        IF jsonb_array_length(COALESCE(_d->'dam','[]'::jsonb)) > 0 THEN
            _arr := '[]'::jsonb;
            FOR _elem IN SELECT * FROM jsonb_array_elements(_d->'dam') LOOP
                IF _elem->>'drive_url' IS NULL THEN
                    _elem := _elem || jsonb_build_object('drive_url', COALESCE(_elem->>'url',''));
                    _changed := TRUE;
                END IF;
                IF _elem->>'categoria' IS NULL THEN _elem := _elem || '{"categoria":"General"}'; _changed := TRUE; END IF;
                -- Normalizar tipo legacy → nuevo
                IF _elem->>'tipo' IN ('fa-film','fa-video') THEN _elem := jsonb_set(_elem, '{tipo}', '"video"'); _changed := TRUE;
                ELSIF _elem->>'tipo' = 'fa-image' THEN _elem := jsonb_set(_elem, '{tipo}', '"foto"'); _changed := TRUE;
                ELSIF _elem->>'tipo' = 'fa-music' THEN _elem := jsonb_set(_elem, '{tipo}', '"audio"'); _changed := TRUE;
                ELSIF _elem->>'tipo' = 'fa-file-pdf' THEN _elem := jsonb_set(_elem, '{tipo}', '"documento"'); _changed := TRUE;
                ELSIF _elem->>'tipo' NOT IN ('video','foto','audio','documento') THEN _elem := jsonb_set(_elem, '{tipo}', '"foto"'); _changed := TRUE;
                END IF;
                -- Normalizar estado
                IF _elem->>'estado' = 'Aprobado' THEN _elem := jsonb_set(_elem, '{estado}', '"aprobado"'); _changed := TRUE;
                ELSIF _elem->>'estado' = 'Cambios solicitados' THEN _elem := jsonb_set(_elem, '{estado}', '"rechazado"'); _changed := TRUE;
                ELSIF _elem->>'estado' = 'En revisión' THEN _elem := jsonb_set(_elem, '{estado}', '"en_revision"'); _changed := TRUE;
                END IF;
                _arr := _arr || jsonb_build_array(_elem);
            END LOOP;
            IF _changed THEN _d := jsonb_set(_d, '{dam}', _arr); END IF;
        END IF;

        -- ── Ads: campos meta_* ─────────────────────────────────────────────
        IF jsonb_array_length(COALESCE(_d->'ads','[]'::jsonb)) > 0 THEN
            _arr := '[]'::jsonb;
            FOR _elem IN SELECT * FROM jsonb_array_elements(_d->'ads') LOOP
                IF (_elem->'meta_alcance')      IS NULL THEN _elem := _elem || '{"meta_alcance":0}';      _changed := TRUE; END IF;
                IF (_elem->'meta_conversiones') IS NULL THEN _elem := _elem || '{"meta_conversiones":0}'; _changed := TRUE; END IF;
                IF (_elem->'meta_clics')        IS NULL THEN _elem := _elem || '{"meta_clics":0}';        _changed := TRUE; END IF;
                IF (_elem->'meta_cpr')          IS NULL THEN _elem := _elem || '{"meta_cpr":0}';          _changed := TRUE; END IF;
                _arr := _arr || jsonb_build_array(_elem);
            END LOOP;
            IF _changed THEN _d := jsonb_set(_d, '{ads}', _arr); END IF;
        END IF;

        -- ── presupuesto: directa/intercambio → inversion/colaboracion ─────
        IF jsonb_array_length(COALESCE(_d->'presupuesto','[]'::jsonb)) > 0 THEN
            _arr := '[]'::jsonb;
            FOR _elem IN SELECT * FROM jsonb_array_elements(_d->'presupuesto') LOOP
                DECLARE
                    _mm JSONB; _m JSONB; _new_mm JSONB := '[]'::jsonb;
                BEGIN
                    _mm := COALESCE(_elem->'montos_mes','[]'::jsonb);
                    IF jsonb_array_length(_mm) > 0 AND (_mm->0)->'directa' IS NOT NULL THEN
                        FOR _m IN SELECT * FROM jsonb_array_elements(_mm) LOOP
                            _new_mm := _new_mm || jsonb_build_array(jsonb_build_object(
                                'inversion',   COALESCE((_m->'directa')::numeric, 0),
                                'colaboracion',COALESCE((_m->'intercambio')::numeric, 0),
                                'real',        COALESCE((_m->'real')::numeric, 0)
                            ));
                        END LOOP;
                        _elem := jsonb_set(_elem, '{montos_mes}', _new_mm);
                        _changed := TRUE;
                    ELSE
                        -- Ensure real field exists
                        _new_mm := '[]'::jsonb;
                        FOR _m IN SELECT * FROM jsonb_array_elements(_mm) LOOP
                            IF (_m->'real') IS NULL THEN
                                _m := _m || '{"real":0}';
                                _changed := TRUE;
                            END IF;
                            _new_mm := _new_mm || jsonb_build_array(_m);
                        END LOOP;
                        _elem := jsonb_set(_elem, '{montos_mes}', _new_mm);
                    END IF;
                    -- tipo rename
                    IF _elem->>'tipo' = 'Digital' THEN _elem := jsonb_set(_elem, '{tipo}', '"Pauta digital"'); _changed := TRUE;
                    ELSIF _elem->>'tipo' = 'Offline' THEN _elem := jsonb_set(_elem, '{tipo}', '"Materiales offline"'); _changed := TRUE;
                    ELSIF _elem->>'tipo' = 'Producción' THEN _elem := jsonb_set(_elem, '{tipo}', '"Producción de contenido"'); _changed := TRUE;
                    END IF;
                END;
                _arr := _arr || jsonb_build_array(_elem);
            END LOOP;
            IF _changed THEN _d := jsonb_set(_d, '{presupuesto}', _arr); END IF;
        END IF;

        IF _changed THEN
            UPDATE public.project_data
            SET data = _d, updated_at = now(), updated_by = 'migration_20260701'
            WHERE project_id = _rec.project_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Migración schema defaults completada.';
END $$;
