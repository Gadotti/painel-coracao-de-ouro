import { applyDataStyles, byId, renderInto } from './dom.js';
import { renderSprite } from '../sprites/sprite.js';
import { escapeHtml, formatRelative, formatWhen } from '../lib/format.js';

/** @typedef {import('../lib/laneModel.js').LaneModel} LaneModel */

const DOT_COUNT = 48;
const PERCENT = 100;
const CHASER_DISTANCE_PCT = 5;
const CHASER_MIN_PCT = 1;

/**
 * @returns {string}
 */
function trackSkeleton() {
  const dots = Array.from(
    { length: DOT_COUNT },
    (_, index) => `<i class="dot" data-pos="${((index + 0.5) / DOT_COUNT) * PERCENT}"></i>`,
  ).join('');
  const chaser = renderSprite('ghost', { scale: 2, pal: { X: '#ff3b3b' } });
  return `${dots}<div id="pellets"></div><span class="chaser" id="chaser" hidden>${chaser}</span><span class="pac" id="pac">${renderSprite('pac', { scale: 2 })}</span>`;
}

/**
 * @param {HTMLElement} track
 * @returns {void}
 */
function ensureSkeleton(track) {
  if (track.querySelector('#pac')) return;
  track.innerHTML = trackSkeleton();
  applyDataStyles(track);
}

/**
 * @param {LaneModel} model
 * @returns {string}
 */
function pelletsHtml(model) {
  return model.pastilhas
    .map(
      (pellet) =>
        `<i class="pellet${pellet.comida ? ' eaten' : ''}" data-pos="${pellet.posicaoPct}" title="${escapeHtml(pellet.rotulo)}"></i>`,
    )
    .join('');
}

/**
 * @param {LaneModel} model
 * @param {Date} now
 * @returns {string}
 */
function nextPelletHtml(model, now) {
  if (!model.proxima) return 'NENHUMA PASTILHA À VISTA';
  const { nome, quando } = model.proxima;
  return `PRÓXIMA PASTILHA: <b>${escapeHtml(nome.toUpperCase())}</b> · ${escapeHtml(formatWhen(quando, now))} (${escapeHtml(formatRelative(quando, now))})`;
}

/**
 * Rota do dia: o Pac-Man anda com o relógio; Blinky aparece atrás dele quando há problemas.
 * @param {ParentNode} root
 * @param {{ model: LaneModel, problems: number, now: Date }} view
 * @returns {void}
 * @example renderLane(document, { model, problems: 0, now: new Date() })
 */
export function renderLane(root, { model, problems, now }) {
  const track = byId(root, 'track');
  ensureSkeleton(track);
  track.querySelectorAll('.dot').forEach((dot) => {
    dot.classList.toggle('eaten', Number(/** @type {HTMLElement} */ (dot).dataset.pos) < model.posicaoPct);
  });
  byId(root, 'pac').style.left = `${model.posicaoPct}%`;
  const chaser = byId(root, 'chaser');
  chaser.hidden = problems === 0;
  chaser.style.left = `${Math.max(CHASER_MIN_PCT, model.posicaoPct - CHASER_DISTANCE_PCT)}%`;
  chaser.title = `Blinky está atrás de você: ${problems} problema(s)`;
  renderInto(byId(root, 'pellets'), pelletsHtml(model));
  byId(root, 'lane-next').innerHTML = nextPelletHtml(model, now);
}
