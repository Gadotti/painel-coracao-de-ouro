// Bits de `vcgencmd get_throttled` (documentação do Raspberry Pi).
const CURRENT_FLAGS = /** @type {Array<[number, string]>} */ ([
  [0, 'subtensão'],
  [1, 'frequência limitada'],
  [2, 'throttling'],
  [3, 'limite térmico'],
]);
const SINCE_BOOT_FLAGS = /** @type {Array<[number, string]>} */ ([
  [16, 'subtensão'],
  [17, 'frequência limitada'],
  [18, 'throttling'],
  [19, 'limite térmico'],
]);

/**
 * @typedef {object} PowerReading
 * @property {'desconhecido' | 'estavel' | 'historico' | 'agora'} situacao
 * @property {string[]} agora
 * @property {string[]} desdeBoot
 * @property {string | null} bruto
 */

/**
 * @param {number} value
 * @param {Array<[number, string]>} flags
 * @returns {string[]}
 */
function activeFlags(value, flags) {
  return flags.filter(([bit]) => (value & (1 << bit)) !== 0).map(([, label]) => label);
}

/**
 * Traduz o valor hexadecimal de throttling em problemas atuais e passados.
 * @param {string | null | undefined} hex
 * @returns {PowerReading}
 * @example decodeThrottled('0x50000').situacao // 'historico'
 */
export function decodeThrottled(hex) {
  const value = typeof hex === 'string' ? parseInt(hex, 16) : NaN;
  if (Number.isNaN(value)) return { situacao: 'desconhecido', agora: [], desdeBoot: [], bruto: null };
  const agora = activeFlags(value, CURRENT_FLAGS);
  const desdeBoot = activeFlags(value, SINCE_BOOT_FLAGS);
  const situacao = agora.length ? 'agora' : desdeBoot.length ? 'historico' : 'estavel';
  return { situacao, agora, desdeBoot, bruto: hex };
}
