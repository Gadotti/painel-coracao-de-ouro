import { byId, renderInto } from './dom.js';
import { stateChip } from './widgets.js';
import { ghostSprite } from '../sprites/sprite.js';
import { escapeHtml, formatRelative, formatWhen, pickStable } from '../lib/format.js';
import { nextCronRun } from '../lib/cron.js';
import { normalizeState } from '../lib/states.js';

/** @typedef {import('../types.js').AgentStatus} AgentStatus */
/** @typedef {import('./context.js').RenderContext} RenderContext */

const PANIC_QUOTE = 'Aaah! Isso não estava no plano!';
const ADRIFT_QUOTE = '…';
const ROW_GHOST_SCALE = 2;

/**
 * Próxima execução: a informada pelo coletor ou a calculada pela expressão cron.
 * @param {AgentStatus} agent
 * @param {RenderContext} context
 * @returns {string | null}
 */
function nextRunIso(agent, context) {
  const job = context.status.crons.find((candidate) => candidate.id === agent.id);
  const explicit = agent.proxima ?? job?.proxima;
  if (explicit) return explicit;
  const expression = agent.cron ?? job?.expressao;
  return expression ? (nextCronRun(expression, context.now)?.toISOString() ?? null) : null;
}

/**
 * @param {AgentStatus} agent
 * @param {string[]} quotes
 * @returns {string}
 */
function quoteFor(agent, quotes) {
  if (agent.estado === 'falha') return PANIC_QUOTE;
  if (agent.estado === 'parado') return ADRIFT_QUOTE;
  return pickStable(quotes, agent.id);
}

/**
 * @param {string | null | undefined} iso
 * @param {Date} now
 * @returns {string}
 */
function whenLine(iso, now) {
  if (!iso) return '—';
  return `${escapeHtml(formatRelative(iso, now))} <span class="st-parado">(${escapeHtml(formatWhen(iso, now))})</span>`;
}

/**
 * Cartão de um tripulante (agente/script).
 * @param {AgentStatus} agent
 * @param {RenderContext} context
 * @returns {string}
 */
export function crewCardHtml(agent, context) {
  const theme = context.lookup.agent(agent.id);
  const state = normalizeState(agent.estado);
  const next = nextRunIso(agent, context);
  const message = agent.mensagem ? `<p class="msg st-${state}">› ${escapeHtml(agent.mensagem)}</p>` : '';
  return `<article class="crew" data-state="${state}" data-color="${theme.cor}">
    ${ghostSprite(state, { color: theme.cor })}
    <div>
      <header><h3>${escapeHtml(theme.nome.toUpperCase())}</h3>${stateChip(state)}</header>
      <p class="role">${escapeHtml(theme.papel)}</p>
      <div class="real">${escapeHtml(agent.id)} · ${escapeHtml(agent.tipo || '?')}</div>
      <p class="quote">“${escapeHtml(quoteFor(agent, theme.frases))}”</p>
      <dl>
        <dt>ÚLTIMA</dt><dd>${whenLine(agent.ultima_atividade, context.now)}</dd>
        ${next ? `<dt>PRÓXIMA</dt><dd>${whenLine(next, context.now)}</dd>` : ''}
      </dl>
      ${message}
    </div>
  </article>`;
}

/**
 * @param {string | null | undefined} iso
 * @param {Date} now
 * @returns {string}
 */
function lastSeenLabel(iso, now) {
  return iso ? escapeHtml(formatRelative(iso, now)) : '—';
}

/**
 * Linha-crachá de um tripulante; a ficha completa (cartão) fica escondida até o clique.
 * @param {AgentStatus} agent
 * @param {RenderContext} context
 * @param {boolean} isOpen
 * @returns {string}
 * @example crewRowHtml(agent, context, false) // '<li class="badge-row" ...>'
 */
export function crewRowHtml(agent, context, isOpen) {
  const theme = context.lookup.agent(agent.id);
  const state = normalizeState(agent.estado);
  return `<li class="badge-row" data-state="${state}" data-color="${theme.cor}" data-agent="${escapeHtml(agent.id)}">
    <button type="button" aria-expanded="${isOpen}">
      ${ghostSprite(state, { color: theme.cor, scale: ROW_GHOST_SCALE })}
      <span class="nm">${escapeHtml(theme.nome.toUpperCase())}</span>
      <span class="ident">${escapeHtml(agent.id)} · ${escapeHtml(agent.tipo || '?')}</span>
      <span class="when">${lastSeenLabel(agent.ultima_atividade, context.now)}</span>
      ${stateChip(state)}
    </button>
    <div class="more"${isOpen ? '' : ' hidden'}>${crewCardHtml(agent, context)}</div>
  </li>`;
}

/**
 * @param {ParentNode} list
 * @returns {string | undefined}
 */
function openAgentId(list) {
  const row = list.querySelector('[aria-expanded="true"]')?.closest('li');
  return row instanceof HTMLElement ? row.dataset.agent : undefined;
}

/**
 * Abre a ficha clicada e fecha as outras (só uma fica aberta por vez).
 * @param {ParentNode} list
 * @param {Element} button
 * @returns {void}
 */
function toggleCrewRow(list, button) {
  const willOpen = button.getAttribute('aria-expanded') !== 'true';
  list.querySelectorAll('.badge-row > button').forEach((other) => {
    other.setAttribute('aria-expanded', 'false');
    other.nextElementSibling?.setAttribute('hidden', '');
  });
  button.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) button.nextElementSibling?.removeAttribute('hidden');
}

/**
 * Painel Tripulação: uma linha por agente. A ficha aberta sobrevive às atualizações a cada 15 s.
 * @param {ParentNode} root
 * @param {RenderContext} context
 * @returns {void}
 * @example renderCrew(document, context)
 */
export function renderCrew(root, context) {
  const agents = context.status.agentes;
  const inOrbit = agents.filter((agent) => agent.estado === 'ok').length;
  byId(root, 'crew-meta').innerHTML = `${inOrbit}/${agents.length}<br>EM ÓRBITA`;
  const list = byId(root, 'crew');
  const openId = openAgentId(list);
  const rows = agents.map((agent) => crewRowHtml(agent, context, agent.id === openId)).join('');
  renderInto(list, rows || '<li><p class="flavor">Ninguém a bordo. Estranhamente silencioso.</p></li>');
  list.onclick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.badge-row > button') : null;
    if (button) toggleCrewRow(list, button);
  };
}
