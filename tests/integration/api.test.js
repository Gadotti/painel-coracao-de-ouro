import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { TEST_STATUS_PATH, TEST_VERSION, buildTestApp } from '../helpers/testApp.js';

describe('API do painel', () => {
  it('GET /healthz responde com a versão', async () => {
    const response = await request(buildTestApp().app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, versao: TEST_VERSION });
  });

  it('GET /api/status entrega status validado e metadados, sem cache', async () => {
    const response = await request(buildTestApp().app).get('/api/status');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.status.host.nome).toBe('nave-exemplo');
    expect(response.body.meta).toMatchObject({ idade_s: 60, velho: false, versao: TEST_VERSION });
  });

  it('sem status.json responde 503 sem revelar o caminho do arquivo', async () => {
    const { app, logger } = buildTestApp({ files: {} });
    const response = await request(app).get('/api/status');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      erro: 'STATUS_INDISPONIVEL',
      mensagem: 'O coletor ainda não enviou sinal.',
    });
    expect(JSON.stringify(response.body)).not.toContain(TEST_STATUS_PATH);
    expect(logger.messages('api.erro')[0].fields.detalhe).toContain(TEST_STATUS_PATH);
  });

  it('status corrompido responde 502', async () => {
    const response = await request(buildTestApp({ files: { [TEST_STATUS_PATH]: '{"x":' } }).app).get(
      '/api/status',
    );
    expect(response.status).toBe(502);
    expect(response.body.erro).toBe('STATUS_INVALIDO');
  });

  it('erro inesperado vira 500 genérico', async () => {
    const statusService = {
      getSnapshot: async () => {
        throw new Error('detalhe interno /etc/segredo');
      },
    };
    const { app, logger } = buildTestApp({ statusService });
    const response = await request(app).get('/api/status');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ erro: 'ERRO_INTERNO', mensagem: 'Algo deu errado a bordo.' });
    expect(logger.messages('api.erro_inesperado')).toHaveLength(1);
  });

  it('GET /api/theme entrega o tema padrão', async () => {
    const response = await request(buildTestApp().app).get('/api/theme');
    expect(response.status).toBe(200);
    expect(response.body.agentes['bot-telegram'].nome).toBe('Eddie');
  });

  it('rota desconhecida de /api responde 404 em JSON', async () => {
    const response = await request(buildTestApp().app).get('/api/nada');
    expect(response.status).toBe(404);
    expect(response.body.erro).toBe('NAO_ENCONTRADO');
  });

  it('serve o painel com CSP rígido e sem x-powered-by', async () => {
    const response = await request(buildTestApp().app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('CORAÇÃO DE OURO');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).toContain("style-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('não serve arquivos ocultos', async () => {
    const response = await request(buildTestApp().app).get('/.env');
    expect(response.status).toBe(404);
  });

  it('registra as requisições sem cabeçalhos', async () => {
    const { app, logger } = buildTestApp();
    await request(app).get('/healthz?token=nao-logar').set('Authorization', 'Basic abc');
    const [entry] = logger.messages('http.requisicao');
    expect(entry.level).toBe('debug');
    expect(entry.fields).toMatchObject({ metodo: 'GET', caminho: '/healthz', status: 200 });
    expect(JSON.stringify(entry)).not.toContain('nao-logar');
  });

  it('erros 5xx sobem o log da requisição para warn', async () => {
    const { app, logger } = buildTestApp({ files: {} });
    await request(app).get('/api/status');
    expect(logger.messages('http.requisicao')[0].level).toBe('warn');
  });
});
