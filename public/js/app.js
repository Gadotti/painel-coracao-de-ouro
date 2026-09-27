// Ponto de entrada do navegador: liga relógio, eventos, efeitos e o ciclo de atualização.
import { PANEL_CONFIG } from './config.js';
import { createStatusClient } from './data/statusClient.js';
import { createPanelController } from './data/panelController.js';
import { parseScenario } from './data/demoStatus.js';
import { createHistory } from './lib/history.js';
import { pad2, WEEKDAYS_SHORT } from './lib/format.js';
import { byId } from './render/dom.js';
import { renderStaticSprites } from './render/guide.js';
import { createImprobabilityDrive, playFanfare } from './effects/improbability.js';
import { startStarfield } from './effects/starfield.js';

/** @typedef {import('./data/demoStatus.js').DemoScenario} DemoScenario */

/**
 * `?demo` ou `?cenario=vogons` ligam a simulação. Nunca é automática: em produção,
 * dado fictício escondendo uma queda do coletor seria pior que painel vazio.
 * @param {URLSearchParams} params
 * @returns {DemoScenario | null}
 */
function requestedScenario(params) {
  return parseScenario(params.get('cenario')) ?? (params.has('demo') ? 'calmo' : null);
}

function tickClock() {
  const now = new Date();
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const date = `${WEEKDAYS_SHORT[now.getDay()].toUpperCase()} ${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}`;
  byId(document, 'clock').textContent = `${time} · ${date}`;
}

/**
 * @param {HTMLElement} button
 * @returns {void}
 */
function copyShare(button) {
  const text = button.dataset.copy;
  const confirmCopied = () => {
    button.textContent = 'COPIADO!';
    setTimeout(() => (button.textContent = 'COPIAR'), PANEL_CONFIG.copiedFeedbackMs);
  };
  navigator.clipboard?.writeText(text).then(confirmCopied, () => prompt('Copie o endereço:', text));
}

/**
 * @param {{ onScenario: (scenario: DemoScenario) => void, onResize: () => void }} handlers
 * @returns {void}
 */
function wireEvents({ onScenario, onResize }) {
  const guide = /** @type {HTMLDialogElement} */ (byId(document, 'guia'));
  const drive = createImprobabilityDrive({
    doc: document,
    playSound: () => playFanfare(globalThis.AudioContext),
  });
  byId(document, 'btn-guia').addEventListener('click', () => guide.showModal());
  byId(document, 'guia-close').addEventListener('click', () => guide.close());
  byId(document, 'btn-improb').addEventListener('click', () => drive.trigger());
  byId(document, 'cenario').addEventListener('change', (event) => {
    const scenario = parseScenario(/** @type {HTMLSelectElement} */ (event.target).value);
    if (scenario) onScenario(scenario);
  });
  document.addEventListener('click', (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest?.('[data-copy]');
    if (button) copyShare(/** @type {HTMLElement} */ (button));
  });
  globalThis.addEventListener('resize', onResize);
}

async function main() {
  const client = createStatusClient({
    fetchFn: (url, init) => fetch(url, init),
    statusUrl: PANEL_CONFIG.statusUrl,
    themeUrl: PANEL_CONFIG.themeUrl,
  });
  const controller = createPanelController({
    root: document,
    client,
    history: createHistory(PANEL_CONFIG.historyLength),
    environment: { clock: () => new Date(), hostAddress: location.hostname || 'localhost' },
  });
  const startDemo = (/** @type {DemoScenario} */ scenario) => {
    controller.startDemo(scenario);
    for (let sample = 0; sample < PANEL_CONFIG.demoWarmupSamples; sample++) controller.tickDemo();
  };

  renderStaticSprites(document);
  startStarfield(/** @type {HTMLCanvasElement} */ (byId(document, 'stars')), {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  tickClock();
  setInterval(tickClock, PANEL_CONFIG.clockTickMs);
  wireEvents({ onScenario: startDemo, onResize: () => controller.render() });
  controller.setTheme(await client.fetchTheme());

  const scenario = requestedScenario(new URLSearchParams(location.search));
  if (scenario) {
    /** @type {HTMLSelectElement} */ (byId(document, 'cenario')).value = scenario;
    startDemo(scenario);
    setInterval(() => controller.tickDemo(), PANEL_CONFIG.demoTickMs);
    return;
  }
  await controller.refresh();
  setInterval(() => controller.refresh(), PANEL_CONFIG.refreshMs);
}

main();
