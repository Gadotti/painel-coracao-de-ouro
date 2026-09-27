const HTML_ESCAPES = /** @type {Record<string, string>} */ ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const JUST_NOW_SECONDS = 45;
const NEARBY_DAYS_MS = 6 * SECONDS_PER_DAY * 1000;
const KBPS_PER_MBPS = 1000;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * Escapa texto para interpolar com segurança em HTML (conteúdo e atributos).
 * @param {unknown} value
 * @returns {string}
 * @example escapeHtml('<b>') // '&lt;b&gt;'
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * @param {number | string} value
 * @returns {string}
 * @example pad2(7) // '07'
 */
export function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Número no formato pt-BR com casas decimais fixas.
 * @param {number} value
 * @param {number} [decimals]
 * @returns {string}
 * @example formatNumber(1234.5, 1) // '1.234,5'
 */
export function formatNumber(value, decimals = 0) {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Distância entre `iso` e `now` em linguagem curta ("há 3 min", "em 2 h").
 * @param {string | Date | null | undefined} iso
 * @param {Date} now
 * @returns {string}
 * @example formatRelative('2026-01-01T10:00:00Z', new Date('2026-01-01T10:05:00Z')) // 'há 5 min'
 */
export function formatRelative(iso, now) {
  if (!iso) return '—';
  const diffSeconds = (new Date(iso).getTime() - now.getTime()) / 1000;
  const distance = Math.abs(diffSeconds);
  if (distance < JUST_NOW_SECONDS) return 'agora';
  const amount = describeDistance(distance);
  return diffSeconds < 0 ? `há ${amount}` : `em ${amount}`;
}

/**
 * @param {number} seconds
 * @returns {string}
 */
function describeDistance(seconds) {
  if (seconds < SECONDS_PER_HOUR) return `${Math.round(seconds / SECONDS_PER_MINUTE)} min`;
  if (seconds < SECONDS_PER_DAY) return `${Math.round(seconds / SECONDS_PER_HOUR)} h`;
  return `${Math.round(seconds / SECONDS_PER_DAY)} d`;
}

/**
 * Data absoluta curta: "hoje 08:30", "dom 03:00" (até 6 dias) ou "04/10 03:00".
 * @param {string | Date | null | undefined} iso
 * @param {Date} now
 * @returns {string}
 * @example formatWhen(new Date(), new Date()) // 'hoje 08:30'
 */
export function formatWhen(iso, now) {
  if (!iso) return '—';
  const moment = new Date(iso);
  const clock = `${pad2(moment.getHours())}:${pad2(moment.getMinutes())}`;
  if (moment.toDateString() === now.toDateString()) return `hoje ${clock}`;
  if (Math.abs(moment.getTime() - now.getTime()) < NEARBY_DAYS_MS) {
    return `${WEEKDAYS_SHORT[moment.getDay()]} ${clock}`;
  }
  return `${pad2(moment.getDate())}/${pad2(moment.getMonth() + 1)} ${clock}`;
}

/**
 * Duração legível: "12 s", "18 min", "3 h 05 min", "12 d 03 h".
 * @param {number} totalSeconds
 * @returns {string}
 * @example formatDuration(1080) // '18 min'
 */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < SECONDS_PER_MINUTE) return `${seconds} s`;
  const days = Math.floor(seconds / SECONDS_PER_DAY);
  const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  if (days) return `${days} d ${pad2(hours)} h`;
  if (hours) return `${hours} h ${pad2(minutes)} min`;
  return `${minutes} min`;
}

/**
 * Taxa de rede com unidade adequada.
 * @param {number} kbps
 * @returns {{ value: string, unit: string }}
 * @example formatRate(1500) // { value: '1,5', unit: 'Mb/s' }
 */
export function formatRate(kbps) {
  if (kbps >= KBPS_PER_MBPS) return { value: formatNumber(kbps / KBPS_PER_MBPS, 1), unit: 'Mb/s' };
  return { value: formatNumber(kbps, 0), unit: 'kb/s' };
}

/**
 * Escolhe sempre o mesmo item da lista para a mesma chave — frases não mudam a cada render.
 * @template T
 * @param {T[]} list
 * @param {string} key
 * @returns {T}
 * @example pickStable(['a', 'b'], 'eddie') // sempre o mesmo item
 */
export function pickStable(list, key) {
  let hash = 0;
  for (const char of String(key)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return list[Math.abs(hash) % list.length];
}

/**
 * Cores vão para atributos `style`; só aceitamos `#rrggbb` para impedir injeção de CSS.
 * @param {unknown} color
 * @param {string} fallback
 * @returns {string}
 * @example safeColor('red;background:url(x)', '#fff') // '#fff'
 */
export function safeColor(color, fallback) {
  return typeof color === 'string' && HEX_COLOR.test(color) ? color : fallback;
}

/**
 * Só links http(s) viram `href` — bloqueia `javascript:` e afins.
 * @param {unknown} url
 * @returns {string | null}
 * @example safeHttpUrl('javascript:alert(1)') // null
 */
export function safeHttpUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}
