begin;

-- Tabelas legadas e não usadas pelo fluxo atual da planilha/site.
-- Mantidas fora desta lista por enquanto:
-- - app_settings
-- - avisos
-- - change_history
-- - ft_audit_trail
-- - ft_launches
-- - profiles
-- - colaboradores
-- - unidades
-- - sheet_sync_runs
--
-- Motivo: essas tabelas ainda aparecem no app.js ou são parte do fluxo
-- principal de operação. Só remova depois de remover as dependências no front.

drop table if exists public.sheet_sync_mirror_rows cascade;
drop table if exists public.analytics_snapshots cascade;
drop table if exists public.force_map_snapshots cascade;
drop table if exists public.troca_launches cascade;
drop table if exists public.unit_capacity_models cascade;
drop table if exists public.vehicle_incidents cascade;

commit;
