import { safeColor } from './format.js';

/** @typedef {import('../types.js').PanelTheme} PanelTheme */
/** @typedef {import('../types.js').AgentTheme} AgentTheme */
/** @typedef {import('../types.js').ProgramTheme} ProgramTheme */

/** Cores dos quatro fantasmas, distribuídas entre agentes sem verbete. */
export const GHOST_COLORS = ['#ff3b3b', '#ffb8ff', '#00e5ff', '#ffb852'];
const DEFAULT_PROGRAM_COLOR = '#ffb852';

/**
 * @typedef {object} ThemeLookup
 * @property {(id: string) => AgentTheme} agent
 * @property {(id: string) => ProgramTheme} program
 * @property {(id: string) => string} cronName
 * @property {(id: string | undefined) => string} originName
 * @property {PanelTheme} theme
 */

/**
 * Traduz ids técnicos em verbetes do Guia, com um verbete genérico para ids novos.
 * @param {PanelTheme} theme
 * @returns {ThemeLookup}
 * @example createThemeLookup(theme).agent('bot-telegram').nome // 'Eddie'
 */
export function createThemeLookup(theme) {
  /** @type {Map<string, number>} */
  const newcomers = new Map();
  const newcomerColor = (/** @type {string} */ id) => {
    if (!newcomers.has(id)) newcomers.set(id, newcomers.size);
    return GHOST_COLORS[newcomers.get(id) % GHOST_COLORS.length];
  };

  const agent = (/** @type {string} */ id) => {
    const entry = theme.agentes[id];
    if (entry) return { ...entry, cor: safeColor(entry.cor, newcomerColor(id)) };
    return unknownAgent(id, newcomerColor(id));
  };
  const program = (/** @type {string} */ id) => {
    const entry = theme.programas[id];
    if (entry) return { ...entry, cor: safeColor(entry.cor, DEFAULT_PROGRAM_COLOR) };
    return unknownProgram(id);
  };
  const cronName = (/** @type {string} */ id) => theme.crons[id] ?? id;
  const originName = (/** @type {string | undefined} */ id) =>
    theme.agentes[id]?.nome ?? theme.programas[id]?.nome ?? id ?? 'nave';

  return { agent, program, cronName, originName, theme };
}

/**
 * @param {string} id
 * @param {string} color
 * @returns {AgentTheme}
 */
function unknownAgent(id, color) {
  return {
    nome: id.toUpperCase(),
    papel: 'Tripulante recém-embarcado',
    cor: color,
    desc: 'Sem verbete no Guia ainda.',
    frases: ['Acabei de embarcar. Onde fica a toalha?'],
  };
}

/**
 * @param {string} id
 * @returns {ProgramTheme}
 */
function unknownProgram(id) {
  return {
    nome: id.toUpperCase(),
    sprite: 'qbox',
    cor: DEFAULT_PROGRAM_COLOR,
    desc: 'Sem verbete no Guia ainda.',
    frase: 'Nave não identificada.',
  };
}
