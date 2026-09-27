import { describe, expect, it } from '@jest/globals';
import { decodeThrottled } from '../../../public/js/lib/power.js';
import { createHistory } from '../../../public/js/lib/history.js';
import { GHOST_COLORS, createThemeLookup } from '../../../public/js/lib/themeLookup.js';
import { BASELINE_COLOR, computeBarRects } from '../../../public/js/lib/barLayout.js';
import { latestEvents, marvinLine, marvinMood, MARVIN_LINES } from '../../../public/js/lib/mood.js';
import { defaultTheme } from '../../helpers/fixtures.js';

describe('decodeThrottled', () => {
  it.each([
    ['0x0', { situacao: 'estavel', agora: [], desdeBoot: [] }],
    ['0x50000', { situacao: 'historico', agora: [], desdeBoot: ['subtensão', 'throttling'] }],
    [
      '0x50005',
      { situacao: 'agora', agora: ['subtensão', 'throttling'], desdeBoot: ['subtensão', 'throttling'] },
    ],
    [
      '0x8000A',
      { situacao: 'agora', agora: ['frequência limitada', 'limite térmico'], desdeBoot: ['limite térmico'] },
    ],
  ])('%s', (hex, expected) => {
    expect(decodeThrottled(hex)).toEqual({ ...expected, bruto: hex });
  });

  it('sem leitura ou lixo vira desconhecido', () => {
    expect(decodeThrottled(undefined).situacao).toBe('desconhecido');
    expect(decodeThrottled('zz').situacao).toBe('desconhecido');
  });
});

describe('createHistory', () => {
  it('guarda no máximo a capacidade, descartando os mais antigos', () => {
    const history = createHistory(2);
    [1, 2, 3].forEach((cpu) => history.push({ cpu, rx: cpu * 10, tx: 0 }));
    expect(history.values('cpu')).toEqual([2, 3]);
    expect(history.values('rx')).toEqual([20, 30]);
  });

  it('devolve cópias e pode ser zerado', () => {
    const history = createHistory(3);
    history.push({ cpu: 5, rx: 0, tx: 0 });
    history.values('cpu').push(99);
    expect(history.values('cpu')).toEqual([5]);
    history.clear();
    expect(history.values('cpu')).toEqual([]);
  });
});

describe('createThemeLookup', () => {
  const lookup = createThemeLookup(defaultTheme());

  it('traduz ids conhecidos', () => {
    expect(lookup.agent('bot-telegram').nome).toBe('Eddie');
    expect(lookup.program('portainer').sprite).toBe('zaphod');
    expect(lookup.cronName('backup-sd')).toBe('Magrathea · clone do SD');
  });

  it('dá verbete genérico e cores estáveis a ids novos', () => {
    const fresh = createThemeLookup(defaultTheme());
    expect(fresh.agent('novo-1')).toMatchObject({ nome: 'NOVO-1', cor: GHOST_COLORS[0] });
    expect(fresh.agent('novo-2').cor).toBe(GHOST_COLORS[1]);
    expect(fresh.agent('novo-1').cor).toBe(GHOST_COLORS[0]);
    expect(fresh.program('misterio')).toMatchObject({ nome: 'MISTERIO', sprite: 'qbox' });
    expect(fresh.cronName('sem-nome')).toBe('sem-nome');
  });

  it('troca cores inválidas por cores seguras', () => {
    const theme = defaultTheme();
    theme.agentes['bot-telegram'].cor = 'red;x:y';
    theme.programas.portainer.cor = 'url(javascript:x)';
    const unsafe = createThemeLookup(theme);
    expect(unsafe.agent('bot-telegram').cor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(unsafe.program('portainer').cor).toBe('#ffb852');
  });

  it('nomeia a origem de eventos', () => {
    expect(lookup.originName('bot-telegram')).toBe('Eddie');
    expect(lookup.originName('samba')).toBe('Toalha');
    expect(lookup.originName('host')).toBe('host');
    expect(lookup.originName(undefined)).toBe('nave');
  });
});

describe('computeBarRects', () => {
  const size = { width: 40, height: 20 };

  it('desenha a linha de base e colunas proporcionais à direita', () => {
    const rects = computeBarRects({ series: [{ values: [100], color: '#0ff' }], size, max: 100, slots: 4 });
    const baseline = rects.filter((rect) => rect.color === BASELINE_COLOR);
    const bars = rects.filter((rect) => rect.color === '#0ff');
    expect(baseline).toHaveLength(4);
    expect(bars).toHaveLength(4);
    expect(bars.every((rect) => rect.x === 30 && rect.width === 8)).toBe(true);
  });

  it('valor baixo ainda aparece, zero não', () => {
    const rects = computeBarRects({ series: [{ values: [1, 0], color: '#f0f' }], size, max: 100, slots: 2 });
    expect(rects.filter((rect) => rect.color === '#f0f')).toHaveLength(1);
  });

  it('modo tick desenha só o topo', () => {
    const rects = computeBarRects({
      series: [{ values: [100, 0], color: '#ff0', tick: true }],
      size,
      max: 100,
      slots: 2,
    });
    expect(rects.filter((rect) => rect.color === '#ff0')).toHaveLength(1);
  });
});

describe('Marvin', () => {
  const now = new Date('2026-09-27T12:00:00Z');
  const event = (nivel, hoursAgo, texto = 'x') => ({
    ts: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
    nivel,
    texto,
  });

  it('fica mais deprimido com avisos e erros recentes', () => {
    expect(marvinMood([], now)).toBe(55);
    expect(marvinMood([event('aviso', 1), event('erro', 2), event('erro', 30)], now)).toBe(83);
    expect(
      marvinMood(
        Array.from({ length: 5 }, () => event('erro', 1)),
        now,
      ),
    ).toBe(100);
  });

  it('comenta com fala do nível do evento', () => {
    expect(MARVIN_LINES.erro).toContain(marvinLine(event('erro', 1)));
    expect(MARVIN_LINES.info).toContain(marvinLine({ ts: 'x', nivel: '?', texto: 'y' }));
  });

  it('ordena do mais recente e limita', () => {
    const events = [event('info', 5, 'velho'), event('info', 1, 'novo'), event('info', 3, 'meio')];
    expect(latestEvents(events, 2).map((item) => item.texto)).toEqual(['novo', 'meio']);
  });
});
