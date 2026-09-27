import { validateTheme } from './themeSchema.js';
import { isMissingFile, readJsonFile } from '../lib/jsonFile.js';

/** @typedef {import('../../public/js/types.js').PanelTheme} PanelTheme */
/** @typedef {import('../lib/jsonFile.js').ReadableFileSystem} ReadableFileSystem */
/** @typedef {import('../logger.js').Logger} Logger */

/** @typedef {'padrao' | 'personalizado' | 'padrao-por-falha'} ThemeOrigin */

/**
 * Tema do usuário sobrescreve verbete a verbete; o roadmap, se vier, substitui o padrão inteiro.
 * @param {PanelTheme} base
 * @param {ReturnType<typeof validateTheme>} override
 * @returns {PanelTheme}
 * @example mergeThemes(padrao, { agentes: { meu: {...} }, programas: {}, crons: {} })
 */
export function mergeThemes(base, override) {
  return {
    agentes: { ...base.agentes, ...override.agentes },
    programas: { ...base.programas, ...override.programas },
    crons: { ...base.crons, ...override.crons },
    roadmap: override.roadmap ?? base.roadmap,
  };
}

/**
 * @typedef {object} ThemeServiceOptions
 * @property {unknown} defaultTheme
 * @property {string | null} overridePath
 * @property {ReadableFileSystem} fileSystem
 * @property {Logger} logger
 */

/**
 * Entrega o tema do painel. Um tema personalizado quebrado não derruba o painel:
 * cai no padrão e registra o erro no log.
 * @param {ThemeServiceOptions} options
 * @returns {{ getTheme: () => Promise<{ theme: PanelTheme, origem: ThemeOrigin }> }}
 * @example await createThemeService({ defaultTheme, overridePath: null, fileSystem: fs, logger }).getTheme()
 */
export function createThemeService({ defaultTheme, overridePath, fileSystem, logger }) {
  const base = /** @type {PanelTheme} */ (validateTheme(defaultTheme));
  return {
    async getTheme() {
      if (!overridePath) return { theme: base, origem: 'padrao' };
      try {
        const { content } = await readJsonFile(fileSystem, overridePath);
        return { theme: mergeThemes(base, validateTheme(content)), origem: 'personalizado' };
      } catch (error) {
        const reason = isMissingFile(error) ? 'arquivo não encontrado' : /** @type {Error} */ (error).message;
        logger.error('tema.personalizado_ignorado', { caminho: overridePath, motivo: reason });
        return { theme: base, origem: 'padrao-por-falha' };
      }
    },
  };
}
