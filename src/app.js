import express from 'express';
import { createStatusRouter, createThemeRouter, createHealthRouter } from './api/routes.js';
import { createSecurityHeaders } from './middleware/securityHeaders.js';
import { createRequestLog } from './middleware/requestLog.js';
import { createBasicAuth } from './middleware/basicAuth.js';
import { createAuthRateLimit } from './middleware/authRateLimit.js';
import { apiNotFound, createErrorHandler } from './middleware/errorHandler.js';

/** @typedef {import('./logger.js').Logger} Logger */
/** @typedef {import('./config.js').PanelConfig} PanelConfig */
/** @typedef {ReturnType<typeof import('./status/statusService.js').createStatusService>} StatusService */
/** @typedef {ReturnType<typeof import('./theme/themeService.js').createThemeService>} ThemeService */
/** @typedef {import('./middleware/basicAuth.js').BasicAuthOptions['clockAndVerifier']} AuthOverrides */

/**
 * @typedef {object} AppDependencies
 * @property {Pick<PanelConfig, 'auth'>} config
 * @property {{ status: StatusService, theme: ThemeService, logger: Logger, authOverrides?: AuthOverrides }} services
 * @property {{ publicDir: string, version: string }} site
 */

/**
 * Monta o app Express com todas as dependências injetadas (facilita os testes de integração).
 * Ordem importa: /healthz fica antes da autenticação para o HEALTHCHECK do container.
 * @param {AppDependencies} dependencies
 * @returns {import('express').Express}
 * @example buildApp({ config, services: { status, theme, logger }, site: { publicDir, version } })
 */
export function buildApp({ config, services, site }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(createRequestLog(services.logger));
  app.use(createSecurityHeaders());
  app.use('/healthz', createHealthRouter(site.version));
  if (config.auth) {
    app.use(createAuthRateLimit());
    app.use(
      createBasicAuth({
        credentials: config.auth,
        logger: services.logger,
        clockAndVerifier: services.authOverrides,
      }),
    );
  }
  app.use('/api/status', createStatusRouter(services.status));
  app.use('/api/theme', createThemeRouter(services.theme));
  app.use('/api', apiNotFound);
  app.use(express.static(site.publicDir, { index: 'index.html', dotfiles: 'ignore' }));
  app.use(createErrorHandler(services.logger));
  return app;
}
