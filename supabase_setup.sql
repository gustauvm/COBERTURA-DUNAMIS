-- Supabase setup for Dunamis app (v4)
-- Execute in Supabase SQL editor

-- 1) Columns used by the app (safe to run if they already exist)
alter table public.colaboradores
    add column if not exists email_login text,
    add column if not exists rotulo text,
    add column if not exists rotulo_inicio text,
    add column if not exists rotulo_fim text,
    add column if not exists rotulo_detalhe text;

alter table public.unidades
    add column if not exists rotulo text,
    add column if not exists rotulo_detalhe text,
    add column if not exists rotulo_responsavel text;

-- 2) Indexes for common lookups
create index if not exists idx_colaboradores_matricula on public.colaboradores (matricula);
create index if not exists idx_colaboradores_re_padrao on public.colaboradores (re_padrao);
create index if not exists idx_colaboradores_re_folha on public.colaboradores (re_folha);
create index if not exists idx_colaboradores_email_login on public.colaboradores (email_login);
create index if not exists idx_colaboradores_posto on public.colaboradores (posto);
create index if not exists idx_unidades_posto on public.unidades (posto);

-- 3) Profiles table for roles and group access
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique,
    role text not null default 'operacional',
    groups text[] not null default '{}',
    display_name text,
    re_padrao text,
    matricula text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_role_check check (role in ('operacional','supervisor','coordenador','gerencia','administrador'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- 4) Helper functions for RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
select exists (
  select 1
  from public.profiles
  where id = auth.uid()
    and role = 'administrador'
);
$$;

create or replace function public.has_edit_role()
returns boolean
language sql
security definer
set search_path = public
as $$
select exists (
  select 1
  from public.profiles
  where id = auth.uid()
    and role in ('supervisor','coordenador','gerencia','administrador')
);
$$;

-- 5) Row Level Security policies
alter table public.profiles enable row level security;
alter table public.colaboradores enable row level security;
alter table public.unidades enable row level security;

-- profiles: self access + admin manage
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid() or public.is_admin());

-- Self-update: users can update their own profile but NOT change role or groups
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and groups = (select p.groups from public.profiles p where p.id = auth.uid())
  );

-- Admin update: admins can fully update any profile
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- colaboradores: read for authenticated, write for edit roles
drop policy if exists "colaboradores read" on public.colaboradores;
create policy "colaboradores read" on public.colaboradores
  for select using (auth.role() = 'authenticated');

drop policy if exists "colaboradores write" on public.colaboradores;
create policy "colaboradores write" on public.colaboradores
  for insert with check (public.has_edit_role());

drop policy if exists "colaboradores update" on public.colaboradores;
create policy "colaboradores update" on public.colaboradores
  for update using (public.has_edit_role())
  with check (public.has_edit_role());

drop policy if exists "colaboradores delete" on public.colaboradores;
create policy "colaboradores delete" on public.colaboradores
  for delete using (public.has_edit_role());

-- unidades: read for authenticated, write for edit roles
drop policy if exists "unidades read" on public.unidades;
create policy "unidades read" on public.unidades
  for select using (auth.role() = 'authenticated');

drop policy if exists "unidades write" on public.unidades;
create policy "unidades write" on public.unidades
  for insert with check (public.has_edit_role());

drop policy if exists "unidades update" on public.unidades;
create policy "unidades update" on public.unidades
  for update using (public.has_edit_role())
  with check (public.has_edit_role());

drop policy if exists "unidades delete" on public.unidades;
create policy "unidades delete" on public.unidades
  for delete using (public.has_edit_role());

-- Optional: to enforce group-based RLS, add a "grupo" column to
-- colaboradores/unidades and compare with profiles.groups.

-- ── NEW TABLES: FT, Avisos, Change History ──

-- 6) FT Launches table
create table if not exists public.ft_launches (
    id text primary key,
    collab_re text not null,
    collab_name text,
    collab_phone text,
    unit_current text,
    unit_target text,
    ft_date text,
    shift text,
    reason text,
    reason_other text,
    reason_raw text,
    reason_detail text,
    covering_re text,
    covering_name text,
    covering_phone text,
    covering_other text,
    notes text,
    "group" text,
    source_group text,
    status text not null default 'pending',
    source text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    requested_at timestamptz,
    created_by text,
    form_link text,
    link_sent_at timestamptz,
    ft_time text
);
-- Ensure ft_date column exists (handles all scenarios: fresh table, legacy "date" rename, or missing column)
do $$
begin
  -- If old "date" column exists, rename it to ft_date
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ft_launches' and column_name = 'date'
  ) then
    alter table public.ft_launches rename column "date" to ft_date;
  end if;
  -- If ft_date still doesn't exist (edge case), add it
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ft_launches' and column_name = 'ft_date'
  ) then
    alter table public.ft_launches add column ft_date text;
  end if;
end $$;

create index if not exists idx_ft_launches_collab_re on public.ft_launches (collab_re);
create index if not exists idx_ft_launches_date on public.ft_launches (ft_date);
create index if not exists idx_ft_launches_status on public.ft_launches (status);

drop trigger if exists set_ft_launches_updated_at on public.ft_launches;
create trigger set_ft_launches_updated_at
before update on public.ft_launches
for each row execute procedure public.set_updated_at();

-- 7) FT Audit Trail table
create table if not exists public.ft_audit_trail (
    id text primary key,
    ts timestamptz not null default now(),
    event text not null,
    origin text,
    actor text,
    prev_status text,
    next_status text,
    note text,
    item jsonb
);
create index if not exists idx_ft_audit_trail_ts on public.ft_audit_trail (ts desc);

-- 8) Avisos table
create table if not exists public.avisos (
    id text primary key,
    "group" text,
    unit text,
    collab_re text,
    collab_name text,
    assigned_to_re text,
    assigned_to_name text,
    priority text not null default 'normal',
    title text,
    message text,
    simple boolean default false,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    created_by text,
    reminder_enabled boolean default false,
    reminder_type text,
    reminder_every text,
    reminder_next_at timestamptz,
    done_at timestamptz,
    done_by text
);
create index if not exists idx_avisos_status on public.avisos (status);
create index if not exists idx_avisos_assigned on public.avisos (assigned_to_re);

-- 9) Change History table
create table if not exists public.change_history (
    id serial primary key,
    data text,
    responsavel text,
    acao text,
    detalhe text,
    target jsonb,
    changes jsonb,
    before_snapshot jsonb,
    after_snapshot jsonb,
    undo jsonb,
    created_at timestamptz not null default now()
);
create index if not exists idx_change_history_created on public.change_history (created_at desc);

-- 10) RLS for new tables
alter table public.ft_launches enable row level security;
alter table public.ft_audit_trail enable row level security;
alter table public.avisos enable row level security;
alter table public.change_history enable row level security;

-- ft_launches: read for authenticated, write for edit roles
drop policy if exists "ft_launches read" on public.ft_launches;
create policy "ft_launches read" on public.ft_launches
  for select using (auth.role() = 'authenticated');

drop policy if exists "ft_launches insert" on public.ft_launches;
create policy "ft_launches insert" on public.ft_launches
  for insert with check (public.has_edit_role());

drop policy if exists "ft_launches update" on public.ft_launches;
create policy "ft_launches update" on public.ft_launches
  for update using (public.has_edit_role())
  with check (public.has_edit_role());

drop policy if exists "ft_launches delete" on public.ft_launches;
create policy "ft_launches delete" on public.ft_launches
  for delete using (public.has_edit_role());

-- ft_audit_trail: read for authenticated, insert for edit roles
drop policy if exists "ft_audit_trail read" on public.ft_audit_trail;
create policy "ft_audit_trail read" on public.ft_audit_trail
  for select using (auth.role() = 'authenticated');

drop policy if exists "ft_audit_trail insert" on public.ft_audit_trail;
create policy "ft_audit_trail insert" on public.ft_audit_trail
  for insert with check (public.has_edit_role());

-- avisos: read for authenticated, write for edit roles
drop policy if exists "avisos read" on public.avisos;
create policy "avisos read" on public.avisos
  for select using (auth.role() = 'authenticated');

drop policy if exists "avisos insert" on public.avisos;
create policy "avisos insert" on public.avisos
  for insert with check (public.has_edit_role());

drop policy if exists "avisos update" on public.avisos;
create policy "avisos update" on public.avisos
  for update using (public.has_edit_role())
  with check (public.has_edit_role());

drop policy if exists "avisos delete" on public.avisos;
create policy "avisos delete" on public.avisos
  for delete using (public.has_edit_role());

-- change_history: read for authenticated, insert for edit roles
drop policy if exists "change_history read" on public.change_history;
create policy "change_history read" on public.change_history
  for select using (auth.role() = 'authenticated');

drop policy if exists "change_history insert" on public.change_history;
create policy "change_history insert" on public.change_history
  for insert with check (public.has_edit_role());

-- 11) App Settings table (key-value store for shared config)
create table if not exists public.app_settings (
    key text primary key,
    value jsonb not null default '{}',
    updated_at timestamptz not null default now(),
    updated_by text
);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute procedure public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings read" on public.app_settings;
create policy "app_settings read" on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "app_settings write" on public.app_settings;
create policy "app_settings write" on public.app_settings
  for insert with check (public.has_edit_role());

drop policy if exists "app_settings update" on public.app_settings;
create policy "app_settings update" on public.app_settings
  for update using (public.has_edit_role())
  with check (public.has_edit_role());

drop policy if exists "app_settings delete" on public.app_settings;
create policy "app_settings delete" on public.app_settings
  for delete using (public.is_admin());

-- 12) Enable realtime for new tables
alter publication supabase_realtime add table public.ft_launches;
alter publication supabase_realtime add table public.avisos;
alter publication supabase_realtime add table public.change_history;
alter publication supabase_realtime add table public.app_settings;
