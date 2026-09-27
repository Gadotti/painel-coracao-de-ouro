import { pad2 } from './format.js';

const CRON_ALIASES = /** @type {Record<string, string>} */ ({
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
});
const CRON_FIELD_COUNT = 5;
const SEARCH_LIMIT_DAYS = 400;
const MS_PER_DAY = 86400000;
const WEEKDAYS_WITH_ARTICLE = [
  'todo domingo',
  'toda segunda',
  'toda terça',
  'toda quarta',
  'toda quinta',
  'toda sexta',
  'todo sábado',
];

/**
 * @typedef {object} ParsedCron
 * @property {Set<number>} minutes
 * @property {Set<number>} hours
 * @property {Set<number>} daysOfMonth
 * @property {Set<number>} months
 * @property {Set<number>} weekdays
 * @property {boolean} anyDayOfMonth
 * @property {boolean} anyWeekday
 */

/**
 * @param {string} expression
 * @returns {string[] | null}
 */
function splitFields(expression) {
  const normalized = (CRON_ALIASES[expression.trim()] ?? expression).trim();
  const fields = normalized.split(/\s+/);
  return fields.length === CRON_FIELD_COUNT ? fields : null;
}

/**
 * @param {string} part
 * @param {{ min: number, max: number }} range
 * @returns {{ from: number, to: number, step: number }}
 */
function parseRangePart(part, range) {
  const [base, stepText] = part.split('/');
  const step = stepText ? Number(stepText) : 1;
  if (base === '*') return { from: range.min, to: range.max, step };
  if (base.includes('-')) {
    const [from, to] = base.split('-').map(Number);
    return { from, to, step };
  }
  const single = Number(base);
  return { from: single, to: stepText ? range.max : single, step };
}

/**
 * @param {string} field
 * @param {{ min: number, max: number }} range
 * @returns {Set<number>}
 */
function parseField(field, range) {
  const values = new Set();
  for (const part of field.split(',')) {
    const { from, to, step } = parseRangePart(part, range);
    if (![from, to, step].every(Number.isInteger) || step < 1) {
      throw new Error(`Campo de cron inválido: "${field}" (esperado número, lista, faixa ou */n)`);
    }
    for (let value = from; value <= to; value += step) values.add(value);
  }
  return values;
}

/**
 * Interpreta cron de 5 campos (ou atalhos `@daily` etc.). Retorna null se não entender.
 * @param {string | null | undefined} expression
 * @returns {ParsedCron | null}
 * @example parseCron('0 3 * * 0')?.hours.has(3) // true
 */
export function parseCron(expression) {
  if (!expression) return null;
  const fields = splitFields(expression);
  if (!fields) return null;
  try {
    const weekdays = parseField(fields[4], { min: 0, max: 7 });
    if (weekdays.has(7)) weekdays.add(0);
    return {
      minutes: parseField(fields[0], { min: 0, max: 59 }),
      hours: parseField(fields[1], { min: 0, max: 23 }),
      daysOfMonth: parseField(fields[2], { min: 1, max: 31 }),
      months: parseField(fields[3], { min: 1, max: 12 }),
      weekdays,
      anyDayOfMonth: fields[2] === '*',
      anyWeekday: fields[4] === '*',
    };
  } catch {
    return null;
  }
}

/**
 * Regra do cron: se dia-do-mês e dia-da-semana forem restritos, basta um deles casar.
 * @param {ParsedCron} cron
 * @param {Date} moment
 * @returns {boolean}
 */
function matchesDay(cron, moment) {
  if (!cron.months.has(moment.getMonth() + 1)) return false;
  const dayOfMonth = cron.daysOfMonth.has(moment.getDate());
  const weekday = cron.weekdays.has(moment.getDay());
  if (cron.anyDayOfMonth || cron.anyWeekday) return dayOfMonth && weekday;
  return dayOfMonth || weekday;
}

/**
 * Avança o cursor até o próximo candidato; retorna true quando o minuto atual casa.
 * @param {ParsedCron} cron
 * @param {Date} cursor
 * @returns {boolean}
 */
function stepTowardsMatch(cron, cursor) {
  if (!matchesDay(cron, cursor)) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
    return false;
  }
  if (!cron.hours.has(cursor.getHours())) {
    cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
    return false;
  }
  if (!cron.minutes.has(cursor.getMinutes())) {
    cursor.setMinutes(cursor.getMinutes() + 1);
    return false;
  }
  return true;
}

/**
 * Próxima execução estritamente depois de `from`.
 * @param {string | null | undefined} expression
 * @param {Date} from
 * @returns {Date | null}
 * @example nextCronRun('0 3 * * *', new Date('2026-01-01T02:00')) // 2026-01-01T03:00 local
 */
export function nextCronRun(expression, from) {
  const cron = parseCron(expression);
  if (!cron) return null;
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = from.getTime() + SEARCH_LIMIT_DAYS * MS_PER_DAY;
  while (cursor.getTime() < limit) {
    if (stepTowardsMatch(cron, cursor)) return cursor;
  }
  return null;
}

/**
 * Todas as execuções previstas no dia de `day` (horário local).
 * @param {string | null | undefined} expression
 * @param {Date} day
 * @returns {Date[]}
 * @example cronRunsOnDay('0 3 * * *', new Date()).length // 1
 */
export function cronRunsOnDay(expression, day) {
  const cron = parseCron(expression);
  const midnight = new Date(day);
  midnight.setHours(0, 0, 0, 0);
  if (!cron || !matchesDay(cron, midnight)) return [];
  const runs = [];
  for (const hour of [...cron.hours].sort((a, b) => a - b)) {
    for (const minute of [...cron.minutes].sort((a, b) => a - b)) {
      const run = new Date(midnight);
      run.setHours(hour, minute);
      runs.push(run);
    }
  }
  return runs;
}

/**
 * Descrição em português para os formatos mais comuns; senão devolve a expressão.
 * @param {string | null | undefined} expression
 * @returns {string}
 * @example describeCron('0 3 * * 0') // 'todo domingo às 03:00'
 */
export function describeCron(expression) {
  if (!expression) return '—';
  const fields = splitFields(expression);
  if (!fields) return expression;
  const [minute, hour, dayOfMonth, month, weekday] = fields;
  const isNumber = (/** @type {string} */ text) => /^\d+$/.test(text);
  const restIsAny = dayOfMonth === '*' && month === '*' && weekday === '*';
  if (fields.join(' ') === '* * * * *') return 'a cada minuto';
  if (/^\*\/\d+$/.test(minute) && hour === '*' && restIsAny) return `a cada ${minute.slice(2)} min`;
  if (isNumber(minute) && hour === '*' && restIsAny) return `de hora em hora (:${pad2(minute)})`;
  if (!isNumber(minute) || !isNumber(hour)) return fields.join(' ');
  return describeDaily({ clock: `${pad2(hour)}:${pad2(minute)}`, dayOfMonth, month, weekday });
}

/**
 * @param {{ clock: string, dayOfMonth: string, month: string, weekday: string }} parts
 * @returns {string}
 */
function describeDaily({ clock, dayOfMonth, month, weekday }) {
  const everyMonth = month === '*';
  if (dayOfMonth === '*' && everyMonth && weekday === '*') return `todo dia às ${clock}`;
  if (dayOfMonth === '*' && everyMonth && /^[0-7]$/.test(weekday)) {
    return `${WEEKDAYS_WITH_ARTICLE[Number(weekday) % 7]} às ${clock}`;
  }
  if (/^\d+$/.test(dayOfMonth) && everyMonth && weekday === '*') return `todo dia ${dayOfMonth} às ${clock}`;
  return `${clock} (${dayOfMonth} ${month} ${weekday})`;
}
