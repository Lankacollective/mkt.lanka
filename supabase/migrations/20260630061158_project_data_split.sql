-- Fase 1, primer corte: tabla por proyecto para eliminar la colisión cruzada
-- entre proyectos en lanka_db (un solo blob compartido, last-write-wins).
--
-- Diseño: dual-write. lanka_db sigue siendo la fuente de verdad para lo que
-- NO es contenido de proyecto (sucursales, usuarios, roles, permisos) y
-- sigue guardando el blob completo como respaldo — nada se rompe si esta
-- migración tarda en correr. project_data guarda SOLO el contenido de UN
-- proyecto (lo que antes vivía en data->'datos'->'<project_id>') por fila;
-- cada pestaña solo escribe la fila del proyecto que tiene abierto, así que
-- nunca pisa el contenido de otro proyecto que otra pestaña esté guardando
-- al mismo tiempo. Es el mismo patrón de protección que lanka_db_history,
-- aplicado por proyecto.

create table if not exists public.project_data (
    project_id  text primary key,
    data        jsonb not null,
    updated_at  timestamptz not null default now(),
    updated_by  text
);

alter table public.project_data enable row level security;

-- Mismo nivel de acceso que lanka_db hoy (sin auth real, solo anon key).
drop policy if exists "project_data_select" on public.project_data;
create policy "project_data_select"
    on public.project_data
    for select
    to anon, authenticated
    using (true);

drop policy if exists "project_data_insert" on public.project_data;
create policy "project_data_insert"
    on public.project_data
    for insert
    to anon, authenticated
    with check (true);

drop policy if exists "project_data_update" on public.project_data;
create policy "project_data_update"
    on public.project_data
    for update
    to anon, authenticated
    using (true)
    with check (true);

-- Historial append-only por proyecto, mismo patrón que lanka_db_history.
create table if not exists public.project_data_history (
    id          bigint generated always as identity primary key,
    project_id  text not null,
    data        jsonb not null,
    updated_at  timestamptz,
    updated_by  text,
    snapshot_at timestamptz not null default now()
);

create index if not exists project_data_history_lookup_idx
    on public.project_data_history (project_id, snapshot_at desc);

alter table public.project_data_history enable row level security;

drop policy if exists "project_data_history_select" on public.project_data_history;
create policy "project_data_history_select"
    on public.project_data_history
    for select
    to anon, authenticated
    using (true);

-- security definer: el snapshot se guarda pase lo que pase con las policies
-- de project_data_history (igual que lanka_db_snapshot).
create or replace function public.project_data_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.project_data_history (project_id, data, updated_at, updated_by, snapshot_at)
    values (old.project_id, old.data, old.updated_at, old.updated_by, now());
    return new;
end;
$$;

drop trigger if exists trg_project_data_snapshot on public.project_data;
create trigger trg_project_data_snapshot
    before update on public.project_data
    for each row
    execute function public.project_data_snapshot();

-- Backfill: una fila por proyecto que ya exista hoy en lanka_db.data->'datos'.
-- on conflict do nothing porque esta migración debe poder re-correrse sin
-- pisar filas que ya se hayan guardado en vivo después del primer deploy.
insert into public.project_data (project_id, data, updated_at, updated_by)
select kv.key, kv.value, ld.updated_at, ld.updated_by
from public.lanka_db ld,
     jsonb_each(ld.data -> 'datos') as kv(key, value)
where ld.id = 'main'
on conflict (project_id) do nothing;
