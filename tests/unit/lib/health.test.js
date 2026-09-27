import { describe, expect, it } from '@jest/globals';
import {
  PERFECT_SCORE,
  evaluateHealth,
  hardwareChecks,
  scoreChecks,
  scoreLevel,
} from '../../../public/js/lib/health.js';
import { normalizeState, stateLabel } from '../../../public/js/lib/states.js';
import { sampleLookup, sampleStatus } from '../../helpers/fixtures.js';

const lookup = sampleLookup();
const failuresOf = (result) => result.failures.map((failure) => failure.descricao);

describe('evaluateHealth', () => {
  it('dá 42 quando tudo está em órbita', () => {
    const result = evaluateHealth({ status: sampleStatus(), lookup, connection: 'ao-vivo' });
    expect(result).toMatchObject({ score: PERFECT_SCORE, level: '', failures: [] });
  });

  it('lista o problema e baixa a nota', () => {
    const status = sampleStatus();
    status.hardware.cpu_pct = 90;
    const result = evaluateHealth({ status, lookup, connection: 'ao-vivo' });
    expect(failuresOf(result)).toEqual(['CPU acima de 85%']);
    expect(result.score).toBeLessThan(PERFECT_SCORE);
    expect(result.level).toBe('warn');
  });

  it('usa os nomes do Guia para agentes, programas e crons com problema', () => {
    const status = sampleStatus();
    status.agentes[0].estado = 'falha';
    status.programas[1].estado = 'parado';
    status.crons[0].resultado = 'falha';
    const result = evaluateHealth({ status, lookup, connection: 'ao-vivo' });
    expect(failuresOf(result)).toEqual([
      'Eddie pânico',
      'Segunda Cabeça à deriva',
      'cron Magrathea · clone do SD indeferido',
    ]);
  });

  it('considera dependências externas e internet', () => {
    const status = sampleStatus();
    status.rede.internet = false;
    status.rede.dependencias[0].ok = false;
    expect(failuresOf(evaluateHealth({ status, lookup, connection: 'ao-vivo' }))).toEqual([
      'sem internet',
      'api do chat inalcançável',
    ]);
  });

  it('marca dados velhos e perda de sinal', () => {
    const stale = evaluateHealth({
      status: sampleStatus(),
      lookup,
      connection: 'ao-vivo',
      staleText: 'dados velhos',
    });
    const noSignal = evaluateHealth({ status: sampleStatus(), lookup, connection: 'sem-sinal' });
    const noConnection = evaluateHealth({ status: sampleStatus(), lookup, connection: 'sem-conexao' });
    expect(failuresOf(stale)).toEqual(['dados velhos']);
    expect(failuresOf(noSignal)).toEqual(['sem sinal do coletor']);
    expect(failuresOf(noConnection)).toEqual(['sem conexão com a ponte de comando']);
  });

  it('dá zero sem nenhum status recebido', () => {
    expect(evaluateHealth({ status: null, lookup, connection: 'sem-conexao' })).toMatchObject({
      score: 0,
      level: 'bad',
    });
    expect(failuresOf(evaluateHealth({ status: null, lookup, connection: 'aguardando' }))).toEqual([
      'aguardando o primeiro sinal',
    ]);
  });
});

describe('hardwareChecks', () => {
  it('aponta temperatura, RAM, disco e energia', () => {
    const checks = hardwareChecks({
      cpu_pct: 10,
      temp_c: 80,
      ram: { usado_mb: 950, total_mb: 1000 },
      disco: { usado_gb: 29, total_gb: 30 },
      throttled: '0x50000',
    });
    expect(checks.filter((item) => !item.ok).map((item) => item.descricao)).toEqual([
      'núcleo a 80 °C',
      'RAM quase cheia',
      'cartão SD acima de 90%',
      'alerta de energia/throttling',
    ]);
  });

  it('não acusa nada sem leituras', () => {
    expect(hardwareChecks({}).every((item) => item.ok)).toBe(true);
  });
});

describe('nota e nível', () => {
  it('scoreChecks é proporcional e 42 sem checagens', () => {
    expect(scoreChecks([])).toBe(42);
    expect(
      scoreChecks([
        { ok: true, descricao: '' },
        { ok: false, descricao: '' },
      ]),
    ).toBe(21);
  });

  it.each([
    [42, ''],
    [34, 'warn'],
    [33, 'bad'],
  ])('%i → %p', (score, level) => {
    expect(scoreLevel(score)).toBe(level);
  });
});

describe('estados', () => {
  it('estado desconhecido nunca parece saudável', () => {
    expect(normalizeState('qualquer')).toBe('parado');
    expect(stateLabel('falha').tema).toBe('PÂNICO');
  });
});
