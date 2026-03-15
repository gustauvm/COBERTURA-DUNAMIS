(function (global) {
    const DataLayer = {};

    DataLayer.withTimeout = function withTimeout(promise, timeoutMs, label) {
        let timerId;
        const timeoutPromise = new Promise((_, reject) => {
            timerId = setTimeout(() => {
                reject(new Error((label || 'Operacao') + ' excedeu o tempo limite (' + timeoutMs + 'ms).'));
            }, timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => {
            clearTimeout(timerId);
        });
    };

    DataLayer.fetchSupabaseTablePaged = async function fetchSupabaseTablePaged(options) {
        const cfg = options || {};
        const baseUrl = String(cfg.baseUrl || '').replace(/\/$/, '');
        const table = String(cfg.table || '').trim();
        const anonKey = String(cfg.anonKey || '').trim();
        const token = String(cfg.accessToken || anonKey || '').trim();
        const pageSize = Number.isFinite(cfg.pageSize) ? cfg.pageSize : 1000;
        const timeoutMs = Number.isFinite(cfg.timeoutMs) ? cfg.timeoutMs : 15000;

        if (!baseUrl || !table || !anonKey || !token) {
            throw new Error('Configuracao invalida para fetchSupabaseTablePaged.');
        }

        let from = 0;
        let rows = [];

        while (true) {
            const to = from + pageSize - 1;
            const req = fetch(baseUrl + '/rest/v1/' + table + '?select=*', {
                method: 'GET',
                headers: {
                    apikey: anonKey,
                    Authorization: 'Bearer ' + token,
                    Range: from + '-' + to,
                    Prefer: 'count=exact'
                }
            });

            const resp = await DataLayer.withTimeout(req, timeoutMs, 'REST ' + table);
            if (!resp.ok) {
                const body = await resp.text().catch(() => '');
                throw new Error('REST ' + table + ' falhou (' + resp.status + '): ' + (body || resp.statusText));
            }

            const chunk = await resp.json();
            if (!Array.isArray(chunk) || chunk.length === 0) {
                break;
            }
            rows = rows.concat(chunk);
            if (chunk.length < pageSize) {
                break;
            }
            from += pageSize;
        }

        return rows;
    };

    global.DunamisDataLayer = DataLayer;
})(typeof window !== 'undefined' ? window : globalThis);
