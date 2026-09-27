/** @typedef {import('express').RequestHandler} RequestHandler */
/** @typedef {import('../logger.js').Logger} Logger */

/**
 * Registra cada requisição (método, caminho sem query, status, duração) em nível debug;
 * erros do servidor sobem para warn. Nunca registra cabeçalhos (Authorization fica de fora).
 * @param {Logger} logger
 * @param {() => number} [now]
 * @returns {RequestHandler}
 * @example app.use(createRequestLog(logger))
 */
export function createRequestLog(logger, now = () => performance.now()) {
  return (request, response, next) => {
    const startedAt = now();
    // Capturado já: routers montados (ex.: /healthz) reescrevem request.path até o 'finish'.
    const path = request.path;
    response.on('finish', () => {
      const entry = {
        metodo: request.method,
        caminho: path,
        status: response.statusCode,
        ms: Math.round(now() - startedAt),
      };
      if (response.statusCode >= 500) logger.warn('http.requisicao', entry);
      else logger.debug('http.requisicao', entry);
    });
    next();
  };
}
