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

-- Shared therapist-authored movement references. These are intentionally
-- independent of a patient plan so saving a recording makes it reusable.
create table if not exists public.exercise_references (
  id uuid primary key default gen_random_uuid(),
  therapist text not null check (char_length(therapist) between 1 and 80),
  reference jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists clinic_sessions_clinic_recorded_idx
  on public.clinic_sessions (clinic_code, recorded_at desc);

create table if not exists public.clinic_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_code text not null references public.clinic_plans (clinic_code) on delete cascade,
  patient_name text not null check (char_length(patient_name) between 1 and 80),
  sender text not null check (sender in ('patient', 'therapist')),
  body text not null check (char_length(body) between 1 and 1000),
  sent_at timestamptz not null default now()
);

create index if not exists clinic_messages_clinic_sent_idx
  on public.clinic_messages (clinic_code, sent_at desc);

create index if not exists clinic_messages_thread_idx
  on public.clinic_messages (clinic_code, patient_name, sent_at);

alter table public.clinic_plans enable row level security;
alter table public.clinic_sessions enable row level security;
alter table public.clinic_messages enable row level security;
alter table public.exercise_references enable row level security;

grant select, insert, update on public.clinic_plans to anon, authenticated;
grant select, insert on public.clinic_sessions to anon, authenticated;
grant select, insert on public.clinic_messages to anon, authenticated;
grant select, insert on public.exercise_references to anon, authenticated;

drop policy if exists clinic_plans_select on public.clinic_plans;
drop policy if exists clinic_plans_insert on public.clinic_plans;
drop policy if exists clinic_plans_update on public.clinic_plans;
drop policy if exists clinic_sessions_select on public.clinic_sessions;
drop policy if exists clinic_sessions_insert on public.clinic_sessions;
drop policy if exists clinic_messages_select on public.clinic_messages;
drop policy if exists clinic_messages_insert on public.clinic_messages;
drop policy if exists exercise_references_select on public.exercise_references;
drop policy if exists exercise_references_insert on public.exercise_references;

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

create policy clinic_messages_select
  on public.clinic_messages
  for select
  to anon, authenticated
  using (true);

create policy clinic_messages_insert
  on public.clinic_messages
  for insert
  to anon, authenticated
  with check (true);

create policy exercise_references_select
  on public.exercise_references
  for select
  to anon, authenticated
  using (true);

create policy exercise_references_insert
  on public.exercise_references
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

  if not exists (
    select 1
    from pg_publication_rel prel
    join pg_publication pub on pub.oid = prel.prpubid
    join pg_class rel on rel.oid = prel.prrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and rel.relname = 'clinic_messages'
  ) then
    alter publication supabase_realtime add table public.clinic_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_rel prel
    join pg_publication pub on pub.oid = prel.prpubid
    join pg_class rel on rel.oid = prel.prrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and rel.relname = 'exercise_references'
  ) then
    alter publication supabase_realtime add table public.exercise_references;
  end if;
end $$;
