import { describe, expect, it } from '@jest/globals';
import {
  escapeHtml,
  formatDuration,
  formatNumber,
  formatRate,
  formatRelative,
  formatWhen,
  pad2,
  pickStable,
  safeColor,
  safeHttpUrl,
} from '../../../public/js/lib/format.js';

const NOW = new Date(2026, 8, 27, 10, 0, 0);
const minutesFromNow = (minutes) => new Date(NOW.getTime() + minutes * 60000);

describe('escapeHtml', () => {
  it('escapa os cinco caracteres perigosos', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('trata null e undefined como texto vazio', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('números', () => {
  it('pad2 completa com zero à esquerda', () => {
    expect(pad2(7)).toBe('07');
    expect(pad2('12')).toBe('12');
  });

  it('formatNumber usa o formato pt-BR', () => {
    expect(formatNumber(1234.5, 1)).toBe('1.234,5');
    expect(formatNumber(0.456, 2)).toBe('0,46');
  });

  it('formatRate troca para Mb/s a partir de 1000 kb/s', () => {
    expect(formatRate(180)).toEqual({ value: '180', unit: 'kb/s' });
    expect(formatRate(1500)).toEqual({ value: '1,5', unit: 'Mb/s' });
  });
});

describe('formatRelative', () => {
  it.each([
    [null, '—'],
    [minutesFromNow(0.3), 'agora'],
    [minutesFromNow(-5), 'há 5 min'],
    [minutesFromNow(120), 'em 2 h'],
    [minutesFromNow(-3 * 1440), 'há 3 d'],
  ])('%s → %s', (moment, expected) => {
    expect(formatRelative(moment, NOW)).toBe(expected);
  });
});

describe('formatWhen', () => {
  it('mostra "hoje" para o mesmo dia', () => {
    expect(formatWhen(new Date(2026, 8, 27, 8, 30), NOW)).toBe('hoje 08:30');
  });

  it('mostra o dia da semana até 6 dias de distância', () => {
    expect(formatWhen(new Date(2026, 8, 25, 8, 30), NOW)).toBe('sex 08:30');
  });

  it('mostra dia/mês para datas mais distantes', () => {
    expect(formatWhen(new Date(2026, 8, 17, 8, 30), NOW)).toBe('17/09 08:30');
  });

  it('devolve travessão sem data', () => {
    expect(formatWhen(undefined, NOW)).toBe('—');
  });
});

describe('formatDuration', () => {
  it.each([
    [12, '12 s'],
    [-5, '0 s'],
    [1080, '18 min'],
    [3 * 3600 + 5 * 60, '3 h 05 min'],
    [12 * 86400 + 3 * 3600, '12 d 03 h'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('pickStable', () => {
  it('escolhe sempre o mesmo item para a mesma chave', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(pickStable(list, 'eddie')).toBe(pickStable(list, 'eddie'));
    expect(list).toContain(pickStable(list, 'marvin'));
  });
});

describe('sanitização de atributos', () => {
  it('safeColor só aceita #rrggbb', () => {
    expect(safeColor('#00e5ff', '#fff')).toBe('#00e5ff');
    expect(safeColor('red;background:url(x)', '#fff')).toBe('#fff');
    expect(safeColor(42, '#fff')).toBe('#fff');
  });

  it('safeHttpUrl bloqueia esquemas que não sejam http(s)', () => {
    expect(safeHttpUrl('http://192.0.2.10:9000')).toBe('http://192.0.2.10:9000/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('não é url')).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
