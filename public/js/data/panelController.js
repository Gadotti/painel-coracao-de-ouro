import { renderDashboard } from '../render/dashboard.js';
import { renderThemeSections } from '../render/guide.js';
import { createThemeLookup } from '../lib/themeLookup.js';
import { createDemoSimulator } from './demoStatus.js';
import { EMPTY_THEME, nextConnection } from './statusClient.js';

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../types.js').PanelTheme} PanelTheme */
/** @typedef {import('../types.js').HealthResult} HealthResult */
/** @typedef {import('../lib/history.js').MetricsHistory} MetricsHistory */
/** @typedef {import('./statusClient.js').ConnectionSnapshot} ConnectionSnapshot */
/** @typedef {import('./statusClient.js').StatusFetchResult} StatusFetchResult */
/** @typedef {import('./demoStatus.js').DemoScenario} DemoScenario */

/**
 * @param {PanelStatus} status
 * @returns {{ cpu: number, rx: number, tx: number }}
 */
export function historySample(status) {
  return { cpu: status.hardware.cpu_pct ?? 0, rx: status.rede.rx_kbps ?? 0, tx: status.rede.tx_kbps ?? 0 };
}

/**
 * @typedef {object} PanelControllerOptions
 * @property {ParentNode} root
 * @property {{ fetchSnapshot: () => Promise<StatusFetchResult> }} client
 * @property {MetricsHistory} history
 * @property {{ clock: () => Date, random?: () => number, hostAddress: string }} environment
 */

/**
 * Mantém o estado da conexão e redesenha o painel a cada novo status (real ou simulado).
 * @param {PanelControllerOptions} options
 * @returns {{
 *   setTheme: (theme: PanelTheme) => void,
 *   refresh: () => Promise<HealthResult>,
 *   startDemo: (scenario: DemoScenario) => void,
 *   tickDemo: () => HealthResult | null,
 *   render: () => HealthResult,
 * }}
 * @example const controller = createPanelController({ root: document, client, history, environment })
 */
export function createPanelController({ root, client, history, environment }) {
  /** @type {ConnectionSnapshot} */
  let snapshot = { connection: 'aguardando', status: null, meta: null };
  let lookup = createThemeLookup(EMPTY_THEME);
  /** @type {{ next: () => PanelStatus } | null} */
  let simulator = null;

  const render = () =>
    renderDashboard(root, {
      ...snapshot,
      lookup,
      history,
      now: environment.clock(),
      hostAddress: environment.hostAddress,
      version: snapshot.meta?.versao ?? '',
    });

  const accept = (/** @type {ConnectionSnapshot} */ next) => {
    snapshot = next;
    if (next.status) history.push(historySample(next.status));
    return render();
  };

  return {
    setTheme(theme) {
      lookup = createThemeLookup(theme);
      renderThemeSections(root, theme);
    },
    async refresh() {
      const result = await client.fetchSnapshot();
      const next = nextConnection(snapshot, result);
      if (result.kind === 'ok') return accept(next);
      // Sem dado novo: só muda o selo de conexão, sem repetir amostra no histórico.
      snapshot = next;
      return render();
    },
    startDemo(scenario) {
      history.clear();
      simulator = createDemoSimulator({ scenario, random: environment.random, clock: environment.clock });
    },
    tickDemo() {
      if (!simulator) return null;
      return accept({ connection: 'simulacao', status: simulator.next(), meta: null });
    },
    render,
  };
}
