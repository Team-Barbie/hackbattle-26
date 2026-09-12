-- PhysioLoop clinic sync
-- Paste into the Supabase SQL editor for the project in .env, then Run.

create table if not exists public.clinic_plans (
  clinic_code text primary key
    check (char_length(clinic_code) between 1 and 32)
    check (clinic_code = lower(clinic_code)),
  therapist text not null,
  title text not null,
  plan jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_sessions (
  id uuid primary key default gen_random_uuid(),
  clinic_code text not null references public.clinic_plans (clinic_code) on delete cascade,
  patient_name text not null check (char_length(patient_name) between 1 and 80),
  recorded_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists clinic_sessions_clinic_recorded_idx
  on public.clinic_sessions (clinic_code, recorded_at desc);

alter table public.clinic_plans enable row level security;
alter table public.clinic_sessions enable row level security;

grant select, insert, update on public.clinic_plans to anon, authenticated;
grant select, insert on public.clinic_sessions to anon, authenticated;

drop policy if exists clinic_plans_select on public.clinic_plans;
drop policy if exists clinic_plans_insert on public.clinic_plans;
drop policy if exists clinic_plans_update on public.clinic_plans;
drop policy if exists clinic_sessions_select on public.clinic_sessions;
drop policy if exists clinic_sessions_insert on public.clinic_sessions;

create policy clinic_plans_select
  on public.clinic_plans
  for select
  to anon, authenticated
  using (true);

create policy clinic_plans_insert
  on public.clinic_plans
  for insert
  to anon, authenticated
  with check (true);

create policy clinic_plans_update
  on public.clinic_plans
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy clinic_sessions_select
  on public.clinic_sessions
  for select
  to anon, authenticated
  using (true);

create policy clinic_sessions_insert
  on public.clinic_sessions
  for insert
  to anon, authenticated
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel prel
    join pg_publication pub on pub.oid = prel.prpubid
    join pg_class rel on rel.oid = prel.prrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and rel.relname = 'clinic_plans'
  ) then
    alter publication supabase_realtime add table public.clinic_plans;
  end if;

  if not exists (
    select 1
    from pg_publication_rel prel
    join pg_publication pub on pub.oid = prel.prpubid
    join pg_class rel on rel.oid = prel.prrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and rel.relname = 'clinic_sessions'
  ) then
    alter publication supabase_realtime add table public.clinic_sessions;
  end if;
end $$;
