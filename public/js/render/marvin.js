import { byId, renderInto, setText } from './dom.js';
import { segmentBar } from './widgets.js';
import { escapeHtml, formatWhen } from '../lib/format.js';
import { MARVIN_LINES, latestEvents, marvinLine, marvinMood } from '../lib/mood.js';

/** @typedef {import('../types.js').PanelEvent} PanelEvent */
/** @typedef {import('./context.js').RenderContext} RenderContext */

const VISIBLE_EVENTS = 15;
const DESPAIR_THRESHOLD = 85;
const LEVELS = new Set(['info', 'aviso', 'erro']);

/**
 * @param {PanelEvent} event
 * @param {RenderContext} context
 * @returns {string}
 */
export function eventHtml(event, context) {
  const level = LEVELS.has(event.nivel) ? event.nivel : 'info';
  const who = context.lookup.originName(event.origem);
  const comment =
    level === 'info' ? '' : `<span class="mv">Marvin: “${escapeHtml(marvinLine(event))}”</span>`;
  return `<li><time datetime="${escapeHtml(event.ts)}">${escapeHtml(formatWhen(event.ts, context.now))}</time> <span class="lv-${level}">${level.toUpperCase()}</span> <span class="who">${escapeHtml(who)}:</span> ${escapeHtml(event.texto)}${comment}</li>`;
}

/**
 * Marvin: diário de bordo e nível de depressão.
 * @param {ParentNode} root
 * @param {RenderContext} context
 * @returns {void}
 * @example renderMarvin(document, context)
 */
export function renderMarvin(root, context) {
  const mood = marvinMood(context.status.eventos, context.now);
  renderInto(byId(root, 'mood'), segmentBar(mood, mood > DESPAIR_THRESHOLD ? 'lvl-bad' : 'lvl-dim'));
  setText(root, 'mood-val', `${mood}%`);
  const events = latestEvents(context.status.eventos, VISIBLE_EVENTS);
  const items = events.map((event) => eventHtml(event, context)).join('');
  renderInto(byId(root, 'log'), items || `<li>Nada aconteceu. ${MARVIN_LINES.info[0]}</li>`);
}
