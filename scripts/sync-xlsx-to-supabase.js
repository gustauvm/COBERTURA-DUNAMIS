const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');

const DEFAULT_FILE = path.join(process.env.USERPROFILE || '', 'Downloads', 'EFETIVOS GOOGLE (3).xlsx');
const TARGET_SHEETS = [
  {
    name: '(COLABORADORES) BD',
    keyHeaders: ['MATRÍCULA', 'MATRICULA'],
    keyPrefix: 'colaborador|matricula:',
  },
  {
    name: '(UNIDADES) BD',
    keyHeaders: ['posto'],
    keyPrefix: 'unidade|posto:',
  },
];
const BATCH_SIZE = 100;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizeKeyPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseArgs(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--file') {
      result.file = argv[++i];
    } else if (arg === '--url') {
      result.url = argv[++i];
    } else if (arg === '--secret') {
      result.secret = argv[++i];
    }
  }
  return result;
}

function getTargetSheetConfig(sheetName) {
  return TARGET_SHEETS.find((config) => normalizeText(config.name) === normalizeText(sheetName)) || null;
}

function getRowValueByHeader(row, candidates) {
  const normalizedCandidates = candidates.map(normalizeHeader);
  for (const [header, value] of Object.entries(row)) {
    if (normalizedCandidates.includes(normalizeHeader(header))) {
      return value;
    }
  }
  return '';
}

function buildSyncKey(config, row) {
  const keyValue = getRowValueByHeader(row, config.keyHeaders);
  const keyPart = normalizeKeyPart(keyValue);
  return keyPart ? `${config.keyPrefix}${keyPart}` : '';
}

function buildRowsFromSheet(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!matrix.length) return { headers: [], rows: [] };

  const rawHeaders = matrix[0];
  const headers = rawHeaders.map((header, index) => {
    const cleanHeader = String(header || '').trim();
    return cleanHeader || `coluna_vazia_${index + 1}`;
  });

  const rows = [];
  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const values = matrix[rowIndex] || [];
    const row = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      const value = values[index] ?? '';
      const text = String(value).trim();
      if (text !== '') hasValue = true;
      row[header] = String(value ?? '');
    });

    if (hasValue) {
      rows.push({ rowIndex: rowIndex + 1, row });
    }
  }

  return { headers, rows };
}

async function postToSupabase(url, secret, payload) {
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Falha no sync (${response.status}): ${text}`);
      }

      return text ? JSON.parse(text) : {};
    } catch (error) {
      if (i === attempts) {
        throw error;
      }
      const waitMs = i * 1500;
      console.warn(`Tentativa ${i} falhou. Repetindo em ${waitMs} ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

async function syncSheet(workbook, config, spreadsheetId, url, secret) {
  const worksheet = workbook.Sheets[config.name];
  if (!worksheet) {
    throw new Error(`Aba nao encontrada: ${config.name}`);
  }

  const { headers, rows } = buildRowsFromSheet(worksheet);
  if (!rows.length) {
    console.log(`[${config.name}] nenhuma linha util encontrada.`);
    return;
  }

  let batch = [];
  let sent = 0;
  const activeKeys = [];
  const seenKeys = new Set();
  const duplicateKeys = new Set();

  for (const item of rows) {
    const syncKey = buildSyncKey(config, item.row);
    if (!syncKey) {
      console.warn(`[${config.name}] linha ${item.rowIndex} ignorada: chave vazia.`);
      continue;
    }

    if (seenKeys.has(syncKey)) {
      duplicateKeys.add(syncKey);
      console.warn(`[${config.name}] chave duplicada ignorada na linha ${item.rowIndex}: ${syncKey}`);
      continue;
    }

    seenKeys.add(syncKey);
    activeKeys.push(syncKey);

    batch.push({
      ...item.row,
      sync_key: syncKey,
      __rowIndex: item.rowIndex,
    });

    if (batch.length >= BATCH_SIZE) {
      await postToSupabase(url, secret, {
        mode: 'full',
        spreadsheetId,
        sheetName: config.name,
        rows: batch,
      });
      sent += batch.length;
      console.log(`[${config.name}] enviados ${sent} registros`);
      batch = [];
    }
  }

  if (batch.length) {
    await postToSupabase(url, secret, {
      mode: 'full',
      spreadsheetId,
      sheetName: config.name,
      rows: batch,
    });
    sent += batch.length;
    console.log(`[${config.name}] enviados ${sent} registros`);
  }

  const reconcile = await postToSupabase(url, secret, {
    mode: 'reconcile',
    spreadsheetId,
    sheetName: config.name,
    activeKeys,
  });

  console.log(
    `[${config.name}] reconcile: ativos=${reconcile?.reconcile?.active ?? activeKeys.length}, ` +
    `apagados=${reconcile?.reconcile?.deleted ?? 0}, faltantes=${reconcile?.reconcile?.missing ?? 0}`,
  );

  if (duplicateKeys.size) {
    console.warn(`[${config.name}] ${duplicateKeys.size} chave(s) duplicada(s) ignorada(s).`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(args.file || DEFAULT_FILE);
  const secret = args.secret || process.env.SHEET_SYNC_SHARED_SECRET;
  const url = args.url || process.env.SUPABASE_SYNC_URL || 'https://bvpcbviggbxnpqoprnxq.supabase.co/functions/v1/sheet-sync-colaboradores';

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao encontrado: ${filePath}`);
  }

  if (!secret) {
    throw new Error('SHEET_SYNC_SHARED_SECRET nao definido.');
  }

  console.log(`Abrindo arquivo: ${filePath}`);
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const spreadsheetId = path.basename(filePath);

  for (const config of TARGET_SHEETS) {
    console.log(`Lendo aba: ${config.name}`);
    await syncSheet(workbook, config, spreadsheetId, url, secret);
  }

  console.log('Importacao concluida.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
