const CELL_SIZE = 4;
const CELL_GAP = 1;
const SLOT_GAP = 2;

/**
 * @typedef {object} BarSeries
 * @property {number[]} values
 * @property {string} color
 * @property {boolean} [tick] Desenha só a célula do topo (linha), em vez da coluna cheia.
 */

/**
 * @typedef {object} BarRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} color
 */

/**
 * @typedef {object} BarLayoutInput
 * @property {BarSeries[]} series
 * @property {{ width: number, height: number }} size
 * @property {number} max
 * @property {number} slots
 */

export const BASELINE_COLOR = '#16163a';

/**
 * Calcula os retângulos do gráfico de barras em blocos 8-bit (valores mais recentes à direita).
 * Separado do canvas para ser testável sem DOM.
 * @param {BarLayoutInput} input
 * @returns {BarRect[]}
 * @example computeBarRects({ series: [{ values: [50], color: '#0ff' }], size: { width: 48, height: 20 }, max: 100, slots: 1 })
 */
export function computeBarRects({ series, size, max, slots }) {
  const slotWidth = size.width / slots;
  const barWidth = Math.max(1, Math.floor(slotWidth) - SLOT_GAP);
  const rows = Math.floor(size.height / (CELL_SIZE + CELL_GAP));
  const baseline = Array.from({ length: slots }, (_, slot) => ({
    x: Math.floor(slot * slotWidth),
    y: size.height - CELL_SIZE,
    width: barWidth,
    height: CELL_SIZE,
    color: BASELINE_COLOR,
  }));
  const bars = series.flatMap((line) => seriesRects(line, { slotWidth, barWidth, rows, max, slots, size }));
  return [...baseline, ...bars];
}

/**
 * @param {BarSeries} line
 * @param {{ slotWidth: number, barWidth: number, rows: number, max: number, slots: number, size: { height: number } }} grid
 * @returns {BarRect[]}
 */
function seriesRects(line, grid) {
  const offset = grid.slots - line.values.length;
  return line.values.flatMap((value, index) => {
    const x = Math.floor((offset + index) * grid.slotWidth);
    const filled = filledCells(value, grid);
    const cells = line.tick ? (filled ? [filled - 1] : []) : Array.from({ length: filled }, (_, row) => row);
    return cells.map((row) => ({
      x,
      y: grid.size.height - (row + 1) * (CELL_SIZE + CELL_GAP) + (line.tick ? 0 : CELL_GAP),
      width: grid.barWidth,
      height: CELL_SIZE,
      color: line.color,
    }));
  });
}

/**
 * Qualquer valor positivo ganha ao menos uma célula, para tráfego baixo não sumir.
 * @param {number} value
 * @param {{ rows: number, max: number }} grid
 * @returns {number}
 */
function filledCells(value, grid) {
  if (value <= 0) return 0;
  return Math.max(1, Math.round((Math.min(value, grid.max) / grid.max) * grid.rows));
}
