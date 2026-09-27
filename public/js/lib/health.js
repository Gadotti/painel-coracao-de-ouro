import { formatNumber } from './format.js';
import { stateLabel } from './states.js';

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../types.js').HardwareInfo} HardwareInfo */
/** @typedef {import('../types.js').NetworkInfo} NetworkInfo */
/** @typedef {import('../types.js').HealthCheck} HealthCheck */
/** @typedef {import('../types.js').HealthResult} HealthResult */
/** @typedef {import('../types.js').HealthLevel} HealthLevel */
/** @typedef {import('../types.js').ConnectionState} ConnectionState */
/** @typedef {import('./themeLookup.js').ThemeLookup} ThemeLookup */

export const HEALTH_LIMITS = Object.freeze({ cpuPct: 85, tempC: 75, ramPct: 90, diskPct: 90 });
/** A Resposta. */
export const PERFECT_SCORE = 42;
export const WARNING_SCORE = 34;
const PERCENT = 100;

/**
 * @param {boolean} ok
 * @param {string} descricao
 * @returns {HealthCheck}
 */
const check = (ok, descricao) => ({ ok, descricao });

/**
 * @param {HardwareInfo} hardware
 * @returns {HealthCheck[]}
 */
export function hardwareChecks(hardware) {
  const ramPct = hardware.ram ? (hardware.ram.usado_mb / hardware.ram.total_mb) * PERCENT : 0;
  const diskPct = hardware.disco ? (hardware.disco.usado_gb / hardware.disco.total_gb) * PERCENT : 0;
  const throttled = hardware.throttled ? parseInt(hardware.throttled, 16) : 0;
  return [
    check((hardware.cpu_pct ?? 0) < HEALTH_LIMITS.cpuPct, `CPU acima de ${HEALTH_LIMITS.cpuPct}%`),
    check((hardware.temp_c ?? 0) < HEALTH_LIMITS.tempC, `núcleo a ${formatNumber(hardware.temp_c ?? 0)} °C`),
    check(ramPct < HEALTH_LIMITS.ramPct, 'RAM quase cheia'),
    check(diskPct < HEALTH_LIMITS.diskPct, `cartão SD acima de ${HEALTH_LIMITS.diskPct}%`),
    check(throttled === 0, 'alerta de energia/throttling'),
  ];
}

/**
 * @param {NetworkInfo} network
 * @returns {HealthCheck[]}
 */
export function networkChecks(network) {
  const dependencies = (network.dependencias ?? []).map((dependency) =>
    check(dependency.ok, `${dependency.nome} inalcançável`),
  );
  return [check(network.internet !== false, 'sem internet'), ...dependencies];
}

/**
 * @param {PanelStatus} status
 * @param {ThemeLookup} lookup
 * @returns {HealthCheck[]}
 */
export function fleetChecks(status, lookup) {
  const unitCheck = (/** @type {string} */ name, /** @type {string} */ state) =>
    check(state === 'ok', `${name} ${stateLabel(state).tema.toLowerCase()}`);
  return [
    ...status.agentes.map((agent) => unitCheck(lookup.agent(agent.id).nome, agent.estado)),
    ...status.programas.map((program) => unitCheck(lookup.program(program.id).nome, program.estado)),
    ...status.crons.map((job) =>
      check(job.resultado !== 'falha', `cron ${lookup.cronName(job.id)} indeferido`),
    ),
  ];
}

/**
 * @param {ConnectionState} connection
 * @param {string | null} staleText
 * @returns {HealthCheck[]}
 */
function connectionChecks(connection, staleText) {
  if (connection === 'sem-conexao') return [check(false, 'sem conexão com a ponte de comando')];
  if (connection === 'sem-sinal') return [check(false, 'sem sinal do coletor')];
  if (staleText) return [check(false, staleText)];
  return [];
}

/**
 * Nota de 0 a 42 proporcional às checagens que passaram.
 * @param {HealthCheck[]} checks
 * @returns {number}
 * @example scoreChecks([{ ok: true, descricao: '' }]) // 42
 */
export function scoreChecks(checks) {
  if (!checks.length) return PERFECT_SCORE;
  const passed = checks.filter((item) => item.ok).length;
  return Math.round((PERFECT_SCORE * passed) / checks.length);
}

/**
 * @param {number} score
 * @returns {HealthLevel}
 * @example scoreLevel(42) // ''
 */
export function scoreLevel(score) {
  if (score === PERFECT_SCORE) return '';
  return score >= WARNING_SCORE ? 'warn' : 'bad';
}

/**
 * Avalia a saúde da nave a partir do status e do estado da conexão.
 * @param {{ status: PanelStatus | null, lookup: ThemeLookup, connection: ConnectionState, staleText?: string | null }} input
 * @returns {HealthResult}
 * @example evaluateHealth({ status, lookup, connection: 'ao-vivo' }).score // 42
 */
export function evaluateHealth({ status, lookup, connection, staleText = null }) {
  if (!status) {
    const failure = connectionChecks(connection, null)[0] ?? check(false, 'aguardando o primeiro sinal');
    return { checks: [failure], failures: [failure], score: 0, level: 'bad' };
  }
  const checks = [
    ...hardwareChecks(status.hardware),
    ...networkChecks(status.rede),
    ...fleetChecks(status, lookup),
    ...connectionChecks(connection, staleText),
  ];
  const score = scoreChecks(checks);
  return { checks, failures: checks.filter((item) => !item.ok), score, level: scoreLevel(score) };
}
