/** @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel */
/** @typedef {(message: string, fields?: Record<string, unknown>) => void} LogFunction */
/** @typedef {{ debug: LogFunction, info: LogFunction, warn: LogFunction, error: LogFunction }} Logger */

export const LOG_LEVELS = /** @type {const} */ (['debug', 'info', 'warn', 'error']);

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function serializable(value) {
  if (!(value instanceof Error)) return value;
  return { name: value.name, message: value.message, code: /** @type {{ code?: string }} */ (value).code };
}

/**
 * Logger de linhas JSON (uma por evento) para stdout. Nunca registre segredos nos campos.
 * @param {{ level?: LogLevel, write?: (line: string) => void, clock?: () => Date }} [options]
 * @returns {Logger}
 * @example createLogger({ level: 'info' }).info('servidor.no_ar', { porta: 4242 })
 */
export function createLogger({
  level = 'info',
  write = (line) => process.stdout.write(line),
  clock = () => new Date(),
} = {}) {
  const threshold = LOG_LEVELS.indexOf(level);
  const emit =
    (/** @type {LogLevel} */ entryLevel) =>
    (/** @type {string} */ message, fields = {}) => {
      if (LOG_LEVELS.indexOf(entryLevel) < threshold) return;
      /** @type {Record<string, unknown>} */
      const entry = { ts: clock().toISOString(), nivel: entryLevel, msg: message };
      for (const [key, value] of Object.entries(fields)) entry[key] = serializable(value);
      write(`${JSON.stringify(entry)}\n`);
    };
  return { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
}
