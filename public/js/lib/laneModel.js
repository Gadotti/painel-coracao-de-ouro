import { cronRunsOnDay, nextCronRun } from './cron.js';
import { pad2 } from './format.js';

/** @typedef {import('../types.js').CronStatus} CronStatus */
/** @typedef {import('./themeLookup.js').ThemeLookup} ThemeLookup */

const MINUTES_PER_DAY = 1440;
const PERCENT = 100;
/** Jobs que rodam mais que isso por dia (ex.: a cada minuto) poluiriam a rota. */
export const MAX_PELLETS_PER_JOB = 4;

/**
 * @typedef {object} LanePellet
 * @property {number} posicaoPct
 * @property {boolean} comida
 * @property {string} rotulo
 */

/**
 * @typedef {object} LaneModel
 * @property {number} posicaoPct
 * @property {LanePellet[]} pastilhas
 * @property {{ nome: string, quando: Date } | null} proxima
 */

/**
 * @param {Date} moment
 * @returns {number}
 */
function dayPercent(moment) {
  return ((moment.getHours() * 60 + moment.getMinutes()) / MINUTES_PER_DAY) * PERCENT;
}

/**
 * @param {CronStatus} job
 * @param {Date} now
 * @returns {Date | null}
 */
function nextRunOf(job, now) {
  return job.proxima ? new Date(job.proxima) : nextCronRun(job.expressao, now);
}

/**
 * Monta a "rota hiperespacial do dia": posição do Pac-Man e pastilhas dos crons de hoje.
 * @param {{ crons: CronStatus[], lookup: ThemeLookup, now: Date }} input
 * @returns {LaneModel}
 * @example buildLaneModel({ crons: [], lookup, now: new Date() }).pastilhas // []
 */
export function buildLaneModel({ crons, lookup, now }) {
  /** @type {LanePellet[]} */
  const pastilhas = [];
  /** @type {{ nome: string, quando: Date } | null} */
  let proxima = null;
  for (const job of crons) {
    const runs = cronRunsOnDay(job.expressao, now);
    if (runs.length > MAX_PELLETS_PER_JOB) continue;
    const nome = lookup.cronName(job.id);
    for (const run of runs) pastilhas.push(pelletFor({ run, nome, now }));
    const next = nextRunOf(job, now);
    if (next && (!proxima || next < proxima.quando)) proxima = { nome, quando: next };
  }
  return { posicaoPct: dayPercent(now), pastilhas, proxima };
}

/**
 * @param {{ run: Date, nome: string, now: Date }} input
 * @returns {LanePellet}
 */
function pelletFor({ run, nome, now }) {
  return {
    posicaoPct: dayPercent(run),
    comida: run < now,
    rotulo: `${nome} · ${pad2(run.getHours())}:${pad2(run.getMinutes())}`,
  };
}
