import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type JsonRecord = Record<string, unknown>;
type SyncMode = "row" | "full" | "reconcile";
type TargetTable = "colaboradores" | "unidades";

type SyncRequest = {
  mode?: SyncMode;
  row?: JsonRecord;
  rows?: JsonRecord[];
  activeKeys?: string[];
  spreadsheetId?: string;
  sheetName?: string;
  dryRun?: boolean;
  allowSmallReconcile?: boolean;
};

type SyncResult = {
  action: "inserted" | "updated" | "skipped";
  key: string;
  target: TargetTable;
  reason?: string;
};

type ReconcileResult = {
  action: "reconciled";
  target: TargetTable;
  active: number;
  existing: number;
  deleted: number;
  missing: number;
  deletedKeys: string[];
  missingKeys: string[];
  dryRun: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHEET_CONFIGS = {
  "(COLABORADORES) BD": {
    table: "colaboradores" as const,
    keyColumn: "matricula",
    keyLabel: "MATRÍCULA",
    keyPrefix: "colaborador|matricula:",
    minReconcileKeys: 100,
  },
  "(UNIDADES) BD": {
    table: "unidades" as const,
    keyColumn: "posto",
    keyLabel: "posto",
    keyPrefix: "unidade|posto:",
    minReconcileKeys: 5,
  },
} as const;

type SheetName = keyof typeof SHEET_CONFIGS;

type SheetConfig = typeof SHEET_CONFIGS[SheetName];

const HEADER_MAP = new Map<string, string>([
  ["sync_key", "sheet_sync_key"],
  ["re_novo", "re_novo"],
  ["re_padrao", "re_padrao"],
  ["matricula", "matricula"],
  ["colaborador", "colaborador"],
  ["posto", "posto"],
  ["cargo", "cargo"],
  ["escala", "escala"],
  ["turno", "turno"],
  ["admissao", "admissao"],
  ["telefone", "telefone"],
  ["cpf", "cpf"],
  ["rg", "rg"],
  ["pis", "pis"],
  ["ctps_numero", "ctps_numero"],
  ["ctps_serie", "ctps_serie"],
  ["data_nascimento", "data_nascimento"],
  ["idade", "idade"],
  ["endereco", "endereco"],
  ["telefone_de_emergenca", "telefone_de_emergencia"],
  ["telefone_de_emergencia", "telefone_de_emergencia"],
  ["empresa", "empresa"],
  ["cliente", "cliente"],
  ["unidade_de_negocio", "unidade_de_negocio"],
  ["turma", "turma"],
  ["ferias", "ferias"],
  ["reciclagem_vigilante", "reciclagem_vigilante"],
  ["numeracao_cnv", "numeracao_cnv"],
  ["cnv_vigilante", "cnv_vigilante"],
  ["uniforme", "uniforme"],
  ["aso", "aso"],
  ["reciclagem_bombeiro", "reciclagem_bombeiro"],
  ["nr10", "nr10"],
  ["nr20", "nr20"],
  ["nr33", "nr33"],
  ["nr35", "nr35"],
  ["dea", "dea"],
  ["heliponto", "heliponto"],
  ["suspensao", "suspensao"],
  ["advertencia", "advertencia"],
  ["recolhimento", "recolhimento"],
  ["observacoes", "observacoes"],
  ["pasta_google_drive", "pasta_google_drive"],
  ["coluna_vazia_42", "coluna_vazia_42"],
  ["coluna_vazia_43", "coluna_vazia_43"],
  ["unidade_de_negocio_vigilancia", "unidade_de_negocio_vigilancia"],
  ["unidade_de_negocio_servicos", "unidade_de_negocio_servicos"],
  ["unidade_de_negocio_rb", "unidade_de_negocio_rb"],
  ["empresa_bombeiros", "empresa_bombeiros"],
  ["pcmso", "pcmso"],
  ["pgr", "pgr"],
  ["refeicao_no_local", "refeicao_no_local"],
  ["intrajornada", "intrajornada"],
  ["modalidade_aso", "modalidade_aso"],
  ["modalidade_reciclagem_de_bombeiros", "modalidade_reciclagem_de_bombeiros"],
  ["heliponto_na_unidade", "heliponto_na_unidade"],
  ["empresa_servicos", "empresa_servicos"],
  ["empresa_seguranca", "empresa_seguranca"],
  ["empresa_rb", "empresa_rb"],
  ["numero", "numero"],
  ["bairro", "bairro"],
  ["cep", "cep"],
  ["cidade", "cidade"],
  ["estado", "estado"],
  ["data_de_implantacao", "data_de_implantacao"],
  ["email_supervisor_da_unidade", "email_supervisor_da_unidade"],
  ["email_sesmt", "email_sesmt"],
  ["obrasoft", "obrasoft"],
  ["terminal_nexti", "terminal_nexti"],
]);

function jsonResponse(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function normalizeHeader(value: string) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized || "";
}

function normalizeCell(value: unknown) {
  const text = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
  return text || null;
}

function normalizeKeyPart(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildStableKey(config: SheetConfig, value: unknown) {
  const keyPart = normalizeKeyPart(value);
  return keyPart ? `${config.keyPrefix}${keyPart}` : null;
}

function isStableKeyForConfig(config: SheetConfig, key: string) {
  return String(key || "").startsWith(config.keyPrefix);
}

function getSheetConfig(sheetName?: string): SheetConfig | null {
  if (!sheetName || !(sheetName in SHEET_CONFIGS)) return null;
  return SHEET_CONFIGS[sheetName as SheetName];
}

function buildMirrorPayload(row: JsonRecord, spreadsheetId?: string, rowIndex?: number | null) {
  const payload: JsonRecord = {
    spreadsheet_id: spreadsheetId ?? null,
    source_row_index: rowIndex ?? null,
  };

  let blankColumnCount = 0;
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const originalKey = String(rawKey || "").trim();
    const normalizedValue = normalizeCell(rawValue);

    if (!originalKey) continue;
    if (originalKey === "__rowIndex") continue;

    let normalizedKey = normalizeHeader(originalKey);
    if (!normalizedKey) {
      blankColumnCount += 1;
      normalizedKey = `coluna_vazia_${41 + blankColumnCount}`;
    }

    const dbColumn = HEADER_MAP.get(normalizedKey) || normalizedKey;
    payload[dbColumn] = normalizedValue;
  }

  return payload;
}

async function findExisting(
  client: ReturnType<typeof createClient>,
  table: TargetTable,
  sheetSyncKey: string,
) {
  const { data, error } = await client
    .from(table)
    .select("sheet_sync_key")
    .eq("sheet_sync_key", sheetSyncKey)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function syncRow(
  client: ReturnType<typeof createClient>,
  params: {
    config: SheetConfig;
    spreadsheetId?: string;
    rowIndex?: number | null;
    row: JsonRecord;
    dryRun?: boolean;
  },
): Promise<SyncResult> {
  const payload = buildMirrorPayload(params.row, params.spreadsheetId, params.rowIndex);
  const sheetSyncKey = buildStableKey(params.config, payload[params.config.keyColumn]);

  if (!sheetSyncKey) {
    return {
      action: "skipped",
      key: "no-stable-key",
      target: params.config.table,
      reason: `Linha sem ${params.config.keyLabel}`,
    };
  }

  payload.sheet_sync_key = sheetSyncKey;

  const existing = await findExisting(client, params.config.table, sheetSyncKey);
  if (params.dryRun) {
    return {
      action: existing ? "updated" : "inserted",
      key: sheetSyncKey,
      target: params.config.table,
    };
  }

  const { error } = await client
    .from(params.config.table)
    .upsert(payload, { onConflict: "sheet_sync_key" });

  if (error) throw error;

  return {
    action: existing ? "updated" : "inserted",
    key: sheetSyncKey,
    target: params.config.table,
  };
}

async function syncRowsBatch(
  client: ReturnType<typeof createClient>,
  params: {
    config: SheetConfig;
    spreadsheetId?: string;
    rows: JsonRecord[];
    dryRun?: boolean;
  },
): Promise<SyncResult[]> {
  const prepared: Array<{ key: string; payload: JsonRecord }> = [];
  const results: SyncResult[] = [];
  const seen = new Set<string>();

  for (const row of params.rows) {
    const payload = buildMirrorPayload(
      row,
      params.spreadsheetId,
      row.__rowIndex ? Number(row.__rowIndex) : null,
    );
    const sheetSyncKey = buildStableKey(params.config, payload[params.config.keyColumn]);

    if (!sheetSyncKey) {
      results.push({
        action: "skipped",
        key: "no-stable-key",
        target: params.config.table,
        reason: `Linha sem ${params.config.keyLabel}`,
      });
      continue;
    }

    if (seen.has(sheetSyncKey)) {
      results.push({
        action: "skipped",
        key: sheetSyncKey,
        target: params.config.table,
        reason: `Chave duplicada no mesmo lote: ${sheetSyncKey}`,
      });
      continue;
    }

    seen.add(sheetSyncKey);
    payload.sheet_sync_key = sheetSyncKey;
    prepared.push({ key: sheetSyncKey, payload });
  }

  if (!prepared.length) return results;

  const keys = prepared.map((item) => item.key);
  const { data: existingRows, error: existingError } = await client
    .from(params.config.table)
    .select("sheet_sync_key")
    .in("sheet_sync_key", keys);

  if (existingError) throw existingError;

  const existingSet = new Set(
    (existingRows || []).map((row: JsonRecord) => String(row.sheet_sync_key || "")),
  );

  if (!params.dryRun) {
    const { error } = await client
      .from(params.config.table)
      .upsert(prepared.map((item) => item.payload), { onConflict: "sheet_sync_key" });

    if (error) throw error;
  }

  for (const item of prepared) {
    results.push({
      action: existingSet.has(item.key) ? "updated" : "inserted",
      key: item.key,
      target: params.config.table,
    });
  }

  return results;
}

function uniqueStableKeys(config: SheetConfig, activeKeys?: string[]) {
  const seen = new Set<string>();
  const keys: string[] = [];
  const invalid: string[] = [];

  for (const rawKey of activeKeys || []) {
    const key = String(rawKey || "").trim();
    if (!key) continue;
    if (!isStableKeyForConfig(config, key)) {
      invalid.push(key);
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }

  return { keys, invalid };
}

async function deleteKeysInChunks(
  client: ReturnType<typeof createClient>,
  table: TargetTable,
  keys: string[],
) {
  const chunkSize = 200;
  for (let index = 0; index < keys.length; index += chunkSize) {
    const chunk = keys.slice(index, index + chunkSize);
    const { error } = await client.from(table).delete().in("sheet_sync_key", chunk);
    if (error) throw error;
  }
}

async function selectAllSyncKeys(
  client: ReturnType<typeof createClient>,
  table: TargetTable,
) {
  const pageSize = 1000;
  let from = 0;
  const keys: string[] = [];

  while (true) {
    const { data, error } = await client
      .from(table)
      .select("sheet_sync_key")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const chunk = data || [];
    for (const row of chunk) {
      const key = String((row as JsonRecord).sheet_sync_key || "").trim();
      if (key) keys.push(key);
    }

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return keys;
}

async function reconcileSheet(
  client: ReturnType<typeof createClient>,
  params: {
    config: SheetConfig;
    activeKeys?: string[];
    dryRun?: boolean;
    allowSmallReconcile?: boolean;
  },
): Promise<ReconcileResult> {
  const { keys, invalid } = uniqueStableKeys(params.config, params.activeKeys);

  if (invalid.length) {
    throw new Error(`Chaves invalidas para ${params.config.table}: ${invalid.slice(0, 5).join(", ")}`);
  }

  if (!params.allowSmallReconcile && keys.length < params.config.minReconcileKeys) {
    throw new Error(
      `Reconcile bloqueado: ${keys.length} chaves recebidas para ${params.config.table}. Minimo seguro: ${params.config.minReconcileKeys}.`,
    );
  }

  const existingKeys = await selectAllSyncKeys(client, params.config.table);
  const activeSet = new Set(keys);
  const existingSet = new Set(existingKeys);
  const deletedKeys = existingKeys.filter((key) => !activeSet.has(key));
  const missingKeys = keys.filter((key) => !existingSet.has(key));

  if (!params.dryRun && deletedKeys.length) {
    await deleteKeysInChunks(client, params.config.table, deletedKeys);
  }

  return {
    action: "reconciled",
    target: params.config.table,
    active: keys.length,
    existing: existingKeys.length,
    deleted: deletedKeys.length,
    missing: missingKeys.length,
    deletedKeys: deletedKeys.slice(0, 500),
    missingKeys: missingKeys.slice(0, 500),
    dryRun: params.dryRun === true,
  };
}

async function logSyncRun(
  client: ReturnType<typeof createClient>,
  payload: {
    mode: string;
    spreadsheetId?: string;
    sheetName?: string;
    received: number;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
    note?: string;
  },
) {
  try {
    const messages = [...payload.errors];
    if (payload.note) messages.push(payload.note);

    await client.from("sheet_sync_runs").insert({
      source: "google_sheets",
      mode: payload.mode,
      spreadsheet_id: payload.spreadsheetId ?? null,
      sheet_name: payload.sheetName ?? null,
      received_count: payload.received,
      inserted_count: payload.inserted,
      updated_count: payload.updated,
      skipped_count: payload.skipped,
      error_message: messages.length ? messages.join(" | ").slice(0, 4000) : null,
      status: payload.errors.length ? "partial" : "success",
    });
  } catch {
    // best effort
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const sharedSecret = Deno.env.get("SHEET_SYNC_SHARED_SECRET");
  const authHeader = request.headers.get("authorization") || "";
  if (!sharedSecret || authHeader !== `Bearer ${sharedSecret}`) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: "Missing Supabase secrets" });
  }

  let body: SyncRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const config = getSheetConfig(body.sheetName);
  if (!config) {
    return jsonResponse(400, {
      error: "sheetName invalido",
      supportedSheets: Object.keys(SHEET_CONFIGS),
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (body.mode === "reconcile") {
    try {
      const result = await reconcileSheet(client, {
        config,
        activeKeys: body.activeKeys,
        dryRun: body.dryRun === true,
        allowSmallReconcile: body.allowSmallReconcile === true,
      });

      await logSyncRun(client, {
        mode: "reconcile",
        spreadsheetId: body.spreadsheetId,
        sheetName: body.sheetName,
        received: result.active,
        inserted: 0,
        updated: 0,
        skipped: result.deleted,
        errors: [],
        note: `deleted=${result.deleted}; missing=${result.missing}`,
      });

      return jsonResponse(200, { ok: true, sheetName: body.sheetName, reconcile: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await logSyncRun(client, {
        mode: "reconcile",
        spreadsheetId: body.spreadsheetId,
        sheetName: body.sheetName,
        received: Array.isArray(body.activeKeys) ? body.activeKeys.length : 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [message],
      });
      return jsonResponse(500, { ok: false, error: message });
    }
  }

  const rows = body.mode === "full"
    ? (Array.isArray(body.rows) ? body.rows : [])
    : (body.row ? [body.row] : []);

  if (!rows.length) {
    return jsonResponse(400, { error: "No rows provided" });
  }

  const results: SyncResult[] = [];
  const errors: string[] = [];

  try {
    results.push(...await syncRowsBatch(client, {
      config,
      spreadsheetId: body.spreadsheetId,
      rows,
      dryRun: body.dryRun === true,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
    results.push({
      action: "skipped",
      key: "batch",
      target: config.table,
      reason: message,
    });
  }

  const inserted = results.filter((item) => item.action === "inserted").length;
  const updated = results.filter((item) => item.action === "updated").length;
  const skipped = results.filter((item) => item.action === "skipped").length;

  await logSyncRun(client, {
    mode: body.mode || "row",
    spreadsheetId: body.spreadsheetId,
    sheetName: body.sheetName,
    received: rows.length,
    inserted,
    updated,
    skipped,
    errors,
  });

  return jsonResponse(errors.length && inserted + updated === 0 ? 500 : 200, {
    ok: inserted > 0 || updated > 0 || skipped > 0,
    sheetName: body.sheetName,
    received: rows.length,
    inserted,
    updated,
    skipped,
    errors,
    results,
  });
});
