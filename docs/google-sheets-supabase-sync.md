# Google Sheets -> Edge Function -> Supabase

## Escopo

Esta integração cobre as duas abas oficiais da planilha:

- `(COLABORADORES) BD`
- `(UNIDADES) BD`

As tabelas `public.colaboradores` e `public.unidades` passam a espelhar diretamente essas abas. O banco deixa de ser "adaptado ao site" e vira "adaptado à planilha".

## O que fica salvo no Supabase

- `public.colaboradores`: espelho da aba `(COLABORADORES) BD`
- `public.unidades`: espelho da aba `(UNIDADES) BD`
- `public.sheet_sync_runs`: histórico da sincronização

## Ordem de implantação

1. Rodar o SQL em `supabase/sql/sheet_sync_setup.sql`.
2. Criar o secret customizado da Edge Function:
   - `SHEET_SYNC_SHARED_SECRET`
3. Publicar a função `supabase/functions/sheet-sync-colaboradores/index.ts`.
4. Colar `docs/AUTOMATIZAÇÃO SUPABASE.gs` no Apps Script da planilha.
5. Confirmar que `SUPABASE_SYNC_URL` e `SUPABASE_SYNC_SECRET` estão corretos.
6. Criar trigger instalável `On edit` para `aoEditarPlanilha`.
7. Manter a carga completa pelo importador local `npm run sync:sheet` quando precisar reconciliar a base inteira.

## Comandos de deploy

```bash
supabase secrets set SHEET_SYNC_SHARED_SECRET=d3e3f6aa1d5f09ddcd1ae0e404780c1fa83b1d59932926b6bdf034e625ad0bb7
supabase functions deploy sheet-sync-colaboradores --no-verify-jwt
```

## URL final da função

Use este formato no Apps Script:

```text
https://bvpcbviggbxnpqoprnxq.supabase.co/functions/v1/sheet-sync-colaboradores
```

## Como funciona

- A planilha continua sendo o único lugar de edição.
- O Apps Script envia cada alteração automaticamente para a Edge Function via `aoEditarPlanilha`.
- A Edge Function faz `upsert` direto em `public.colaboradores` ou `public.unidades`.
- O site continua lendo essas tabelas no `Supabase`.
- O sync é baseado nos nomes dos cabeçalhos da linha 1, então a ordem das colunas pode mudar sem quebrar a integração.
- A chave usada no Supabase é baseada no nome da aba e no número da linha, no formato `aba|row:numero`.
- A carga completa inicial e reconciliações grandes devem ser feitas pelo PC, não pelo Apps Script.

## Observações importantes

- O banco fica alinhado à planilha, não ao modelo antigo do site.
- O espelho salva os valores exibidos na planilha, não a fórmula original.
- A primeira versão não remove automaticamente registros apagados da planilha.
- A carga agendada serve como reconciliação para corrigir falhas de edição em lote, colagens grandes e erros temporários.

## Próximo passo recomendado

Depois de validar a sincronização das duas abas, o próximo ajuste é desativar no site qualquer edição manual de base para evitar conflito com a planilha.
