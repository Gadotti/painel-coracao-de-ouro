import { Router } from 'express';

/** @typedef {import('../../public/js/types.js').PanelStatus} PanelStatus */
/** @typedef {import('../../public/js/types.js').StatusMeta} StatusMeta */
/** @typedef {import('../../public/js/types.js').PanelTheme} PanelTheme */

/**
 * GET /api/status — último status do coletor, validado, com metadados de idade.
 * @param {{ getSnapshot: () => Promise<{ status: PanelStatus, meta: StatusMeta }> }} statusService
 * @returns {Router}
 * @example app.use('/api/status', createStatusRouter(statusService))
 */
export function createStatusRouter(statusService) {
  const router = Router();
  router.get('/', async (_request, response) => {
    const snapshot = await statusService.getSnapshot();
    response.set('Cache-Control', 'no-store').json(snapshot);
  });
  return router;
}

/**
 * GET /api/theme — verbetes do Guia (padrão mesclado com o tema do usuário).
 * @param {{ getTheme: () => Promise<{ theme: PanelTheme }> }} themeService
 * @returns {Router}
 * @example app.use('/api/theme', createThemeRouter(themeService))
 */
export function createThemeRouter(themeService) {
  const router = Router();
  router.get('/', async (_request, response) => {
    const { theme } = await themeService.getTheme();
    response.set('Cache-Control', 'no-cache').json(theme);
  });
  return router;
}

/**
 * GET /healthz — o processo está de pé (usado pelo HEALTHCHECK do container). Não exige login.
 * @param {string} version
 * @returns {Router}
 * @example app.use('/healthz', createHealthRouter('0.1.0'))
 */
export function createHealthRouter(version) {
  const router = Router();
  router.get('/', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ ok: true, versao: version });
  });
  return router;
}
