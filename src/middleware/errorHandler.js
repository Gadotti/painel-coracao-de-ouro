import { PanelError } from '../lib/errors.js';

/** @typedef {import('express').ErrorRequestHandler} ErrorRequestHandler */
/** @typedef {import('../logger.js').Logger} Logger */

/** Textos públicos: o detalhe técnico fica só no log do servidor. */
export const PUBLIC_MESSAGES = Object.freeze({
  STATUS_INDISPONIVEL: 'O coletor ainda não enviou sinal.',
  STATUS_INVALIDO: 'O sinal do coletor chegou corrompido.',
  ERRO_INTERNO: 'Algo deu errado a bordo.',
  NAO_ENCONTRADO: 'Rota não encontrada neste setor da galáxia.',
});

/**
 * Converte erros em JSON sem stack trace, caminho de arquivo ou mensagem crua.
 * @param {Logger} logger
 * @returns {ErrorRequestHandler}
 * @example app.use(createErrorHandler(logger))
 */
export function createErrorHandler(logger) {
  // O Express só reconhece um handler de erro pela assinatura de 4 argumentos.
  // eslint-disable-next-line max-params
  return (error, request, response, _next) => {
    if (error instanceof PanelError) {
      logger.warn('api.erro', { codigo: error.code, detalhe: error.message, caminho: request.path });
      const message =
        PUBLIC_MESSAGES[/** @type {keyof typeof PUBLIC_MESSAGES} */ (error.code)] ??
        PUBLIC_MESSAGES.ERRO_INTERNO;
      response.status(error.httpStatus).json({ erro: error.code, mensagem: message });
      return;
    }
    logger.error('api.erro_inesperado', { erro: error, caminho: request.path });
    response.status(500).json({ erro: 'ERRO_INTERNO', mensagem: PUBLIC_MESSAGES.ERRO_INTERNO });
  };
}

/**
 * 404 em JSON para qualquer rota desconhecida de /api.
 * @param {import('express').Request} _request
 * @param {import('express').Response} response
 * @returns {void}
 */
export function apiNotFound(_request, response) {
  response.status(404).json({ erro: 'NAO_ENCONTRADO', mensagem: PUBLIC_MESSAGES.NAO_ENCONTRADO });
}
