const SUPABASE_SYNC_URL = 'https://bvpcbviggbxnpqoprnxq.supabase.co/functions/v1/sheet-sync-colaboradores';
const SUPABASE_SYNC_SECRET = 'TROQUE_PELO_SEGREDO_DA_FUNCAO';
const TARGET_SHEETS = ['(COLABORADORES) BD', '(UNIDADES) BD'];
const SYNC_KEY_HEADER = 'SYNC_KEY';
const HEADER_ROW = 1;

function syncEditedRow(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (TARGET_SHEETS.indexOf(sheet.getName()) === -1) return;
  if (e.range.getRow() <= HEADER_ROW) return;

  const headers = ensureSyncHeader_(sheet);
  const syncKey = ensureSyncKeyForRow_(sheet, e.range.getRow(), headers);
  const row = buildRowObject_(sheet, e.range.getRow(), headers);
  row[SYNC_KEY_HEADER] = syncKey;
  row.__rowIndex = e.range.getRow();

  postToSupabase_({
    mode: 'row',
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheet.getName(),
    row: row,
  });
}

function syncAllConfiguredSheets() {
  TARGET_SHEETS.forEach(function(sheetName) {
    syncSheetByName_(sheetName);
  });
}

function syncSheetByName_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Aba não encontrada: ' + sheetName);

  const headers = ensureSyncHeader_(sheet);
  const lastRow = sheet.getLastRow();
  const rows = [];

  for (var rowIndex = HEADER_ROW + 1; rowIndex <= lastRow; rowIndex++) {
    const row = buildRowObject_(sheet, rowIndex, headers);
    if (isRowEmpty_(row, headers)) continue;
    row[SYNC_KEY_HEADER] = ensureSyncKeyForRow_(sheet, rowIndex, headers);
    row.__rowIndex = rowIndex;
    rows.push(row);
  }

  postToSupabase_({
    mode: 'full',
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheetName,
    rows: rows,
  });
}

function ensureSyncHeader_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastColumn).getDisplayValues()[0];

  if (String(headers[0] || '').trim() === SYNC_KEY_HEADER) {
    return headers;
  }

  sheet.insertColumnBefore(1);
  sheet.getRange(HEADER_ROW, 1).setValue(SYNC_KEY_HEADER);
  sheet.hideColumns(1);

  return sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
}

function ensureSyncKeyForRow_(sheet, rowIndex, headers) {
  const syncColumnIndex = headers.indexOf(SYNC_KEY_HEADER) + 1;
  if (!syncColumnIndex) throw new Error('Coluna SYNC_KEY não encontrada.');

  var currentValue = String(sheet.getRange(rowIndex, syncColumnIndex).getDisplayValue() || '').trim();
  if (!currentValue) {
    currentValue = Utilities.getUuid();
    sheet.getRange(rowIndex, syncColumnIndex).setValue(currentValue);
  }
  return currentValue;
}

function buildRowObject_(sheet, rowIndex, headers) {
  const values = sheet.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0];
  const row = {};

  headers.forEach(function(header, index) {
    var cleanHeader = String(header || '').trim();
    if (!cleanHeader) return;
    row[cleanHeader] = values[index];
  });

  return row;
}

function isRowEmpty_(row, headers) {
  return headers.every(function(header) {
    const cleanHeader = String(header || '').trim();
    if (!cleanHeader || cleanHeader === SYNC_KEY_HEADER) return true;
    return String(row[cleanHeader] || '').trim() === '';
  });
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
