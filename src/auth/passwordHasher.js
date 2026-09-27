import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * @typedef {object} ScryptParams
 * @property {number} cost N — custo de CPU/memória (potência de 2).
 * @property {number} blockSize r
 * @property {number} parallelization p
 */

// N=2^15, r=8 usa 32 MiB por hash: custo alto para força bruta e ainda viável num Pi 3B.
export const DEFAULT_SCRYPT_PARAMS = Object.freeze({ cost: 32768, blockSize: 8, parallelization: 1 });
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_MEMORY_BYTES = 128 * 1024 * 1024;
const HASH_PREFIX = 'scrypt';
const HASH_PATTERN = /^scrypt:(\d+):(\d+):(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/;

/**
 * @param {string} password
 * @param {Buffer} salt
 * @param {ScryptParams} params
 * @returns {Promise<Buffer>}
 */
function deriveKey(password, salt, params) {
  return new Promise((resolve, reject) => {
    const options = {
      N: params.cost,
      r: params.blockSize,
      p: params.parallelization,
      maxmem: MAX_MEMORY_BYTES,
    };
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/**
 * Gera o hash no formato `scrypt:N:r:p:sal:hash` (base64url) — sem `$`, que o Compose interpretaria.
 * @param {string} password
 * @param {ScryptParams} [params]
 * @returns {Promise<string>}
 * @example await hashPassword('uma-frase-longa') // 'scrypt:32768:8:1:...'
 */
export async function hashPassword(password, params = DEFAULT_SCRYPT_PARAMS) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, params);
  const encoded = [
    params.cost,
    params.blockSize,
    params.parallelization,
    salt.toString('base64url'),
    key.toString('base64url'),
  ];
  return [HASH_PREFIX, ...encoded].join(':');
}

/**
 * @param {string} encoded
 * @returns {{ params: ScryptParams, salt: Buffer, key: Buffer }}
 * @example parsePasswordHash('scrypt:32768:8:1:c2Fs:aGFzaA')
 */
export function parsePasswordHash(encoded) {
  const match = HASH_PATTERN.exec(encoded);
  if (!match) {
    throw new Error(`Hash de senha inválido: "${encoded.slice(0, 12)}…"; esperado scrypt:N:r:p:sal:hash`);
  }
  const [, cost, blockSize, parallelization, salt, key] = match;
  return {
    params: { cost: Number(cost), blockSize: Number(blockSize), parallelization: Number(parallelization) },
    salt: Buffer.from(salt, 'base64url'),
    key: Buffer.from(key, 'base64url'),
  };
}

/**
 * Compara em tempo constante a senha informada com o hash guardado.
 * @param {string} password
 * @param {string} encoded
 * @returns {Promise<boolean>}
 * @example await verifyPassword('uma-frase-longa', hash) // true
 */
export async function verifyPassword(password, encoded) {
  const { params, salt, key } = parsePasswordHash(encoded);
  const candidate = await deriveKey(password, salt, params);
  return candidate.length === key.length && timingSafeEqual(candidate, key);
}
