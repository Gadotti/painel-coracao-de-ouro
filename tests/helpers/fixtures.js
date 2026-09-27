import { readFileSync } from 'node:fs';
import { createThemeLookup } from '../../public/js/lib/themeLookup.js';

const root = new URL('../../', import.meta.url);

/** @param {string} relativePath */
export function readProjectFile(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

/** @returns {import('../../public/js/types.js').PanelTheme} */
export function defaultTheme() {
  return JSON.parse(readProjectFile('src/theme/defaultTheme.json'));
}

/**
 * Status de exemplo do repositório (o mesmo documentado no README), com sobrescritas opcionais.
 * @param {Record<string, unknown>} [overrides]
 * @returns {import('../../public/js/types.js').PanelStatus}
 */
export function sampleStatus(overrides = {}) {
  return { ...JSON.parse(readProjectFile('examples/status.example.json')), ...overrides };
}

export function sampleLookup() {
  return createThemeLookup(defaultTheme());
}

/** Momento fixo, no horário local, logo após o status de exemplo. */
export const SAMPLE_NOW = new Date('2026-09-27T11:31:00Z');

/** Coloca o HTML real do painel no documento do jsdom (os scripts não são executados). */
export function loadPanelDom() {
  const html = readProjectFile('public/index.html');
  document.documentElement.innerHTML = html.replace(/^<!doctype html>/i, '');
}
