-- Fase 1, segundo corte: tabla projects como fuente de verdad para la lista
-- de proyectos/sucursales, y tabla project_members para el mapeo usuario→proyecto.
--
-- Antes: DB.sucursales vivía solo en lanka_db (el blob). Cualquier guardarBD()
-- desde un browser sin los cambios más recientes sobreescribía las altas/bajas
-- de sucursales. Con esta tabla, la lista de proyectos es server-authoritative
-- y el blob deja de poder pisarla.
--
-- project_members mapea usuario_legacy_id → project_id + rol. Cuando migremos
-- a Supabase Auth (siguiente paso), se agrega auth_user_id uuid y se activa RLS.

-- ─── projects ───────────────────────────────────────────────────────────────

create table if not exists public.projects (
    id                   text primary key,
    nombre               text not null,
    tipo                 text not null default 'otro',
    cliente_id           text,
    color                text not null default '#C4855A',
    moneda               text not null default 'MXN',
    pto_anual            numeric not null default 0,
    categorias_servicio  jsonb not null default '[]',
    drive_contenido_url  text not null default '',
    brand_kit            jsonb not null default '{}',
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    updated_by           text
);

alter table public.projects enable row level security;

drop policy if exists "projects_select" on public.projects;
create policy "projects_select"
    on public.projects for select
    to anon, authenticated
    using (true);

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert"
    on public.projects for insert
    to anon, authenticated
    with check (true);

drop policy if exists "projects_update" on public.projects;
create policy "projects_update"
    on public.projects for update
    to anon, authenticated
    using (true) with check (true);

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete"
    on public.projects for delete
    to anon, authenticated
    using (true);

-- ─── project_members ────────────────────────────────────────────────────────

create table if not exists public.project_members (
    id               bigint generated always as identity primary key,
    user_legacy_id   text not null,         -- DB.usuarios[x].id (ej. 'u_angeles')
    auth_user_id     uuid,                  -- se llena al migrar a Supabase Auth
    project_id       text not null references public.projects(id) on delete cascade,
    rol              text not null default 'equipo',
    created_at       timestamptz not null default now(),
    unique (user_legacy_id, project_id)
);

create index if not exists project_members_auth_idx
    on public.project_members (auth_user_id, project_id);

create index if not exists project_members_legacy_idx
    on public.project_members (user_legacy_id, project_id);

alter table public.project_members enable row level security;

drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select"
    on public.project_members for select
    to anon, authenticated
    using (true);

drop policy if exists "project_members_insert" on public.project_members;
create policy "project_members_insert"
    on public.project_members for insert
    to anon, authenticated
    with check (true);

drop policy if exists "project_members_update" on public.project_members;
create policy "project_members_update"
    on public.project_members for update
    to anon, authenticated
    using (true) with check (true);

drop policy if exists "project_members_delete" on public.project_members;
create policy "project_members_delete"
    on public.project_members for delete
    to anon, authenticated
    using (true);

-- ─── Backfill projects ──────────────────────────────────────────────────────
-- Toma las sucursales del blob + agrega las que solo existen en project_data.

insert into public.projects (id, nombre, tipo, cliente_id, color, moneda, pto_anual, categorias_servicio, drive_contenido_url, brand_kit, updated_at, updated_by)
select
    elem->>'id',
    elem->>'nombre',
    coalesce(elem->>'tipo', 'otro'),
    elem->>'cliente_id',
    coalesce(elem->>'color', '#C4855A'),
    coalesce(elem->>'moneda', 'MXN'),
    coalesce((elem->>'pto_anual')::numeric, 0),
    coalesce(elem->'categorias_servicio', '[]'::jsonb),
    coalesce(elem->>'drive_contenido_url', ''),
    coalesce(elem->'brand_kit', '{}'::jsonb),
    ld.updated_at,
    ld.updated_by
from public.lanka_db ld,
     jsonb_array_elements(ld.data->'sucursales') as elem
where ld.id = 'main'
  and elem->>'id' is not null
on conflict (id) do nothing;

-- Sucursales que solo están en project_data (ej. mammut_oxford/altozano/salavive
-- creadas por SQL y luego borradas del blob por un guardarBD posterior).
insert into public.projects (id, nombre, tipo, cliente_id, color, moneda, pto_anual, categorias_servicio, drive_contenido_url, updated_at, updated_by)
values
    ('mammut_oxford',   'Mammut Oxford',    'restaurante', 'cl_mammut', '#EA4335', 'MXN', 300000, '["Pizza","Bebida","Postre","Entrada","Combo","Promoción"]'::jsonb, '', now(), 'loptus'),
    ('mammut_altozano', 'Mammut Altozano',  'restaurante', 'cl_mammut', '#EA4335', 'MXN', 300000, '["Pizza","Bebida","Postre","Entrada","Combo","Promoción"]'::jsonb, '', now(), 'loptus'),
    ('mammut_salavive', 'Mammut Sala Vivé', 'restaurante', 'cl_mammut', '#EA4335', 'MXN', 300000, '["Pizza","Bebida","Postre","Entrada","Combo","Promoción"]'::jsonb, '', now(), 'loptus')
on conflict (id) do nothing;

-- Rename mammut → Mammut Madero (el "mammut" original es la sucursal Madero).
update public.projects set nombre = 'Mammut Madero' where id = 'mammut' and nombre = 'Mammut Pizza';

-- ─── Backfill project_members ───────────────────────────────────────────────

insert into public.project_members (user_legacy_id, project_id, rol)
select
    u->>'id',
    proj_id,
    u->>'rol_id'
from public.lanka_db ld,
     jsonb_array_elements(ld.data->'usuarios') as u,
     jsonb_array_elements_text(u->'proyectos') as proj_id
where ld.id = 'main'
  and u->>'id' is not null
  and u->>'estado' = 'activo'
  and exists (select 1 from public.projects p where p.id = proj_id)
on conflict (user_legacy_id, project_id) do nothing;
