import { pickStable } from './format.js';

/** @typedef {import('../types.js').PanelEvent} PanelEvent */
/** @typedef {import('../types.js').EventLevel} EventLevel */

const BASE_DEPRESSION = 55;
const WARNING_WEIGHT = 10;
const ERROR_WEIGHT = 18;
const MAX_DEPRESSION = 100;
const WINDOW_MS = 86400000;

/** Falas do Marvin por nível de evento. */
export const MARVIN_LINES = Object.freeze({
  info: [
    'Tudo funcionando. Que deprimente.',
    'Anotado. Não que alguém vá ler.',
    'Mais um evento. Como se eu me importasse.',
  ],
  aviso: [
    'Eu avisei. Ninguém nunca me escuta.',
    'Cérebro do tamanho de um planeta, e me pedem para vigiar isto.',
    'Não vai dar certo. Nunca dá.',
  ],
  erro: [
    'Vida? Não me fale de vida.',
    'Eu sabia. Eu sempre sei.',
    'Sinto uma dor terrível em todos os diodos do meu lado esquerdo.',
  ],
});

/**
 * Nível de depressão do Marvin (0–100): sobe com avisos e erros das últimas 24 h.
 * @param {PanelEvent[]} events
 * @param {Date} now
 * @returns {number}
 * @example marvinMood([], new Date()) // 55
 */
export function marvinMood(events, now) {
  const recent = events.filter((event) => now.getTime() - new Date(event.ts).getTime() < WINDOW_MS);
  const warnings = recent.filter((event) => event.nivel === 'aviso').length;
  const errors = recent.filter((event) => event.nivel === 'erro').length;
  return Math.min(MAX_DEPRESSION, BASE_DEPRESSION + warnings * WARNING_WEIGHT + errors * ERROR_WEIGHT);
}

/**
 * Comentário estável do Marvin para um evento (a mesma frase a cada render).
 * @param {PanelEvent} event
 * @returns {string}
 * @example marvinLine({ ts: 'x', nivel: 'erro', texto: 'y' }) // uma das falas de erro
 */
export function marvinLine(event) {
  const lines = MARVIN_LINES[event.nivel] ?? MARVIN_LINES.info;
  return pickStable(lines, `${event.ts}${event.texto}`);
}

/**
 * Eventos mais recentes primeiro, limitados a `limit`.
 * @param {PanelEvent[]} events
 * @param {number} limit
 * @returns {PanelEvent[]}
 * @example latestEvents(events, 15)
 */
export function latestEvents(events, limit) {
  return [...events].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, limit);
}
