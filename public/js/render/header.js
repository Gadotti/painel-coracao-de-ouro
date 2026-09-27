import { byId, setText } from './dom.js';
import { formatRelative } from '../lib/format.js';

/** @typedef {import('../types.js').HealthResult} HealthResult */
/** @typedef {import('../types.js').ConnectionState} ConnectionState */
/** @typedef {import('../types.js').PanelStatus} PanelStatus */

const MAX_LISTED_FAILURES = 3;

const BANNERS = Object.freeze({
  '': { titulo: 'NÃO ENTRE EM PÂNICO', sub: 'Tudo em órbita. Leve sua toalha.' },
  warn: { titulo: 'ENTRE EM PÂNICO (SÓ UM POUCO)', sub: '' },
  bad: { titulo: 'ENTRE EM PÂNICO', sub: '' },
});

const BADGES = Object.freeze({
  'ao-vivo': { texto: '● AO VIVO', classe: 'live' },
  simulacao: { texto: '◌ SIMULAÇÃO', classe: 'demo' },
  aguardando: { texto: '… AGUARDANDO', classe: 'demo' },
  'sem-sinal': { texto: '✕ SEM SINAL', classe: 'lost' },
  'sem-conexao': { texto: '✕ SEM CONEXÃO', classe: 'lost' },
});

/**
 * @param {HealthResult} health
 * @returns {string}
 */
export function describeFailures(health) {
  const { failures } = health;
  if (!failures.length) return BANNERS[''].sub;
  const listed = failures
    .slice(0, MAX_LISTED_FAILURES)
    .map((failure) => failure.descricao)
    .join(' · ');
  const more = failures.length > MAX_LISTED_FAILURES ? ' …' : '';
  return `${failures.length} problema${failures.length > 1 ? 's' : ''}: ${listed}${more}`;
}

/**
 * Nota 42, banner "Não entre em pânico" e selo de conexão.
 * @param {ParentNode} root
 * @param {{ health: HealthResult, connection: ConnectionState, status: PanelStatus | null, hostAddress: string }} view
 * @returns {void}
 * @example renderHeader(document, { health, connection: 'ao-vivo', status, hostAddress: 'pi.local' })
 */
export function renderHeader(root, { health, connection, status, hostAddress }) {
  const banner = BANNERS[health.level];
  setText(root, 'score', String(health.score));
  byId(root, 'score').className = `score ${health.level}`;
  byId(root, 'panic').className = `panic ${health.level}`;
  setText(root, 'panic-title', banner.titulo);
  setText(root, 'panic-sub', describeFailures(health));
  setText(root, 'hostname', status?.host?.nome || '—');
  setText(root, 'where', `Setor ZZ9 Plural Z Alfa · ${status?.host?.ip || hostAddress}`);
  const badge = BADGES[connection];
  const badgeElement = byId(root, 'badge');
  badgeElement.className = `badge ${badge.classe}`;
  badgeElement.textContent = badge.texto;
}

/**
 * Rodapé: de onde vieram os dados e versão do painel.
 * @param {ParentNode} root
 * @param {{ connection: ConnectionState, status: PanelStatus | null, version: string, now: Date }} view
 * @returns {void}
 * @example renderSourceInfo(document, { connection: 'ao-vivo', status, version: '0.1.0', now: new Date() })
 */
export function renderSourceInfo(root, { connection, status, version, now }) {
  byId(root, 'demo-ctl').hidden = connection !== 'simulacao';
  const origin =
    connection === 'simulacao'
      ? 'simulação (dados fictícios)'
      : status
        ? `coletor · gerado ${formatRelative(status.gerado_em, now)}`
        : 'nenhum sinal recebido';
  setText(root, 'src', `Fonte: ${origin}${version ? ` · v${version}` : ''}`);
}
