import { byId, renderInto } from './dom.js';
import { stateChip } from './widgets.js';
import { renderSprite } from '../sprites/sprite.js';
import { escapeHtml, formatNumber, formatRelative, safeHttpUrl } from '../lib/format.js';
import { normalizeState } from '../lib/states.js';

/** @typedef {import('../types.js').ProgramStatus} ProgramStatus */
/** @typedef {import('./context.js').RenderContext} RenderContext */

/**
 * @param {ProgramStatus} program
 * @param {Date} now
 * @returns {string}
 */
export function programStats(program, now) {
  const running = program.estado !== 'parado';
  const stats = [];
  if (running && program.cpu_pct != null) stats.push(`cpu ${formatNumber(program.cpu_pct, 1)}%`);
  if (running && program.mem_mb != null) stats.push(`${formatNumber(program.mem_mb)} MB`);
  if (program.desde) stats.push(`${running ? 'no ar' : 'parado'} ${formatRelative(program.desde, now)}`);
  return stats.join(' · ');
}

/**
 * Botão de ação: copiar o compartilhamento (Samba) ou abrir o serviço numa nova aba.
 * @param {ProgramStatus} program
 * @param {string} hostAddress
 * @returns {string}
 */
export function programAction(program, hostAddress) {
  if (program.compartilhamento) {
    const share = escapeHtml(program.compartilhamento);
    return `<button class="btn sm alt" type="button" data-copy="${share}" title="Copiar ${share}">COPIAR</button>`;
  }
  const url = safeHttpUrl(program.url ?? (program.porta ? `http://${hostAddress}:${program.porta}` : null));
  return url
    ? `<a class="btn sm" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">ABRIR ▸</a>`
    : '';
}

/**
 * @param {ProgramStatus} program
 * @returns {string}
 */
function programDetails(program) {
  const port = program.porta ? ` · :${program.porta}` : '';
  const share = program.compartilhamento ? ` · ${escapeHtml(program.compartilhamento)}` : '';
  return `${escapeHtml(program.id)} · ${escapeHtml(program.tipo || '?')}${port}${share}`;
}

/**
 * @param {ProgramStatus} program
 * @param {RenderContext} context
 * @returns {string}
 */
export function shipHtml(program, context) {
  const theme = context.lookup.program(program.id);
  const state = normalizeState(program.estado);
  return `<li class="ship" data-state="${state}" data-color="${theme.cor}" title="${escapeHtml(theme.frase)}">
    ${renderSprite(theme.sprite, { scale: 3 })}
    <div><b>${escapeHtml(theme.nome.toUpperCase())}</b><small>${programDetails(program)}</small></div>
    <div class="stats">${escapeHtml(programStats(program, context.now))}</div>
    <div class="acts">${stateChip(state)}${programAction(program, context.hostAddress)}</div>
  </li>`;
}

/**
 * Painel Hangar: programas, containers e serviços.
 * @param {ParentNode} root
 * @param {RenderContext} context
 * @returns {void}
 * @example renderHangar(document, context)
 */
export function renderHangar(root, context) {
  const programs = context.status.programas;
  const online = programs.filter((program) => program.estado === 'ok').length;
  byId(root, 'hangar-meta').innerHTML = `${online}/${programs.length}<br>NO AR`;
  const ships = programs.map((program) => shipHtml(program, context)).join('');
  renderInto(byId(root, 'hangar'), ships || '<li class="flavor">Hangar vazio.</li>');
}
