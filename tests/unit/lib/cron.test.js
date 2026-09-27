import { describe, expect, it } from '@jest/globals';
import { cronRunsOnDay, describeCron, nextCronRun, parseCron } from '../../../public/js/lib/cron.js';

// 27/09/2026 é um domingo. Datas no horário local para o teste valer em qualquer fuso.
const SUNDAY_10H = new Date(2026, 8, 27, 10, 0);
const local = (month, day, clock = '00:00') => {
  const [hour, minute] = clock.split(':').map(Number);
  return new Date(2026, month - 1, day, hour, minute);
};

describe('parseCron', () => {
  it('interpreta listas, faixas e passos', () => {
    const cron = parseCron('0,30 8-10 * * 1-5');
    expect([...cron.minutes]).toEqual([0, 30]);
    expect([...cron.hours]).toEqual([8, 9, 10]);
    expect(cron.weekdays.has(0)).toBe(false);
  });

  it('trata o domingo como 0 ou 7', () => {
    expect(parseCron('0 3 * * 7').weekdays.has(0)).toBe(true);
  });

  it.each([null, '', 'qualquer coisa', '* * *', 'a * * * *', '*/0 * * * *'])('rejeita %p', (expression) => {
    expect(parseCron(expression)).toBeNull();
  });
});

describe('nextCronRun', () => {
  it.each([
    ['0 3 * * *', local(9, 27, '02:00'), local(9, 27, '03:00')],
    ['0 3 * * 0', SUNDAY_10H, local(10, 4, '03:00')],
    ['*/15 * * * *', local(9, 27, '10:07'), local(9, 27, '10:15')],
    ['@daily', SUNDAY_10H, local(9, 28, '00:00')],
    ['0 0 1 * *', SUNDAY_10H, local(10, 1, '00:00')],
    // Dia do mês e dia da semana restritos: vale o que vier primeiro (dia 13 OU sexta).
    ['0 0 13 * 5', SUNDAY_10H, local(10, 2, '00:00')],
  ])('%s a partir de %s', (expression, from, expected) => {
    expect(nextCronRun(expression, from)).toEqual(expected);
  });

  it('é estritamente depois do instante informado', () => {
    expect(nextCronRun('0 10 * * *', SUNDAY_10H)).toEqual(local(9, 28, '10:00'));
  });

  it('devolve null para expressão inválida ou impossível', () => {
    expect(nextCronRun('xyz', SUNDAY_10H)).toBeNull();
    expect(nextCronRun('0 0 31 2 *', SUNDAY_10H)).toBeNull();
  });
});

describe('cronRunsOnDay', () => {
  it('lista as execuções do dia em ordem', () => {
    expect(cronRunsOnDay('0 */6 * * *', SUNDAY_10H)).toEqual([
      local(9, 27, '00:00'),
      local(9, 27, '06:00'),
      local(9, 27, '12:00'),
      local(9, 27, '18:00'),
    ]);
  });

  it('não lista nada em dia que não casa', () => {
    expect(cronRunsOnDay('0 3 * * 1', SUNDAY_10H)).toEqual([]);
    expect(cronRunsOnDay('inválido', SUNDAY_10H)).toEqual([]);
  });
});

describe('describeCron', () => {
  it.each([
    [null, '—'],
    ['* * * * *', 'a cada minuto'],
    ['*/5 * * * *', 'a cada 5 min'],
    ['15 * * * *', 'de hora em hora (:15)'],
    ['30 4 * * *', 'todo dia às 04:30'],
    ['0 3 * * 0', 'todo domingo às 03:00'],
    ['0 3 * * 7', 'todo domingo às 03:00'],
    ['0 9 * * 1', 'toda segunda às 09:00'],
    ['0 3 1 * *', 'todo dia 1 às 03:00'],
    ['@weekly', 'todo domingo às 00:00'],
    ['0 3 1 6 *', '03:00 (1 6 *)'],
    ['0 */2 * * *', '0 */2 * * *'],
    ['não é cron', 'não é cron'],
  ])('%p → %p', (expression, expected) => {
    expect(describeCron(expression)).toBe(expected);
  });
});
