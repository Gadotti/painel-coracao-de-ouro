import { byId, renderInto, setText } from './dom.js';
import { drawBars } from './bars.js';
import { escapeHtml, formatDuration, formatNumber, formatRate } from '../lib/format.js';

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../lib/history.js').MetricsHistory} MetricsHistory */

const RX_COLOR = '#00e5ff';
const TX_COLOR = '#ffb8ff';
const MIN_SCALE_KBPS = 50;

/**
 * @param {{ label: string, ok: boolean, note?: string }} link
 * @returns {string}
 */
function linkHtml({ label, ok, note }) {
  const extra = note ? ` <span class="st-parado">${escapeHtml(note)}</span>` : '';
  return `<div class="link-st"><span class="led st-${ok ? 'ok' : 'falha'}"></span><span>${escapeHtml(label)}${extra}</span></div>`;
}

/**
 * @param {PanelStatus} status
 * @returns {string}
 */
export function networkLinksHtml(status) {
  const network = status.rede;
  const links = [
    linkHtml({
      label: 'internet',
      ok: network.internet !== false,
      note: network.internet === false ? 'sem rota' : '',
    }),
  ];
  for (const dependency of network.dependencias ?? []) {
    links.push(linkHtml({ label: dependency.nome, ok: dependency.ok, note: dependency.nota }));
  }
  links.push(
    `<div class="link-st"><span class="led info"></span><span>${escapeHtml(network.interface || 'rede')} <span class="st-parado">${escapeHtml(status.host.ip || '')}</span></span></div>`,
  );
  if (network.gateway) {
    links.push(
      `<div class="link-st"><span class="led info"></span><span>gateway <span class="st-parado">${escapeHtml(network.gateway)}</span></span></div>`,
    );
  }
  return links.join('');
}

/**
 * @param {ParentNode} root
 * @param {{ prefix: string, kbps: number | undefined }} rate
 * @returns {void}
 */
function setRate(root, { prefix, kbps }) {
  const { value, unit } = formatRate(kbps ?? 0);
  setText(root, prefix, kbps == null ? '--' : value);
  setText(root, `${prefix}-u`, unit);
}

/**
 * Peixe Babel: tráfego e dependências externas.
 * @param {ParentNode} root
 * @param {{ status: PanelStatus, history: MetricsHistory }} view
 * @returns {void}
 * @example renderBabel(document, { status, history })
 */
export function renderBabel(root, { status, history }) {
  const network = status.rede;
  setRate(root, { prefix: 'net-rx', kbps: network.rx_kbps });
  setRate(root, { prefix: 'net-tx', kbps: network.tx_kbps });
  setText(root, 'net-ping', network.ping_ms == null ? '--' : formatNumber(network.ping_ms));
  const rx = history.values('rx');
  const tx = history.values('tx');
  const max = Math.max(MIN_SCALE_KBPS, ...rx, ...tx);
  drawBars(/** @type {HTMLCanvasElement} */ (byId(root, 'net-spark')), {
    series: [
      { values: rx, color: RX_COLOR },
      { values: tx, color: TX_COLOR, tick: true },
    ],
    max,
    slots: history.capacity,
  });
  const scale = formatRate(max);
  setText(root, 'net-cap', `ESCALA ${scale.value} ${scale.unit}`);
  renderInto(byId(root, 'net-links'), networkLinksHtml(status));
  setText(root, 'net-since', status.host.uptime_s ? formatDuration(status.host.uptime_s) : '—');
}
