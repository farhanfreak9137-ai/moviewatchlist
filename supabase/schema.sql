-- WatchVault cloud sync schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.

create table if not exists public.sync_records (
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  entity_type       text        not null check (entity_type in ('library_item', 'episode_progress')),
  entity_id         text        not null,
  payload           jsonb       not null,
  updated_at        timestamptz not null,               -- when the user made the change (device clock)
  deleted           boolean     not null default false,
  server_updated_at timestamptz not null default now(), -- when the server accepted it (pull cursor)
  primary key (user_id, entity_type, entity_id)
);

create index if not exists sync_records_pull_idx
  on public.sync_records (user_id, server_updated_at);

-- Row Level Security: every account can only see and change its own rows.
alter table public.sync_records enable row level security;

drop policy if exists "sync_records_select_own" on public.sync_records;
drop policy if exists "sync_records_insert_own" on public.sync_records;
drop policy if exists "sync_records_update_own" on public.sync_records;
drop policy if exists "sync_records_delete_own" on public.sync_records;

create policy "sync_records_select_own" on public.sync_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "sync_records_insert_own" on public.sync_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sync_records_update_own" on public.sync_records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sync_records_delete_own" on public.sync_records
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Last-write-wins, enforced on the server: an upload that is not newer than
-- the stored copy is silently ignored (so stale devices can't overwrite newer edits).
create or replace function public.sync_records_last_write_wins()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null; -- keep the existing, newer row
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists sync_records_lww on public.sync_records;
create trigger sync_records_lww
  before insert or update on public.sync_records
  for each row execute function public.sync_records_last_write_wins();

-- Live updates: lets the other device hear about changes within a second or two.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sync_records'
  ) then
    alter publication supabase_realtime add table public.sync_records;
  end if;
end;
$$;
