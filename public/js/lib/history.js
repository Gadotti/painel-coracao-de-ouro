/** @typedef {'cpu' | 'rx' | 'tx'} HistorySeries */

/**
 * @typedef {object} MetricsHistory
 * @property {(sample: Record<HistorySeries, number>) => void} push
 * @property {(series: HistorySeries) => number[]} values
 * @property {() => void} clear
 * @property {number} capacity
 */

/**
 * Histórico curto em memória para os gráficos (o status.json só traz o instante atual).
 * @param {number} capacity
 * @returns {MetricsHistory}
 * @example const h = createHistory(48); h.push({ cpu: 10, rx: 0, tx: 0 }); h.values('cpu') // [10]
 */
export function createHistory(capacity) {
  /** @type {Record<HistorySeries, number[]>} */
  const series = { cpu: [], rx: [], tx: [] };
  return {
    capacity,
    push(sample) {
      for (const key of /** @type {HistorySeries[]} */ (Object.keys(series))) {
        series[key].push(sample[key] ?? 0);
        if (series[key].length > capacity) series[key].shift();
      }
    },
    values: (key) => [...series[key]],
    clear() {
      for (const list of Object.values(series)) list.length = 0;
    },
  };
}
