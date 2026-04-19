const SUPABASE_SYNC_URL = 'https://bvpcbviggbxnpqoprnxq.supabase.co/functions/v1/sheet-sync-colaboradores';
const SUPABASE_SYNC_SECRET = 'd3e3f6aa1d5f09ddcd1ae0e404780c1fa83b1d59932926b6bdf034e625ad0bb7';

const SUPABASE_HEADER_ROW = 1;
const SUPABASE_MAX_BATCH_SIZE = 100;

const SUPABASE_SHEETS = [
  {
    name: '(COLABORADORES) BD',
    keyLabel: 'MATRÍCULA',
    keyHeaders: ['MATRÍCULA', 'MATRICULA'],
    keyPrefix: 'colaborador|matricula:',
    minKeys: 100,
  },
  {
    name: '(UNIDADES) BD',
    keyLabel: 'posto',
    keyHeaders: ['posto'],
    keyPrefix: 'unidade|posto:',
    minKeys: 5,
  },
];

function sincronizarEdicaoSupabase(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const config = getSupabaseSheetConfig_(sheet.getName());
  if (!config) return;
  if (e.range.getRow() <= SUPABASE_HEADER_ROW) return;

  const startRow = Math.max(SUPABASE_HEADER_ROW + 1, e.range.getRow());
  const endRow = e.range.getLastRow();
  sincronizarLinhasSupabase_(sheet, startRow, endRow);
}

function aoMudarEstruturaSupabase(e) {
  reconciliarSupabaseAgora();
}

function reconciliarSupabaseAgora() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  SUPABASE_SHEETS.forEach(function (config) {
    const sheet = spreadsheet.getSheetByName(config.name);
    if (!sheet) return;
    reconciliarAbaSupabase_(sheet, config);
  });
}

function sincronizarBaseCompletaSupabaseAgora() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  SUPABASE_SHEETS.forEach(function (config) {
    const sheet = spreadsheet.getSheetByName(config.name);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow > SUPABASE_HEADER_ROW) {
      sincronizarLinhasSupabase_(sheet, SUPABASE_HEADER_ROW + 1, lastRow);
    }

    reconciliarAbaSupabase_(sheet, config);
  });
}

function reconciliarAbaSupabase_(sheet, config) {
  const scan = coletarChavesAtivasSupabase_(sheet, config);

  if (scan.keys.length < config.minKeys) {
    throw new Error(
      'Reconciliação bloqueada em ' + config.name + ': só encontrei ' + scan.keys.length +
      ' chaves. Confira o cabeçalho ' + config.keyLabel + '.'
    );
  }

  if (scan.duplicateKeys.length) {
    Logger.log('Chaves duplicadas em ' + config.name + ': ' + scan.duplicateKeys.slice(0, 20).join(', '));
    try {
      SpreadsheetApp.getActive().toast(
        'Atenção: há ' + scan.duplicateKeys.length + ' chave(s) duplicada(s) em ' + config.name + '.',
        'Supabase',
        8
      );
    } catch (err) {}
  }

  const response = postToSupabase_({
    mode: 'reconcile',
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: config.name,
    activeKeys: scan.keys,
  });

  const missingKeys = response && response.reconcile && response.reconcile.missingKeys
    ? response.reconcile.missingKeys
    : [];

  if (missingKeys.length) {
    const rowIndexes = [];
    missingKeys.forEach(function (key) {
      if (scan.keyToRow[key]) rowIndexes.push(scan.keyToRow[key]);
    });

    if (rowIndexes.length) {
      sincronizarLinhasPorIndiceSupabase_(sheet, rowIndexes);
    }
  }
}

function sincronizarLinhasSupabase_(sheet, startRow, endRow) {
  const config = getSupabaseSheetConfig_(sheet.getName());
  if (!config) return;

  const headers = getSupabaseHeaders_(sheet);
  const rowCount = endRow - startRow + 1;
  if (rowCount <= 0) return;

  const values = sheet.getRange(startRow, 1, rowCount, headers.length).getDisplayValues();
  const rows = [];

  for (let index = 0; index < values.length; index++) {
    const rowIndex = startRow + index;
    const row = buildSupabaseRowObject_(headers, values[index]);
    if (isSupabaseRowEmpty_(row, headers)) continue;

    const syncKey = buildSupabaseStableKeyFromRow_(config, row);
    if (!syncKey) continue;

    row.sync_key = syncKey;
    row.__rowIndex = rowIndex;
    rows.push(row);
  }

  enviarLinhasSupabase_(config, rows);
}

function sincronizarLinhasPorIndiceSupabase_(sheet, rowIndexes) {
  const config = getSupabaseSheetConfig_(sheet.getName());
  if (!config || !rowIndexes.length) return;

  const headers = getSupabaseHeaders_(sheet);
  const rows = [];

  rowIndexes.forEach(function (rowIndex) {
    if (rowIndex <= SUPABASE_HEADER_ROW) return;
    const values = sheet.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0];
    const row = buildSupabaseRowObject_(headers, values);
    if (isSupabaseRowEmpty_(row, headers)) return;

    const syncKey = buildSupabaseStableKeyFromRow_(config, row);
    if (!syncKey) return;

    row.sync_key = syncKey;
    row.__rowIndex = rowIndex;
    rows.push(row);
  });

  enviarLinhasSupabase_(config, rows);
}

function enviarLinhasSupabase_(config, rows) {
  if (!rows.length) return;

  for (let index = 0; index < rows.length; index += SUPABASE_MAX_BATCH_SIZE) {
    postToSupabase_({
      mode: 'full',
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      sheetName: config.name,
      rows: rows.slice(index, index + SUPABASE_MAX_BATCH_SIZE),
    });
  }
}

function coletarChavesAtivasSupabase_(sheet, config) {
  const headers = getSupabaseHeaders_(sheet);
  const keyColumnIndex = findSupabaseHeaderIndex_(headers, config.keyHeaders);

  if (keyColumnIndex === -1) {
    throw new Error('Cabeçalho obrigatório não encontrado em ' + config.name + ': ' + config.keyLabel);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= SUPABASE_HEADER_ROW) {
    return { keys: [], keyToRow: {}, duplicateKeys: [] };
  }

  const values = sheet
    .getRange(SUPABASE_HEADER_ROW + 1, keyColumnIndex + 1, lastRow - SUPABASE_HEADER_ROW, 1)
    .getDisplayValues();

  const seen = {};
  const keys = [];
  const keyToRow = {};
  const duplicateKeys = [];

  values.forEach(function (line, index) {
    const rowIndex = SUPABASE_HEADER_ROW + 1 + index;
    const key = buildSupabaseStableKey_(config, line[0]);
    if (!key) return;

    if (seen[key]) {
      duplicateKeys.push(key);
      return;
    }

    seen[key] = true;
    keys.push(key);
    keyToRow[key] = rowIndex;
  });

  return { keys: keys, keyToRow: keyToRow, duplicateKeys: duplicateKeys };
}

function getSupabaseSheetConfig_(sheetName) {
  const cleanName = String(sheetName || '').trim();
  for (let index = 0; index < SUPABASE_SHEETS.length; index++) {
    if (SUPABASE_SHEETS[index].name === cleanName) return SUPABASE_SHEETS[index];
  }
  return null;
}

function getSupabaseHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(SUPABASE_HEADER_ROW, 1, 1, lastColumn).getDisplayValues()[0];
}

function findSupabaseHeaderIndex_(headers, candidates) {
  const normalizedCandidates = candidates.map(function (candidate) {
    return normalizeSupabaseHeader_(candidate);
  });

  for (let index = 0; index < headers.length; index++) {
    if (normalizedCandidates.indexOf(normalizeSupabaseHeader_(headers[index])) !== -1) {
      return index;
    }
  }

  return -1;
}

function buildSupabaseRowObject_(headers, values) {
  const row = {};
  headers.forEach(function (header, index) {
    const cleanHeader = String(header || '').trim();
    if (!cleanHeader) return;
    row[cleanHeader] = values[index];
  });
  return row;
}

function buildSupabaseStableKeyFromRow_(config, row) {
  for (let index = 0; index < config.keyHeaders.length; index++) {
    const headerName = config.keyHeaders[index];
    const value = getSupabaseValueByHeader_(row, headerName);
    const key = buildSupabaseStableKey_(config, value);
    if (key) return key;
  }
  return '';
}

function getSupabaseValueByHeader_(row, wantedHeader) {
  const wanted = normalizeSupabaseHeader_(wantedHeader);
  const keys = Object.keys(row || {});

  for (let index = 0; index < keys.length; index++) {
    if (normalizeSupabaseHeader_(keys[index]) === wanted) {
      return row[keys[index]];
    }
  }

  return '';
}

function buildSupabaseStableKey_(config, value) {
  const keyPart = normalizeSupabaseKeyPart_(value);
  return keyPart ? config.keyPrefix + keyPart : '';
}

function isSupabaseRowEmpty_(row, headers) {
  return headers.every(function (header) {
    const cleanHeader = String(header || '').trim();
    if (!cleanHeader) return true;
    return String(row[cleanHeader] || '').trim() === '';
  });
}

function normalizeSupabaseHeader_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizeSupabaseKeyPart_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function postToSupabase_(payload) {
  const response = UrlFetchApp.fetch(SUPABASE_SYNC_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + SUPABASE_SYNC_SECRET,
    },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  });

  const code = response.getResponseCode();
  const body = response.getContentText();

  if (code >= 300) {
    throw new Error('Falha no sync (' + code + '): ' + body);
  }

  return body ? JSON.parse(body) : {};
}
