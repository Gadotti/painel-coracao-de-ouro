/**
 * fetch falso: cada URL devolve respostas de uma fila (a última se repete).
 * Um item `Error` simula falha de rede.
 */
export class ScriptedFetch {
  /** @param {Record<string, Array<{ status: number, body?: unknown } | Error>>} script */
  constructor(script) {
    this.script = script;
    /** @type {Array<{ url: string, init: RequestInit | undefined }>} */
    this.calls = [];
    this.fetch = this.fetch.bind(this);
  }

  /**
   * @param {string} url
   * @param {RequestInit} [init]
   */
  async fetch(url, init) {
    this.calls.push({ url, init });
    const queue = this.script[url] ?? [new Error(`sem roteiro para ${url}`)];
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return /** @type {Response} */ (
      /** @type {unknown} */ ({
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        json: async () => next.body,
      })
    );
  }
}
