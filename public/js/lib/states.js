/** @typedef {import('../types.js').UnitState} UnitState */

/** Rótulos temáticos de cada estado, com o termo técnico para o tooltip. */
export const STATE_LABELS = Object.freeze({
  ok: { tema: 'EM ÓRBITA', tecnico: 'ok / rodando' },
  aviso: { tema: 'TURBULÊNCIA', tecnico: 'rodando com aviso' },
  falha: { tema: 'PÂNICO', tecnico: 'falhou' },
  parado: { tema: 'À DERIVA', tecnico: 'parado / offline' },
});

/**
 * Estados desconhecidos caem em "parado" para nunca parecerem saudáveis.
 * @param {string} state
 * @returns {UnitState}
 * @example normalizeState('xyz') // 'parado'
 */
export function normalizeState(state) {
  return state in STATE_LABELS ? /** @type {UnitState} */ (state) : 'parado';
}

/**
 * @param {string} state
 * @returns {{ tema: string, tecnico: string }}
 * @example stateLabel('ok').tema // 'EM ÓRBITA'
 */
export function stateLabel(state) {
  return STATE_LABELS[normalizeState(state)];
}
