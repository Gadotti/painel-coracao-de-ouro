/** Parâmetros do front. O servidor tem os seus em src/config.js. */
export const PANEL_CONFIG = Object.freeze({
  statusUrl: '/api/status',
  themeUrl: '/api/theme',
  refreshMs: 15000,
  demoTickMs: 2500,
  historyLength: 48,
  demoWarmupSamples: 20,
  clockTickMs: 1000,
  copiedFeedbackMs: 1500,
});
