import { byId, renderInto, setText } from './dom.js';
import { drawBars } from './bars.js';
import { levelClass, segmentBar } from './widgets.js';
import { escapeHtml, formatDuration, formatNumber } from '../lib/format.js';
import { decodeThrottled } from '../lib/power.js';

/** @typedef {import('../types.js').PanelStatus} PanelStatus */
/** @typedef {import('../types.js').MemoryUsage} MemoryUsage */
/** @typedef {import('../lib/history.js').MetricsHistory} MetricsHistory */

const CPU_LIMITS = { warn: 60, bad: 85 };
const TEMP_LIMITS = { warn: 60, bad: 75 };
const MEMORY_LIMITS = { warn: 70, bad: 90 };
const DISK_LIMITS = { warn: 75, bad: 90 };
const CPU_CHART_COLOR = '#00e5ff';
const PERCENT = 100;
// Número do livro para o salto de improbabilidade; aqui só enfeita, variando com a CPU.
const IMPROBABILITY_BASE = 276709;
const IMPROBABILITY_FLOOR = 0.4;

/**
 * @param {{ label: string, percent: number, value: string, limits: { warn: number, bad: number } }} row
 * @returns {string}
 */
function meterRow({ label, percent, value, limits }) {
  return `<div class="meter"><span class="lbl">${label}</span>${segmentBar(percent, levelClass(percent, limits))}<span class="val">${value}</span></div>`;
}

/**
 * @param {string} label
 * @param {MemoryUsage | undefined} usage
 * @returns {string}
 */
function memoryRow(label, usage) {
  if (!usage || !usage.total_mb) return '';
  const percent = (usage.usado_mb / usage.total_mb) * PERCENT;
  const value = `${formatNumber(usage.usado_mb)} / ${formatNumber(usage.total_mb)} MB`;
  return meterRow({ label, percent, value, limits: MEMORY_LIMITS });
}

/**
 * @param {PanelStatus['hardware']} hardware
 * @returns {string}
 */
export function metersHtml(hardware) {
  const disk = hardware.disco;
  const diskRow = disk
    ? meterRow({
        label: 'CARTÃO SD',
        percent: (disk.usado_gb / disk.total_gb) * PERCENT,
        value: `${formatNumber(disk.usado_gb, 1)} / ${formatNumber(disk.total_gb, 1)} GB`,
        limits: DISK_LIMITS,
      })
    : '';
  return memoryRow('RAM', hardware.ram) + memoryRow('SWAP / ZRAM', hardware.swap) + diskRow;
}

/**
 * @param {string | undefined} throttled
 * @returns {string}
 */
export function powerHtml(throttled) {
  const reading = decodeThrottled(throttled);
  const raw = `<small class="st-parado">(${escapeHtml(reading.bruto)})</small>`;
  if (reading.situacao === 'desconhecido') return '<span class="st-parado">sem leitura</span>';
  if (reading.situacao === 'estavel') return `<span class="st-ok">estável</span> ${raw}`;
  if (reading.situacao === 'agora') {
    return `<span class="st-falha">agora: ${escapeHtml(reading.agora.join(', '))}</span> ${raw}`;
  }
  return `<span class="st-aviso">desde o boot: ${escapeHtml(reading.desdeBoot.join(', '))}</span> ${raw}`;
}

/**
 * @param {ParentNode} root
 * @param {{ id: string, value: string, level: string }} stat
 * @returns {void}
 */
function setBigStat(root, { id, value, level }) {
  const element = byId(root, id);
  element.textContent = value;
  element.parentElement.className = `big ${level}`;
}

/**
 * @param {number[]} values
 * @returns {string}
 */
function cpuCaption(values) {
  if (!values.length) return '—';
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return `MÁX ${formatNumber(Math.max(...values))}% · MÉD ${formatNumber(average)}%`;
}

/**
 * Motor de Improbabilidade Infinita: hardware do host.
 * @param {ParentNode} root
 * @param {{ status: PanelStatus, history: MetricsHistory }} view
 * @returns {void}
 * @example renderMotor(document, { status, history })
 */
export function renderMotor(root, { status, history }) {
  const hardware = status.hardware;
  const cpu = hardware.cpu_pct;
  const temp = hardware.temp_c;
  setBigStat(root, {
    id: 'hw-cpu',
    value: cpu == null ? '--' : formatNumber(cpu),
    level: levelClass(cpu ?? 0, CPU_LIMITS),
  });
  setBigStat(root, {
    id: 'hw-temp',
    value: temp == null ? '--' : formatNumber(temp),
    level: levelClass(temp ?? 0, TEMP_LIMITS),
  });
  setText(root, 'hw-load', hardware.load?.length ? formatNumber(hardware.load[0], 2) : '--');
  byId(root, 'hw-load').title = hardware.load
    ? `carga 1/5/15 min: ${hardware.load.map((v) => formatNumber(v, 2)).join(' / ')}`
    : '';
  const cpuValues = history.values('cpu');
  drawBars(/** @type {HTMLCanvasElement} */ (byId(root, 'cpu-spark')), {
    series: [{ values: cpuValues, color: CPU_CHART_COLOR }],
    max: PERCENT,
    slots: history.capacity,
  });
  setText(root, 'cpu-cap', cpuCaption(cpuValues));
  renderInto(byId(root, 'meters'), metersHtml(hardware));
  setText(root, 'hw-uptime', status.host.uptime_s ? formatDuration(status.host.uptime_s) : '—');
  byId(root, 'hw-power').innerHTML = powerHtml(hardware.throttled);
  setText(root, 'hw-model', [status.host.modelo, status.host.so].filter(Boolean).join(' · ') || '—');
  setText(
    root,
    'improb',
    formatNumber(Math.round(IMPROBABILITY_BASE * (IMPROBABILITY_FLOOR + (cpu ?? 0) / PERCENT))),
  );
}
