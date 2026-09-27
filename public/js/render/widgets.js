import { escapeHtml } from '../lib/format.js';
import { normalizeState, stateLabel } from '../lib/states.js';

/** @typedef {'lvl-ok' | 'lvl-warn' | 'lvl-bad'} LevelClass */

export const SEGMENT_CELLS = 24;
const PERCENT = 100;

/**
 * Classe de cor conforme limites de alerta (verde, amarelo, vermelho).
 * @param {number} value
 * @param {{ warn: number, bad: number }} limits
 * @returns {LevelClass}
 * @example levelClass(80, { warn: 60, bad: 85 }) // 'lvl-warn'
 */
export function levelClass(value, limits) {
  if (value >= limits.bad) return 'lvl-bad';
  return value >= limits.warn ? 'lvl-warn' : 'lvl-ok';
}

/**
 * Barra segmentada estilo 8-bit.
 * @param {number} percent
 * @param {string} colorClass
 * @returns {string}
 * @example segmentBar(50, 'lvl-ok')
 */
export function segmentBar(percent, colorClass) {
  const clamped = Math.max(0, Math.min(PERCENT, percent));
  const lit = Math.round((clamped / PERCENT) * SEGMENT_CELLS);
  const cells = Array.from(
    { length: SEGMENT_CELLS },
    (_, index) => `<i${index < lit ? ' class="on"' : ''}></i>`,
  );
  return `<div class="seg ${colorClass}">${cells.join('')}</div>`;
}

/**
 * Selo de estado ("EM ÓRBITA", "PÂNICO"…), com o termo técnico no tooltip.
 * @param {string} state
 * @returns {string}
 * @example stateChip('ok')
 */
export function stateChip(state) {
  const label = stateLabel(state);
  return `<span class="chip st-${normalizeState(state)}" title="${escapeHtml(label.tecnico)}">${label.tema}</span>`;
}
