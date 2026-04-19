begin;

drop policy if exists "colaboradores public read" on public.colaboradores;
drop policy if exists "unidades public read" on public.unidades;
drop table if exists public.colaboradores cascade;
drop table if exists public.unidades cascade;
drop table if exists public.sheet_sync_runs cascade;

create table public.colaboradores (
    sheet_sync_key text primary key,
    spreadsheet_id text,
    source_row_index integer,
    re_novo text,
    re_padrao text,
    matricula text,
    colaborador text,
    posto text,
    cargo text,
    escala text,
    turno text,
    admissao text,
    telefone text,
    cpf text,
    rg text,
    pis text,
    ctps_numero text,
    ctps_serie text,
    data_nascimento text,
    idade text,
    endereco text,
    telefone_de_emergencia text,
    empresa text,
    cliente text,
    unidade_de_negocio text,
    turma text,
    ferias text,
    reciclagem_vigilante text,
    numeracao_cnv text,
    cnv_vigilante text,
    uniforme text,
    aso text,
    reciclagem_bombeiro text,
    nr10 text,
    nr20 text,
    nr33 text,
    nr35 text,
    dea text,
    heliponto text,
    suspensao text,
    advertencia text,
    recolhimento text,
    observacoes text,
    pasta_google_drive text,
    coluna_vazia_42 text,
    coluna_vazia_43 text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.unidades (
    sheet_sync_key text primary key,
    spreadsheet_id text,
    source_row_index integer,
    posto text,
    unidade_de_negocio_vigilancia text,
    unidade_de_negocio_servicos text,
    unidade_de_negocio_rb text,
    empresa_bombeiros text,
    pcmso text,
    pgr text,
    refeicao_no_local text,
    intrajornada text,
    modalidade_aso text,
    modalidade_reciclagem_de_bombeiros text,
    heliponto_na_unidade text,
    cliente text,
    empresa_servicos text,
    empresa_seguranca text,
    empresa_rb text,
    endereco text,
    numero text,
    bairro text,
    cep text,
    cidade text,
    estado text,
    data_de_implantacao text,
    email_supervisor_da_unidade text,
    email_sesmt text,
    obrasoft text,
    terminal_nexti text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.sheet_sync_runs (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    source text not null default 'google_sheets',
    mode text not null,
    status text not null default 'success',
    spreadsheet_id text,
    sheet_name text,
    received_count integer not null default 0,
    inserted_count integer not null default 0,
    updated_count integer not null default 0,
    skipped_count integer not null default 0,
    error_message text
);

create index idx_colaboradores_re_padrao on public.colaboradores (re_padrao);
create index idx_colaboradores_matricula on public.colaboradores (matricula);
create index idx_colaboradores_posto on public.colaboradores (posto);
create index idx_unidades_posto on public.unidades (posto);
create index idx_sheet_sync_runs_created_at on public.sheet_sync_runs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_colaboradores_updated_at on public.colaboradores;
create trigger set_colaboradores_updated_at
before update on public.colaboradores
for each row execute procedure public.set_updated_at();

drop trigger if exists set_unidades_updated_at on public.unidades;
create trigger set_unidades_updated_at
before update on public.unidades
for each row execute procedure public.set_updated_at();

alter table public.colaboradores enable row level security;
alter table public.unidades enable row level security;
alter table public.sheet_sync_runs enable row level security;

create policy "colaboradores public read" on public.colaboradores
for select using (auth.role() in ('anon', 'authenticated'));

create policy "unidades public read" on public.unidades
for select using (auth.role() in ('anon', 'authenticated'));

alter table public.colaboradores replica identity full;
alter table public.unidades replica identity full;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'colaboradores'
        ) then
            alter publication supabase_realtime add table public.colaboradores;
        end if;

        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = 'unidades'
        ) then
            alter publication supabase_realtime add table public.unidades;
        end if;
    end if;
end;
$$;

commit;
