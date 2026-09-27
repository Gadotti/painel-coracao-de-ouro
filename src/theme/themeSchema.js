import Joi from 'joi';
import { SPRITE_NAMES } from '../../public/js/sprites/spriteDefs.js';

/** @typedef {import('../../public/js/types.js').PanelTheme} PanelTheme */

// Cores vão para CSS e sprites; só #rrggbb evita injeção de estilo.
const color = Joi.string().pattern(/^#[0-9a-f]{6}$/i);
const sprite = Joi.string().valid(...SPRITE_NAMES);
const identifier = Joi.string().pattern(/^[a-z0-9][a-z0-9._-]{0,63}$/i);
const label = (/** @type {number} */ max) => Joi.string().min(1).max(max);

const agentEntry = Joi.object({
  nome: label(40).required(),
  papel: label(60).required(),
  cor: color.required(),
  desc: label(200).required(),
  frases: Joi.array().items(label(140)).min(1).max(10).required(),
});

const programEntry = Joi.object({
  nome: label(40).required(),
  sprite: sprite.required(),
  cor: color.required(),
  desc: label(200).required(),
  frase: label(140).required(),
});

const roadmapEntry = Joi.object({
  nome: label(40).required(),
  real: label(60).required(),
  sprite: sprite.required(),
  desc: label(200).required(),
});

const themeSchema = Joi.object({
  agentes: Joi.object().pattern(identifier, agentEntry).default({}),
  programas: Joi.object().pattern(identifier, programEntry).default({}),
  crons: Joi.object().pattern(identifier, label(60)).default({}),
  roadmap: Joi.array().items(roadmapEntry).max(30),
});

/**
 * Valida um tema (padrão ou do usuário). `roadmap` fica indefinido quando ausente,
 * para a mesclagem saber se deve manter o roadmap padrão.
 * @param {unknown} candidate
 * @returns {Partial<PanelTheme> & Pick<PanelTheme, 'agentes' | 'programas' | 'crons'>}
 * @example validateTheme({ agentes: {} }).programas // {}
 */
export function validateTheme(candidate) {
  const { error, value } = themeSchema.validate(candidate, { abortEarly: true, stripUnknown: true });
  if (error) throw new Error(`Tema inválido: ${error.message}`);
  return value;
}
