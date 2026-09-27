import { byId, renderInto } from './dom.js';
import { describeCron, nextCronRun } from '../lib/cron.js';
import { escapeHtml, formatDuration, formatRelative, formatWhen } from '../lib/format.js';

/** @typedef {import('../types.js').CronStatus} CronStatus */
/** @typedef {import('./context.js').RenderContext} RenderContext */

/** Carimbo da burocracia Vogon para cada resultado. */
export const STAMPS = Object.freeze({
  ok: { texto: 'APROVADO', classe: 'st-ok' },
  falha: { texto: 'INDEFERIDO', classe: 'st-falha' },
  rodando: { texto: 'EM ANÁLISE', classe: 'st-aviso run' },
  aviso: { texto: 'COM RESSALVAS', classe: 'st-aviso' },
  pendente: { texto: 'PENDENTE', classe: 'st-parado' },
});

/**
 * @param {CronStatus['resultado']} result
 * @returns {{ texto: string, classe: string }}
 */
export function stampFor(result) {
  return STAMPS[result ?? 'pendente'] ?? STAMPS.pendente;
}

/**
 * @param {CronStatus} job
 * @param {RenderContext} context
 * @returns {string}
 */
function nextCell(job, context) {
  const next = job.proxima ? new Date(job.proxima) : nextCronRun(job.expressao, context.now);
  if (!next) return '—';
  return `${escapeHtml(formatWhen(next, context.now))}<small>${escapeHtml(formatRelative(next, context.now))}</small>`;
}

/**
 * @param {CronStatus} job
 * @param {RenderContext} context
 * @returns {string}
 */
export function cronRowHtml(job, context) {
  const stamp = stampFor(job.resultado);
  const duration =
    job.duracao_s != null ? `<small>durou ${escapeHtml(formatDuration(job.duracao_s))}</small>` : '';
  return `<tr>
    <td>${escapeHtml(context.lookup.cronName(job.id))}<small>${escapeHtml(job.comando || job.id)}</small></td>
    <td>${escapeHtml(describeCron(job.expressao))}<small>${escapeHtml(job.expressao)}</small></td>
    <td>${escapeHtml(formatRelative(job.ultima, context.now))}${duration}</td>
    <td><span class="stamp ${stamp.classe}">${stamp.texto}</span></td>
    <td>${nextCell(job, context)}</td>
  </tr>`;
}

/**
 * Burocracia Vogon: tabela de crons.
 * @param {ParentNode} root
 * @param {RenderContext} context
 * @returns {void}
 * @example renderVogon(document, context)
 */
export function renderVogon(root, context) {
  const jobs = context.status.crons;
  const approved = jobs.filter((job) => job.resultado === 'ok').length;
  byId(root, 'vogon-meta').innerHTML = `${approved}/${jobs.length}<br>APROVADOS`;
  const rows = jobs.map((job) => cronRowHtml(job, context)).join('');
  renderInto(byId(root, 'vogon'), rows || '<tr><td colspan="5">Nenhum formulário protocolado.</td></tr>');
}
