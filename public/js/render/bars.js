import { computeBarRects } from '../lib/barLayout.js';

/** @typedef {import('../lib/barLayout.js').BarSeries} BarSeries */

/**
 * Desenha o gráfico de blocos no canvas, ajustando à densidade de pixels da tela.
 * @param {HTMLCanvasElement} canvas
 * @param {{ series: BarSeries[], max: number, slots: number }} chart
 * @returns {void}
 * @example drawBars(canvas, { series: [{ values: [10, 20], color: '#0ff' }], max: 100, slots: 48 })
 */
export function drawBars(canvas, chart) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const context = canvas.getContext?.('2d');
  if (!width || !height || !context) return;
  const ratio = globalThis.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  for (const rect of computeBarRects({ ...chart, size: { width, height } })) {
    context.fillStyle = rect.color;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
}
