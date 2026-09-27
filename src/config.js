import { ConfigError } from './lib/errors.js';
import { LOG_LEVELS } from './logger.js';
import { parsePasswordHash } from './auth/passwordHasher.js';

/** @typedef {import('./logger.js').LogLevel} LogLevel */

/**
 * @typedef {object} PanelConfig
 * @property {number} port
 * @property {string} host
 * @property {string} statusPath
 * @property {string | null} themePath
 * @property {number} staleAfterSeconds
 * @property {LogLevel} logLevel
 * @property {{ user: string, passwordHash: string } | null} auth
 */

export const CONFIG_DEFAULTS = Object.freeze({
  port: 4242,
  host: '0.0.0.0',
  statusPath: './data/status.json',
  staleAfterSeconds: 180,
  logLevel: /** @type {LogLevel} */ ('info'),
});
const MAX_PORT = 65535;

/**
 * @param {string} variable
 * @param {{ raw: string | undefined, fallback: number, max?: number }} spec
 * @returns {number}
 */
function parsePositiveInteger(variable, { raw, fallback, max = Number.MAX_SAFE_INTEGER }) {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new ConfigError(variable, { received: raw, expected: `inteiro entre 1 e ${max}` });
  }
  return value;
}

/**
 * @param {string | undefined} raw
 * @returns {LogLevel}
 */
function parseLogLevel(raw) {
  if (!raw) return CONFIG_DEFAULTS.logLevel;
  if (!LOG_LEVELS.includes(/** @type {LogLevel} */ (raw))) {
    throw new ConfigError('LOG_LEVEL', { received: raw, expected: LOG_LEVELS.join(' | ') });
  }
  return /** @type {LogLevel} */ (raw);
}

/**
 * Autenticação é opcional, mas meio configurada é erro: usuário sem hash (ou o contrário)
 * deixaria o painel aberto achando que está protegido.
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ user: string, passwordHash: string } | null}
 */
function parseAuth(env) {
  const user = env.PANEL_USER?.trim();
  const passwordHash = env.PANEL_PASSWORD_HASH?.trim();
  if (!user && !passwordHash) return null;
  if (!user || !passwordHash) {
    throw new ConfigError('PANEL_USER/PANEL_PASSWORD_HASH', {
      received: { PANEL_USER: Boolean(user), PANEL_PASSWORD_HASH: Boolean(passwordHash) },
      expected: 'as duas definidas ou nenhuma',
    });
  }
  try {
    parsePasswordHash(passwordHash);
  } catch (error) {
    throw new ConfigError('PANEL_PASSWORD_HASH', {
      received: '(oculto)',
      expected: /** @type {Error} */ (error).message,
    });
  }
  return { user, passwordHash };
}

/**
 * Lê e valida a configuração a partir das variáveis de ambiente.
 * @param {NodeJS.ProcessEnv} env
 * @returns {Readonly<PanelConfig>}
 * @example loadConfig({ PORT: '4242' }).port // 4242
 */
export function loadConfig(env) {
  return Object.freeze({
    port: parsePositiveInteger('PORT', { raw: env.PORT, fallback: CONFIG_DEFAULTS.port, max: MAX_PORT }),
    host: env.HOST || CONFIG_DEFAULTS.host,
    statusPath: env.STATUS_PATH || CONFIG_DEFAULTS.statusPath,
    themePath: env.THEME_PATH || null,
    staleAfterSeconds: parsePositiveInteger('STATUS_STALE_AFTER_S', {
      raw: env.STATUS_STALE_AFTER_S,
      fallback: CONFIG_DEFAULTS.staleAfterSeconds,
    }),
    logLevel: parseLogLevel(env.LOG_LEVEL),
    auth: parseAuth(env),
  });
}
