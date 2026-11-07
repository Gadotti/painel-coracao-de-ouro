/** Parâmetros do front. O servidor tem os seus em src/config.js. */
export const PANEL_CONFIG = Object.freeze({
  // Relativas à página, sem "/" inicial: atrás de um proxy num subcaminho (ex.: /painel/) a
  // chamada vira /painel/api/status; com "/" iria para a raiz do proxy e voltaria 404.
  statusUrl: 'api/status',
  themeUrl: 'api/theme',
  refreshMs: 15000,
  demoTickMs: 2500,
  historyLength: 48,
  demoWarmupSamples: 20,
  clockTickMs: 1000,
  copiedFeedbackMs: 1500,
});
