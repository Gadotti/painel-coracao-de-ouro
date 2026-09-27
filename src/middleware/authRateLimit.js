import { rateLimit } from 'express-rate-limit';

/** @typedef {import('express').RequestHandler} RequestHandler */

export const AUTH_RATE_LIMIT = Object.freeze({ windowMs: 15 * 60 * 1000, maxFailures: 30 });
const UNAUTHORIZED = 401;

/**
 * Limita tentativas de login falhas por IP. Só respostas 401 contam, para o uso normal
 * (dezenas de arquivos e uma consulta a cada 15 s) nunca bater no limite.
 * @param {{ windowMs: number, maxFailures: number }} [policy]
 * @returns {RequestHandler}
 * @example app.use(createAuthRateLimit())
 */
export function createAuthRateLimit(policy = AUTH_RATE_LIMIT) {
  return rateLimit({
    windowMs: policy.windowMs,
    limit: policy.maxFailures,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_request, response) => response.statusCode !== UNAUTHORIZED,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'MUITAS_TENTATIVAS', mensagem: 'Muitas tentativas. Tente de novo mais tarde.' },
  });
}
