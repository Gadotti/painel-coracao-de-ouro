import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { hashPassword, verifyPassword } from '../../src/auth/passwordHasher.js';
import { parseBasicAuthorization } from '../../src/middleware/basicAuth.js';
import { AUTH_RATE_LIMIT } from '../../src/middleware/authRateLimit.js';
import { buildTestApp } from '../helpers/testApp.js';

// Credenciais obviamente falsas, só para teste.
const USER = 'usuario-teste';
const PASSWORD = 'senha-teste-falsa-123';
const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

let credentials;
beforeAll(async () => {
  credentials = {
    user: USER,
    passwordHash: await hashPassword(PASSWORD, { cost: 1024, blockSize: 8, parallelization: 1 }),
  };
});

describe('parseBasicAuthorization', () => {
  it('extrai usuário e senha (a senha pode ter ":")', () => {
    expect(parseBasicAuthorization(basic('ford', 'a:b'))).toEqual({ user: 'ford', password: 'a:b' });
  });

  it.each([
    undefined,
    '',
    'Bearer x',
    'Basic !!!',
    `Basic ${Buffer.from('semdoispontos').toString('base64')}`,
  ])('rejeita %p', (header) => {
    expect(parseBasicAuthorization(header)).toBeNull();
  });
});

describe('autenticação HTTP Basic', () => {
  it('sem credenciais: 401 com desafio', async () => {
    const response = await request(buildTestApp({ auth: credentials }).app).get('/api/status');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toMatch(/^Basic realm=/);
    expect(response.body.erro).toBe('NAO_AUTORIZADO');
  });

  it('protege também a página e os arquivos estáticos', async () => {
    expect((await request(buildTestApp({ auth: credentials }).app).get('/')).status).toBe(401);
  });

  it.each([
    ['senha errada', USER, 'errada'],
    ['usuário errado', 'intruso', PASSWORD],
  ])('%s: 401 e registro de auditoria sem o usuário tentado', async (_label, user, password) => {
    const { app, logger } = buildTestApp({ auth: credentials });
    const response = await request(app).get('/api/status').set('Authorization', basic(user, password));
    expect(response.status).toBe(401);
    const [entry] = logger.messages('auth.falha');
    expect(entry.fields).toMatchObject({ caminho: '/api/status' });
    expect(JSON.stringify(entry)).not.toContain(user === USER ? password : user);
  });

  it('credenciais certas liberam o acesso', async () => {
    const { app, logger } = buildTestApp({ auth: credentials });
    const response = await request(app).get('/api/status').set('Authorization', basic(USER, PASSWORD));
    expect(response.status).toBe(200);
    expect(logger.messages('auth.sucesso')[0].fields.usuario).toBe(USER);
  });

  it('/healthz continua público para o HEALTHCHECK', async () => {
    expect((await request(buildTestApp({ auth: credentials }).app).get('/healthz')).status).toBe(200);
  });

  it('reaproveita a verificação até o cache expirar', async () => {
    let calls = 0;
    let now = 0;
    const verify = async (password, hash) => {
      calls++;
      return verifyPassword(password, hash);
    };
    const { app } = buildTestApp({ auth: credentials, authOverrides: { verify, now: () => now } });
    const get = () => request(app).get('/api/theme').set('Authorization', basic(USER, PASSWORD));
    await get();
    await get();
    expect(calls).toBe(1);
    now += 11 * 60 * 1000;
    await get();
    expect(calls).toBe(2);
  });

  it(`bloqueia o IP depois de ${AUTH_RATE_LIMIT.maxFailures} falhas`, async () => {
    const { app } = buildTestApp({ auth: credentials });
    const agent = request(app);
    for (let attempt = 0; attempt < AUTH_RATE_LIMIT.maxFailures; attempt++) {
      await agent.get('/api/status').set('Authorization', basic(USER, 'errada'));
    }
    const blocked = await agent.get('/api/status').set('Authorization', basic(USER, PASSWORD));
    expect(blocked.status).toBe(429);
    expect(blocked.body.erro).toBe('MUITAS_TENTATIVAS');
  });
});
