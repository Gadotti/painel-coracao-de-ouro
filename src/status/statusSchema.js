import Joi from 'joi';
import { StatusInvalidError } from '../lib/errors.js';

/** @typedef {import('../../public/js/types.js').PanelStatus} PanelStatus */

// Limites defensivos: o arquivo vem de outro processo e o conteúdo vai para o navegador.
const LIMITS = Object.freeze({ units: 50, crons: 100, events: 200, shortText: 64, text: 300 });
const UNIT_STATES = ['ok', 'aviso', 'falha', 'parado'];
const CRON_RESULTS = ['ok', 'falha', 'rodando', 'aviso'];
const EVENT_LEVELS = ['info', 'aviso', 'erro'];

const identifier = Joi.string().pattern(/^[a-z0-9][a-z0-9._-]{0,63}$/i);
const text = (/** @type {number} */ max) => Joi.string().max(max).allow('');
const isoDate = Joi.string().isoDate();
const nonNegative = Joi.number().min(0);
const memory = Joi.object({ usado_mb: nonNegative.required(), total_mb: nonNegative.required() });

const hostSchema = Joi.object({
  nome: text(LIMITS.shortText),
  modelo: text(80),
  so: text(80),
  ip: Joi.string().ip({ cidr: 'forbidden' }),
  uptime_s: nonNegative,
});

const hardwareSchema = Joi.object({
  cpu_pct: Joi.number().min(0).max(100),
  temp_c: Joi.number().min(-40).max(150),
  load: Joi.array().items(nonNegative).max(3),
  ram: memory,
  swap: memory,
  disco: Joi.object({ usado_gb: nonNegative.required(), total_gb: Joi.number().positive().required() }),
  throttled: Joi.string().pattern(/^0x[0-9a-f]{1,8}$/i),
});

const networkSchema = Joi.object({
  interface: text(32),
  gateway: Joi.string().ip({ cidr: 'forbidden' }),
  rx_kbps: nonNegative,
  tx_kbps: nonNegative,
  ping_ms: nonNegative.allow(null),
  internet: Joi.boolean(),
  dependencias: Joi.array()
    .items(
      Joi.object({ nome: text(LIMITS.shortText).required(), ok: Joi.boolean().required(), nota: text(120) }),
    )
    .max(20),
});

const agentSchema = Joi.object({
  id: identifier.required(),
  tipo: text(24),
  estado: Joi.string()
    .valid(...UNIT_STATES)
    .required(),
  ultima_atividade: isoDate.allow(null),
  proxima: isoDate.allow(null),
  cron: text(100),
  mensagem: text(LIMITS.text),
});

const programSchema = Joi.object({
  id: identifier.required(),
  tipo: text(24),
  estado: Joi.string()
    .valid(...UNIT_STATES)
    .required(),
  porta: Joi.number().integer().min(1).max(65535),
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(LIMITS.text),
  compartilhamento: text(120),
  // docker stats soma núcleos: um container pode passar de 100%.
  cpu_pct: Joi.number().min(0).max(800),
  mem_mb: nonNegative,
  desde: isoDate,
});

const cronSchema = Joi.object({
  id: identifier.required(),
  expressao: Joi.string().max(100).required(),
  comando: text(LIMITS.text),
  ultima: isoDate.allow(null),
  duracao_s: nonNegative,
  resultado: Joi.string()
    .valid(...CRON_RESULTS)
    .allow(null),
  proxima: isoDate.allow(null),
});

const eventSchema = Joi.object({
  ts: isoDate.required(),
  nivel: Joi.string()
    .valid(...EVENT_LEVELS)
    .default('info'),
  origem: text(LIMITS.shortText),
  texto: text(LIMITS.text).required(),
});

const statusSchema = Joi.object({
  gerado_em: isoDate.required(),
  host: hostSchema.default({}),
  hardware: hardwareSchema.default({}),
  rede: networkSchema.default({}),
  agentes: Joi.array().items(agentSchema).max(LIMITS.units).default([]),
  programas: Joi.array().items(programSchema).max(LIMITS.units).default([]),
  crons: Joi.array().items(cronSchema).max(LIMITS.crons).default([]),
  eventos: Joi.array().items(eventSchema).max(LIMITS.events).default([]),
});

/**
 * Valida o status do coletor e devolve só os campos conhecidos: campos extras são descartados,
 * então nada que o coletor escreva por engano (ex.: variáveis de ambiente) chega ao navegador.
 * @param {unknown} candidate
 * @returns {PanelStatus}
 * @example validateStatus(JSON.parse(conteudo)).agentes
 */
export function validateStatus(candidate) {
  const { error, value } = statusSchema.validate(candidate, {
    stripUnknown: true,
    abortEarly: true,
    convert: true,
  });
  if (error) throw new StatusInvalidError(error.message, error);
  return value;
}
