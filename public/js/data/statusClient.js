/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../types.js').StatusMeta} StatusMeta */
/** @typedef {import('../types.js').PanelTheme} PanelTheme */
/** @typedef {import('../types.js').ConnectionState} ConnectionState */

/**
 * @typedef {{ kind: 'ok', status: PanelStatus, meta: StatusMeta }
 *   | { kind: 'sem-sinal' }
 *   | { kind: 'sem-conexao' }} StatusFetchResult
 */

/** @typedef {(url: string, init?: RequestInit) => Promise<Response>} FetchFunction */

/** @type {PanelTheme} */
export const EMPTY_THEME = Object.freeze({ agentes: {}, programas: {}, crons: {}, roadmap: [] });

/**
 * Cliente da API do painel. Resposta de erro da API = "sem sinal" (o coletor não entregou);
 * falha de rede = "sem conexão" (o servidor do painel não respondeu).
 * @param {{ fetchFn: FetchFunction, statusUrl: string, themeUrl: string }} options
 * @returns {{ fetchSnapshot: () => Promise<StatusFetchResult>, fetchTheme: () => Promise<PanelTheme> }}
 * @example const client = createStatusClient({ fetchFn: fetch, statusUrl: '/api/status', themeUrl: '/api/theme' })
 */
export function createStatusClient({ fetchFn, statusUrl, themeUrl }) {
  const request = (/** @type {string} */ url) =>
    fetchFn(url, { cache: 'no-store', headers: { accept: 'application/json' } });

  return {
    async fetchSnapshot() {
      try {
        const response = await request(statusUrl);
        if (!response.ok) return { kind: 'sem-sinal' };
        const body = await response.json();
        return { kind: 'ok', status: body.status, meta: body.meta };
      } catch {
        return { kind: 'sem-conexao' };
      }
    },
    async fetchTheme() {
      try {
        const response = await request(themeUrl);
        return response.ok ? await response.json() : EMPTY_THEME;
      } catch {
        return EMPTY_THEME;
      }
    },
  };
}

/**
 * @typedef {object} ConnectionSnapshot
 * @property {ConnectionState} connection
 * @property {PanelStatus | null} status
 * @property {StatusMeta | null} meta
 */

/**
 * Próximo estado da conexão. Em falha, mantém o último status conhecido na tela
 * (marcado como problema pela checagem de saúde) em vez de apagar tudo.
 * @param {ConnectionSnapshot} previous
 * @param {StatusFetchResult} result
 * @returns {ConnectionSnapshot}
 * @example nextConnection({ connection: 'aguardando', status: null, meta: null }, { kind: 'sem-conexao' }).connection // 'sem-conexao'
 */
export function nextConnection(previous, result) {
  if (result.kind === 'ok') return { connection: 'ao-vivo', status: result.status, meta: result.meta };
  return { connection: result.kind, status: previous.status, meta: previous.meta };
}
