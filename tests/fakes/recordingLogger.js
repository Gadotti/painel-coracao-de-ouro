/** Logger que guarda as entradas em memória para as asserções. */
export class RecordingLogger {
  constructor() {
    /** @type {Array<{ level: string, message: string, fields: Record<string, unknown> }>} */
    this.entries = [];
    for (const level of ['debug', 'info', 'warn', 'error']) {
      this[level] = (/** @type {string} */ message, fields = {}) =>
        this.entries.push({ level, message, fields });
    }
  }

  /** @param {string} message */
  messages(message) {
    return this.entries.filter((entry) => entry.message === message);
  }
}
