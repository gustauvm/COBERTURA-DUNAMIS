begin;

create extension if not exists pgcrypto;

create table if not exists public.formalizacoes_postos (
    id uuid primary key default gen_random_uuid(),
    protocolo text not null unique,
    tipo text not null,
    status text not null default 'registrado',
    prioridade text not null default 'normal',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    solicitante_nome text not null,
    solicitante_cargo text not null,
    solicitante_telefone text,
    solicitante_email text,
    colaborador_matricula text,
    colaborador_re text,
    colaborador_nome text not null,
    colaborador_cargo text,
    posto_atual text,
    posto_destino text,
    data_efetiva date,
    data_fim date,
    motivo_categoria text,
    motivo_observacao text,
    beneficios_json jsonb not null default '{}'::jsonb,
    cobertura_json jsonb not null default '{}'::jsonb,
    snapshot_json jsonb not null default '{}'::jsonb,
    email_subject text,
    email_body text,
    whatsapp_text text
);

create table if not exists public.formalizacoes_status_events (
    id bigint generated always as identity primary key,
    formalizacao_id uuid not null references public.formalizacoes_postos(id) on delete cascade,
    status_anterior text,
    status_novo text not null,
    ator_nome text,
    observacao text,
    created_at timestamptz not null default now()
);

-- Limpeza destrutiva e controlada apenas do Formalizador.
-- Não toca colaboradores, unidades, planilha ou sincronização Google Sheets -> Supabase.
truncate table public.formalizacoes_status_events, public.formalizacoes_postos restart identity cascade;

alter table public.formalizacoes_postos
    alter column status set default 'registrado';

alter table public.formalizacoes_postos
    drop constraint if exists formalizacoes_postos_tipo_check,
    drop constraint if exists formalizacoes_postos_status_check,
    drop constraint if exists formalizacoes_postos_prioridade_check;

alter table public.formalizacoes_status_events
    drop constraint if exists formalizacoes_status_events_status_anterior_check,
    drop constraint if exists formalizacoes_status_events_status_novo_check;

alter table public.formalizacoes_postos
    add constraint formalizacoes_postos_tipo_check check (
        tipo in ('troca_posto', 'remanejamento', 'desligamento', 'termino_experiencia', 'alteracao_beneficios', 'cobertura')
    ),
    add constraint formalizacoes_postos_status_check check (
        status in ('registrado', 'em_analise', 'aguardando_dp', 'aguardando_operacao', 'aprovado', 'executado', 'cancelado')
    ),
    add constraint formalizacoes_postos_prioridade_check check (
        prioridade in ('baixa', 'normal', 'alta', 'urgente')
    );

alter table public.formalizacoes_status_events
    add constraint formalizacoes_status_events_status_anterior_check check (
        status_anterior is null
        or status_anterior in ('registrado', 'em_analise', 'aguardando_dp', 'aguardando_operacao', 'aprovado', 'executado', 'cancelado')
    ),
    add constraint formalizacoes_status_events_status_novo_check check (
        status_novo in ('registrado', 'em_analise', 'aguardando_dp', 'aguardando_operacao', 'aprovado', 'executado', 'cancelado')
    );

create index if not exists idx_formalizacoes_postos_created_at on public.formalizacoes_postos (created_at desc);
create index if not exists idx_formalizacoes_postos_protocolo on public.formalizacoes_postos (protocolo);
create index if not exists idx_formalizacoes_postos_status on public.formalizacoes_postos (status);
create index if not exists idx_formalizacoes_postos_tipo on public.formalizacoes_postos (tipo);
create index if not exists idx_formalizacoes_postos_colaborador on public.formalizacoes_postos (colaborador_matricula, colaborador_re, colaborador_nome);
create index if not exists idx_formalizacoes_postos_postos on public.formalizacoes_postos (posto_atual, posto_destino);
create index if not exists idx_formalizacoes_status_events_formalizacao on public.formalizacoes_status_events (formalizacao_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_formalizacoes_postos_updated_at on public.formalizacoes_postos;
create trigger set_formalizacoes_postos_updated_at
before update on public.formalizacoes_postos
for each row execute procedure public.set_updated_at();

alter table public.formalizacoes_postos enable row level security;
alter table public.formalizacoes_status_events enable row level security;

drop policy if exists "formalizacoes public read" on public.formalizacoes_postos;
drop policy if exists "formalizacoes public insert" on public.formalizacoes_postos;
drop policy if exists "formalizacoes public status update" on public.formalizacoes_postos;
drop policy if exists "formalizacoes events public read" on public.formalizacoes_status_events;
drop policy if exists "formalizacoes events public insert" on public.formalizacoes_status_events;

create policy "formalizacoes public read" on public.formalizacoes_postos
for select using (auth.role() in ('anon', 'authenticated'));

create policy "formalizacoes public insert" on public.formalizacoes_postos
for insert with check (
    auth.role() in ('anon', 'authenticated')
    and status in ('registrado', 'em_analise', 'aguardando_dp', 'aguardando_operacao', 'aprovado', 'executado', 'cancelado')
);

create policy "formalizacoes public status update" on public.formalizacoes_postos
for update using (auth.role() in ('anon', 'authenticated'))
with check (
    auth.role() in ('anon', 'authenticated')
    and status in ('registrado', 'em_analise', 'aguardando_dp', 'aguardando_operacao', 'aprovado', 'executado', 'cancelado')
);

create policy "formalizacoes events public read" on public.formalizacoes_status_events
for select using (auth.role() in ('anon', 'authenticated'));

create policy "formalizacoes events public insert" on public.formalizacoes_status_events
for insert with check (auth.role() in ('anon', 'authenticated'));

revoke all on table public.formalizacoes_postos from anon, authenticated;
revoke all on table public.formalizacoes_status_events from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.formalizacoes_postos to anon, authenticated;
grant update (status) on table public.formalizacoes_postos to anon, authenticated;
grant select, insert on table public.formalizacoes_status_events to anon, authenticated;
grant usage, select on sequence public.formalizacoes_status_events_id_seq to anon, authenticated;

alter table public.formalizacoes_postos replica identity full;
alter table public.formalizacoes_status_events replica identity full;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'formalizacoes_postos') then
            alter publication supabase_realtime add table public.formalizacoes_postos;
        end if;
        if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'formalizacoes_status_events') then
            alter publication supabase_realtime add table public.formalizacoes_status_events;
        end if;
    end if;
end;
$$;

commit;
