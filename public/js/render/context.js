/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../lib/themeLookup.js').ThemeLookup} ThemeLookup */

/**
 * O que todo painel precisa para desenhar: dados, verbetes, relógio e o endereço do host.
 * @typedef {object} RenderContext
 * @property {PanelStatus} status
 * @property {ThemeLookup} lookup
 * @property {Date} now
 * @property {string} hostAddress Usado para montar os links do Hangar (http://host:porta).
 */

/**
 * Status vazio usado antes do primeiro sinal, para os painéis renderizarem sem dados.
 * @returns {PanelStatus}
 * @example emptyStatus().agentes // []
 */
export function emptyStatus() {
  return {
    gerado_em: new Date(0).toISOString(),
    host: {},
    hardware: {},
    rede: {},
    agentes: [],
    programas: [],
    crons: [],
    eventos: [],
  };
}
