import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_SCRYPT_PARAMS,
  hashPassword,
  parsePasswordHash,
  verifyPassword,
} from '../../../src/auth/passwordHasher.js';

// Custo baixo só para o teste ser rápido; produção usa DEFAULT_SCRYPT_PARAMS.
const FAST = { cost: 1024, blockSize: 8, parallelization: 1 };
const TEST_PASSWORD = 'senha-de-teste-obviamente-falsa';

describe('passwordHasher', () => {
  it('usa custo alto por padrão', () => {
    expect(DEFAULT_SCRYPT_PARAMS.cost).toBeGreaterThanOrEqual(32768);
  });

  it('gera hash no formato scrypt:N:r:p:sal:hash, sem "$"', async () => {
    const hash = await hashPassword(TEST_PASSWORD, FAST);
    expect(hash).toMatch(/^scrypt:1024:8:1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(hash).not.toContain('$');
  });

  it('usa sal aleatório: a mesma senha gera hashes diferentes', async () => {
    expect(await hashPassword(TEST_PASSWORD, FAST)).not.toBe(await hashPassword(TEST_PASSWORD, FAST));
  });

  it('confere a senha certa e recusa a errada', async () => {
    const hash = await hashPassword(TEST_PASSWORD, FAST);
    expect(await verifyPassword(TEST_PASSWORD, hash)).toBe(true);
    expect(await verifyPassword('outra-senha', hash)).toBe(false);
  });

  it('rejeita hash malformado mostrando só o começo', () => {
    expect(() => parsePasswordHash('bcrypt$2b$12$abcdefghijklmnop')).toThrow(
      'Hash de senha inválido: "bcrypt$2b$12…"; esperado scrypt:N:r:p:sal:hash',
    );
  });

  it('interpreta os parâmetros do hash', () => {
    const parsed = parsePasswordHash('scrypt:2048:4:2:c2Fs:aGFzaA');
    expect(parsed.params).toEqual({ cost: 2048, blockSize: 4, parallelization: 2 });
    expect(parsed.salt.toString()).toBe('sal');
  });
});
