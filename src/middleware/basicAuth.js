import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyPassword } from '../auth/passwordHasher.js';

/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {import('../logger.js').Logger} Logger */

const CHALLENGE = 'Basic realm="Coracao de Ouro", charset="UTF-8"';
// O navegador reenvia o cabeçalho em todo arquivo; sem cache, cada ícone pagaria um scrypt.
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFIED_ENTRIES = 32;

/**
 * @param {string} text
 * @returns {Buffer}
 */
const sha256 = (text) => createHash('sha256').update(text).digest();

/**
 * Compara textos em tempo constante (o hash iguala os tamanhos antes do timingSafeEqual).
 * @param {string} left
 * @param {string} right
 * @returns {boolean}
 */
function sameText(left, right) {
  return timingSafeEqual(sha256(left), sha256(right));
}

/**
 * @param {string | undefined} header
 * @returns {{ user: string, password: string } | null}
 * @example parseBasicAuthorization('Basic ' + btoa('ford:toalha')) // { user: 'ford', password: 'toalha' }
 */
export function parseBasicAuthorization(header) {
  const match = /^Basic ([A-Za-z0-9+/=]+)$/.exec(header ?? '');
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/**
 * @typedef {object} BasicAuthOptions
 * @property {{ user: string, passwordHash: string }} credentials
 * @property {Logger} logger
 * @property {{ verify?: typeof verifyPassword, now?: () => number }} [clockAndVerifier]
 */

/**
 * Exige HTTP Basic com usuário e senha (hash scrypt). Nega por padrão.
 * @param {BasicAuthOptions} options
 * @returns {RequestHandler}
 * @example app.use(createBasicAuth({ credentials: config.auth, logger }))
 */
export function createBasicAuth({ credentials, logger, clockAndVerifier = {} }) {
  const verify = clockAndVerifier.verify ?? verifyPassword;
  const now = clockAndVerifier.now ?? Date.now;
  /** @type {Map<string, number>} */
  const verified = new Map();

  const remember = (/** @type {string} */ key) => {
    if (verified.size >= MAX_VERIFIED_ENTRIES) verified.delete(verified.keys().next().value);
    verified.set(key, now() + VERIFIED_TTL_MS);
  };

  return async (request, response, next) => {
    const header = request.get('authorization') ?? '';
    const cacheKey = sha256(header).toString('hex');
    if ((verified.get(cacheKey) ?? 0) > now()) return next();
    const attempt = parseBasicAuthorization(header);
    // A senha é sempre verificada, mesmo com usuário errado, para o tempo não revelar qual dos dois falhou.
    const passwordOk = attempt ? await verify(attempt.password, credentials.passwordHash) : false;
    if (!attempt || !passwordOk || !sameText(attempt.user, credentials.user)) {
      logger.warn('auth.falha', { ip: request.ip, caminho: request.path });
      response.set('WWW-Authenticate', CHALLENGE);
      return response.status(401).json({ erro: 'NAO_AUTORIZADO', mensagem: 'Credenciais necessárias.' });
    }
    remember(cacheKey);
    logger.info('auth.sucesso', { usuario: credentials.user, ip: request.ip });
    return next();
  };
}
