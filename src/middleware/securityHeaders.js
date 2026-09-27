import helmet from 'helmet';

/** @typedef {import('express').RequestHandler} RequestHandler */

const SELF = "'self'";
const NONE = "'none'";

/**
 * Cabeçalhos de segurança com CSP rígido: tudo (scripts, estilos, fontes) vem do próprio painel,
 * sem inline. Estilos dinâmicos são aplicados via CSSOM, que o CSP permite.
 * HSTS fica desligado porque o painel roda em HTTP na rede local; um proxy com HTTPS pode ativá-lo.
 * @returns {RequestHandler}
 * @example app.use(createSecurityHeaders())
 */
export function createSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: [SELF],
        scriptSrc: [SELF],
        styleSrc: [SELF],
        imgSrc: [SELF, 'data:'],
        fontSrc: [SELF],
        connectSrc: [SELF],
        objectSrc: [NONE],
        baseUri: [SELF],
        formAction: [NONE],
        frameAncestors: [NONE],
      },
    },
    strictTransportSecurity: false,
  });
}
