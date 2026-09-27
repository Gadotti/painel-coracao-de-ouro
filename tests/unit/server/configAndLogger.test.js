import { describe, expect, it } from '@jest/globals';
import { CONFIG_DEFAULTS, loadConfig } from '../../../src/config.js';
import { ConfigError } from '../../../src/lib/errors.js';
import { createLogger } from '../../../src/logger.js';

// Hash sintático válido e obviamente falso (não corresponde a senha nenhuma).
const FAKE_HASH = 'scrypt:1024:8:1:c2FsLWZhbHNv:aGFzaC1mYWxzby1wYXJhLXRlc3Rl';

describe('loadConfig', () => {
  it('usa os padrões sem variáveis', () => {
    expect(loadConfig({})).toEqual({ ...CONFIG_DEFAULTS, themePath: null, auth: null });
  });

  it('lê as variáveis informadas', () => {
    const config = loadConfig({
      PORT: '8080',
      HOST: '127.0.0.1',
      STATUS_PATH: '/dados/status.json',
      THEME_PATH: '/dados/theme.json',
      STATUS_STALE_AFTER_S: '60',
      LOG_LEVEL: 'debug',
      PANEL_USER: 'ford',
      PANEL_PASSWORD_HASH: FAKE_HASH,
    });
    expect(config).toMatchObject({
      port: 8080,
      host: '127.0.0.1',
      statusPath: '/dados/status.json',
      themePath: '/dados/theme.json',
      staleAfterSeconds: 60,
      logLevel: 'debug',
      auth: { user: 'ford', passwordHash: FAKE_HASH },
    });
  });

  it.each([
    [{ PORT: 'abc' }, /PORT inválida: recebido "abc", esperado inteiro entre 1 e 65535/],
    [{ PORT: '70000' }, /PORT inválida/],
    [{ STATUS_STALE_AFTER_S: '0' }, /STATUS_STALE_AFTER_S inválida/],
    [
      { LOG_LEVEL: 'verbose' },
      /LOG_LEVEL inválida: recebido "verbose", esperado debug \| info \| warn \| error/,
    ],
  ])('rejeita %p', (env, message) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
    expect(() => loadConfig(env)).toThrow(message);
  });

  it('rejeita autenticação configurada pela metade', () => {
    expect(() => loadConfig({ PANEL_USER: 'ford' })).toThrow(/as duas definidas ou nenhuma/);
    expect(() => loadConfig({ PANEL_PASSWORD_HASH: FAKE_HASH })).toThrow(ConfigError);
  });

  it('rejeita hash em formato errado sem ecoar o valor', () => {
    const attempt = () => loadConfig({ PANEL_USER: 'ford', PANEL_PASSWORD_HASH: 'senha-em-texto-puro' });
    expect(attempt).toThrow(/PANEL_PASSWORD_HASH inválida: recebido "\(oculto\)"/);
  });
});

describe('createLogger', () => {
  const capture = (level) => {
    const lines = [];
    const logger = createLogger({
      level,
      write: (line) => lines.push(line),
      clock: () => new Date('2026-09-27T12:00:00Z'),
    });
    return { logger, lines };
  };

  it('escreve uma linha JSON por evento, com os campos', () => {
    const { logger, lines } = capture('info');
    logger.info('servidor.no_ar', { porta: 4242 });
    expect(lines).toEqual([
      `${JSON.stringify({ ts: '2026-09-27T12:00:00.000Z', nivel: 'info', msg: 'servidor.no_ar', porta: 4242 })}\n`,
    ]);
  });

  it('respeita o nível mínimo', () => {
    const { logger, lines } = capture('warn');
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(lines.map((line) => JSON.parse(line).msg)).toEqual(['c', 'd']);
  });

  it('serializa erros sem stack trace', () => {
    const { logger, lines } = capture('debug');
    logger.error('falhou', { erro: Object.assign(new Error('quebrou'), { code: 'X1' }) });
    expect(JSON.parse(lines[0]).erro).toEqual({ name: 'Error', message: 'quebrou', code: 'X1' });
  });
});
