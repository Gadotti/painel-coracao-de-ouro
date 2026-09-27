import { SPRITES } from './spriteDefs.js';
import { safeColor } from '../lib/format.js';

/** @typedef {import('./spriteDefs.js').SpriteDefinition} SpriteDefinition */
/** @typedef {import('../types.js').UnitState} UnitState */

const DEFAULT_SCALE = 3;
const GHOST_SCALE = 4;
const DEFAULT_GHOST_COLOR = '#ff3b3b';

/**
 * @typedef {object} SpriteOptions
 * @property {number} [scale]
 * @property {Record<string, string>} [pal] Sobrescreve cores; cor vazia apaga aquela letra.
 * @property {string} [className]
 * @property {boolean} [still] Desliga a animação de dois quadros.
 */

/**
 * Converte linhas do mapa em `<rect>`, juntando pixels vizinhos da mesma cor.
 * @param {string[]} rows
 * @param {Record<string, string>} palette
 * @returns {string}
 */
function rowsToRects(rows, palette) {
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = palette[row[x]];
      const runEnd = findRunEnd(row, x);
      if (row[x] !== '.' && color) {
        rects += `<rect x="${x}" y="${y}" width="${runEnd - x}" height="1" fill="${color}"/>`;
      }
      x = runEnd;
    }
  });
  return rects;
}

/**
 * @param {string} row
 * @param {number} start
 * @returns {number}
 */
function findRunEnd(row, start) {
  let end = start;
  while (end < row.length && row[end] === row[start]) end++;
  return end;
}

/**
 * @param {SpriteDefinition} definition
 * @param {Record<string, string>} palette
 * @returns {string | null}
 */
function secondFrame(definition, palette) {
  if (definition.rows2) return rowsToRects(definition.rows2, palette);
  if (definition.pal2) return rowsToRects(definition.rows, { ...palette, ...definition.pal2 });
  return null;
}

/**
 * SVG inline de um sprite. Nomes desconhecidos viram o bloco "?".
 * @param {string} name
 * @param {SpriteOptions} [options]
 * @returns {string}
 * @example renderSprite('pac', { scale: 2 }) // '<svg class="spr anim" ...>'
 */
export function renderSprite(name, options = {}) {
  const definition = SPRITES[name] ?? SPRITES.qbox;
  const palette = { ...definition.pal, ...(options.pal ?? {}) };
  const width = definition.rows[0].length;
  const height = definition.rows.length;
  const scale = options.scale ?? DEFAULT_SCALE;
  const frame2 = options.still ? null : secondFrame(definition, palette);
  const frame1 = rowsToRects(definition.rows, palette);
  const body = frame2 ? `<g class="f0">${frame1}</g><g class="f1">${frame2}</g>` : frame1;
  const classes = ['spr', frame2 ? 'anim' : '', options.className ?? ''].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 ${width} ${height}" width="${width * scale}" height="${height * scale}" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
}

/**
 * Fantasma que representa o estado de um agente, como no Pac-Man:
 * normal (ok), piscando (aviso), assustado (falha) e só os olhos (parado).
 * @param {UnitState} state
 * @param {{ color?: string, scale?: number }} [options]
 * @returns {string}
 * @example ghostSprite('falha') // fantasma azul assustado
 */
export function ghostSprite(state, options = {}) {
  const scale = options.scale ?? GHOST_SCALE;
  if (state === 'falha') return renderSprite('scared', { scale });
  if (state === 'parado') return renderSprite('ghost', { scale, pal: { X: '' } });
  const color = safeColor(options.color, DEFAULT_GHOST_COLOR);
  return renderSprite('ghost', { scale, pal: { X: color }, className: state === 'aviso' ? 'warn' : '' });
}
