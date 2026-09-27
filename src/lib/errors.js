/**
 * Erro de domínio com código público e status HTTP. A mensagem é interna (vai para o log);
 * o cliente recebe só `code` e um texto genérico (ver middleware/errorHandler.js).
 */
export class PanelError extends Error {
  /**
   * @param {string} message
   * @param {{ code: string, httpStatus: number, cause?: unknown }} details
   */
  constructor(message, { code, httpStatus, cause }) {
    super(message, { cause });
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** O coletor ainda não gerou o arquivo (ou ele sumiu). */
export class StatusUnavailableError extends PanelError {
  /**
   * @param {string} filePath
   * @param {unknown} [cause]
   */
  constructor(filePath, cause) {
    super(`Status não encontrado em "${filePath}"; esperado arquivo JSON gerado pelo coletor.`, {
      code: 'STATUS_INDISPONIVEL',
      httpStatus: 503,
      cause,
    });
  }
}

/** O arquivo existe, mas não é um status válido. */
export class StatusInvalidError extends PanelError {
  /**
   * @param {string} detail
   * @param {unknown} [cause]
   */
  constructor(detail, cause) {
    super(`Status inválido: ${detail}`, { code: 'STATUS_INVALIDO', httpStatus: 502, cause });
  }
}

/** Variável de ambiente com valor fora do formato esperado — impede a subida do servidor. */
export class ConfigError extends Error {
  /**
   * @param {string} variable
   * @param {{ received: unknown, expected: string }} problem
   */
  constructor(variable, { received, expected }) {
    super(`Variável ${variable} inválida: recebido ${JSON.stringify(received)}, esperado ${expected}.`);
    this.name = 'ConfigError';
  }
}
