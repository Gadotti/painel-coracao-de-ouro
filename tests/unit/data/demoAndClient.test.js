import { describe, expect, it } from '@jest/globals';
import { DEMO_SCENARIOS, createDemoSimulator, parseScenario } from '../../../public/js/data/demoStatus.js';
import { EMPTY_THEME, createStatusClient, nextConnection } from '../../../public/js/data/statusClient.js';
import { validateStatus } from '../../../src/status/statusSchema.js';
import { ScriptedFetch } from '../../fakes/scriptedFetch.js';
import { sampleStatus } from '../../helpers/fixtures.js';

const fixedClock = () => new Date(2026, 8, 27, 10, 0);
const seededRandom = () => {
  let seed = 42;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

describe('createDemoSimulator', () => {
  it.each(DEMO_SCENARIOS)('cenário %s gera status aceito pelo schema do servidor', (scenario) => {
    const simulator = createDemoSimulator({ scenario, random: seededRandom(), clock: fixedClock });
    expect(() => validateStatus(simulator.next())).not.toThrow();
  });

  it('usa só dados fictícios (host e IPs de documentação)', () => {
    const status = createDemoSimulator({ scenario: 'calmo', clock: fixedClock }).next();
    expect(status.host).toMatchObject({ nome: 'nave-exemplo', ip: '192.0.2.10' });
    expect(status.rede.gateway).toBe('192.0.2.1');
  });

  it('calmo tem toda a frota em órbita; pânico derruba serviços e internet', () => {
    const calm = createDemoSimulator({ scenario: 'calmo', clock: fixedClock }).next();
    const panic = createDemoSimulator({ scenario: 'panico', clock: fixedClock }).next();
    expect(calm.agentes.every((agent) => agent.estado === 'ok')).toBe(true);
    expect(panic.programas.find((program) => program.id === 'portainer').estado).toBe('parado');
    expect(panic.rede.internet).toBe(false);
    expect(panic.hardware.throttled).toBe('0x50005');
  });

  it('mantém os sensores dentro das faixas do cenário ao longo do tempo', () => {
    const simulator = createDemoSimulator({ scenario: 'calmo', random: seededRandom(), clock: fixedClock });
    for (let tick = 0; tick < 200; tick++) {
      const { hardware } = simulator.next();
      expect(hardware.cpu_pct).toBeGreaterThanOrEqual(3);
      expect(hardware.cpu_pct).toBeLessThanOrEqual(40);
    }
  });

  it('parseScenario aceita só cenários conhecidos', () => {
    expect(parseScenario('vogons')).toBe('vogons');
    expect(parseScenario('marte')).toBeNull();
    expect(parseScenario(null)).toBeNull();
  });
});

describe('createStatusClient', () => {
  const urls = { statusUrl: '/api/status', themeUrl: '/api/theme' };

  it('devolve status e metadados quando a API responde', async () => {
    const meta = { gerado_em: 'x', idade_s: 1, velho: false, versao: '0.1.0' };
    const fake = new ScriptedFetch({ '/api/status': [{ status: 200, body: { status: sampleStatus(), meta } }] });
    const result = await createStatusClient({ fetchFn: fake.fetch, ...urls }).fetchSnapshot();
    expect(result).toMatchObject({ kind: 'ok', meta });
    expect(fake.calls[0].init).toMatchObject({ cache: 'no-store' });
  });

  it('erro da API é "sem sinal"; falha de rede é "sem conexão"', async () => {
    const fake = new ScriptedFetch({ '/api/status': [{ status: 503 }, new Error('rede caiu')] });
    const client = createStatusClient({ fetchFn: fake.fetch, ...urls });
    expect(await client.fetchSnapshot()).toEqual({ kind: 'sem-sinal' });
    expect(await client.fetchSnapshot()).toEqual({ kind: 'sem-conexao' });
  });

  it('tema cai no vazio quando a API falha', async () => {
    const theme = { agentes: {}, programas: {}, crons: { a: 'A' }, roadmap: [] };
    const fake = new ScriptedFetch({ '/api/theme': [{ status: 200, body: theme }, { status: 500 }, new Error('x')] });
    const client = createStatusClient({ fetchFn: fake.fetch, ...urls });
    expect(await client.fetchTheme()).toEqual(theme);
    expect(await client.fetchTheme()).toBe(EMPTY_THEME);
    expect(await client.fetchTheme()).toBe(EMPTY_THEME);
  });
});

describe('nextConnection', () => {
  const previous = { connection: 'ao-vivo', status: sampleStatus(), meta: null };

  it('status novo substitui o anterior', () => {
    const fresh = sampleStatus({ gerado_em: '2026-09-27T12:00:00Z' });
    expect(nextConnection(previous, { kind: 'ok', status: fresh, meta: null })).toMatchObject({
      connection: 'ao-vivo',
      status: fresh,
    });
  });

  it('em falha mantém o último status na tela', () => {
    expect(nextConnection(previous, { kind: 'sem-conexao' })).toEqual({ ...previous, connection: 'sem-conexao' });
  });
});
