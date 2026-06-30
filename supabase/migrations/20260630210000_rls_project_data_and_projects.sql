-- Cerrar RLS en project_data y projects.
-- Antes: todas las políticas eran abiertas a anon+authenticated (true).
-- Ahora: project_data solo accesible a miembros autenticados del proyecto;
--        projects: SELECT abierto (overlay JS lo necesita), escrituras restringidas.

-- ── project_data ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "project_data_select" ON public.project_data;
DROP POLICY IF EXISTS "project_data_insert" ON public.project_data;
DROP POLICY IF EXISTS "project_data_update" ON public.project_data;
DROP POLICY IF EXISTS "project_data_delete" ON public.project_data;

CREATE POLICY "project_data_select" ON public.project_data
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_data.project_id
        AND pm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "project_data_insert" ON public.project_data
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_data.project_id
        AND pm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "project_data_update" ON public.project_data
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_data.project_id
        AND pm.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_data.project_id
        AND pm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "project_data_delete" ON public.project_data
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
  );

-- ── projects ──────────────────────────────────────────────────────────────────
-- SELECT se deja abierto (anon+authenticated) — el overlay JS lo lee antes de
-- confirmar sesión y los nombres de proyecto no son datos sensibles.

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
  );

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'rol_id') IN ('owner', 'lanka_team')
  );
