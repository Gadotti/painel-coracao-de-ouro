import { emptyStatus } from './context.js';
import { renderHeader, renderSourceInfo } from './header.js';
import { renderLane } from './lane.js';
import { renderMotor } from './motor.js';
import { renderCrew } from './crew.js';
import { renderHangar } from './hangar.js';
import { renderBabel } from './babel.js';
import { renderVogon } from './vogon.js';
import { renderMarvin } from './marvin.js';
import { evaluateHealth } from '../lib/health.js';
import { buildLaneModel } from '../lib/laneModel.js';
import { formatRelative } from '../lib/format.js';

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../types.js').StatusMeta} StatusMeta */
/** @typedef {import('../types.js').ConnectionState} ConnectionState */
/** @typedef {import('../types.js').HealthResult} HealthResult */
/** @typedef {import('../lib/themeLookup.js').ThemeLookup} ThemeLookup */
/** @typedef {import('../lib/history.js').MetricsHistory} MetricsHistory */

/**
 * @typedef {object} DashboardState
 * @property {PanelStatus | null} status
 * @property {StatusMeta | null} meta
 * @property {ConnectionState} connection
 * @property {ThemeLookup} lookup
 * @property {MetricsHistory} history
 * @property {Date} now
 * @property {string} hostAddress
 * @property {string} version
 */

/**
 * @param {DashboardState} state
 * @returns {string | null}
 */
function staleDescription(state) {
  if (!state.meta?.velho) return null;
  return `dados velhos (${formatRelative(state.meta.gerado_em, state.now)})`;
}

/**
 * Desenha a ponte de comando inteira a partir do estado atual.
 * @param {ParentNode} root
 * @param {DashboardState} state
 * @returns {HealthResult}
 * @example renderDashboard(document, { status, meta, connection: 'ao-vivo', lookup, history, now: new Date(), hostAddress: 'pi.local', version: '0.1.0' })
 */
export function renderDashboard(root, state) {
  const { lookup, now, history, connection, hostAddress } = state;
  const health = evaluateHealth({
    status: state.status,
    lookup,
    connection,
    staleText: staleDescription(state),
  });
  const status = state.status ?? emptyStatus();
  const context = { status, lookup, now, hostAddress };
  renderHeader(root, { health, connection, status: state.status, hostAddress });
  renderSourceInfo(root, { connection, status: state.status, version: state.version, now });
  renderLane(root, {
    model: buildLaneModel({ crons: status.crons, lookup, now }),
    problems: health.failures.length,
    now,
  });
  renderMotor(root, { status, history });
  renderCrew(root, context);
  renderHangar(root, context);
  renderBabel(root, { status, history });
  renderVogon(root, context);
  renderMarvin(root, context);
  return health;
}
