-- Emergencia: snapshot automático de lanka_db antes de cada UPDATE.
-- Esto NO depende de la app ni de ningún cliente — corre a nivel de Postgres,
-- así que protege incluso contra escrituras hechas por scripts sueltos (curl,
-- consola del navegador, etc.) que usan la misma anon key que la app.
--
-- Causa raíz del incidente: lanka_db es una sola fila JSONB compartida por
-- todos los proyectos, sin merge — el último que guarda gana y borra lo
-- demás. Esto es un parche de emergencia (deshacer rápido); la solución de
-- fondo sigue siendo partir el blob en tablas por proyecto con RLS (Fase 1).

create table if not exists public.lanka_db_history (
    id          bigint generated always as identity primary key,
    data        jsonb not null,
    updated_at  timestamptz,
    updated_by  text,
    snapshot_at timestamptz not null default now()
);

create index if not exists lanka_db_history_snapshot_at_idx
    on public.lanka_db_history (snapshot_at desc);

alter table public.lanka_db_history enable row level security;

-- Mismo nivel de acceso que lanka_db hoy (sin auth real, solo anon key):
-- permite leer el historial para poder recuperar manualmente en un incidente.
-- No se permite UPDATE/DELETE desde el cliente — el historial es append-only.
drop policy if exists "lanka_db_history_select" on public.lanka_db_history;
create policy "lanka_db_history_select"
    on public.lanka_db_history
    for select
    to anon, authenticated
    using (true);

-- La función corre con privilegios del dueño (security definer), así que el
-- snapshot se guarda pase lo que pase con las policies de lanka_db_history.
create or replace function public.lanka_db_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.lanka_db_history (data, updated_at, updated_by, snapshot_at)
    values (old.data, old.updated_at, old.updated_by, now());
    return new;
end;
$$;

drop trigger if exists trg_lanka_db_snapshot on public.lanka_db;
create trigger trg_lanka_db_snapshot
    before update on public.lanka_db
    for each row
    execute function public.lanka_db_snapshot();

-- Snapshot inmediato del estado actual, por si acaso.
insert into public.lanka_db_history (data, updated_at, updated_by, snapshot_at)
select data, updated_at, updated_by, now() from public.lanka_db where id = 'main';

-- ── Cómo recuperar en un incidente futuro ──────────────────────────────────
-- 1. Ver el historial reciente:
--    select id, updated_by, updated_at, snapshot_at,
--           jsonb_array_length(data->'datos'->'aitama'->'kanban') as aitama_kanban
--    from public.lanka_db_history order by snapshot_at desc limit 20;
-- 2. Restaurar una versión específica (reemplaza :id):
--    update public.lanka_db
--    set data = (select data from public.lanka_db_history where id = :id)
--    where id = 'main';
