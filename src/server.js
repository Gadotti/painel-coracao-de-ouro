// Ponto de entrada: lê a configuração, liga as peças reais (fs, stdout) e sobe o servidor.
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createStatusService } from './status/statusService.js';
import { createThemeService } from './theme/themeService.js';

const SHUTDOWN_TIMEOUT_MS = 5000;

/**
 * @param {string} relativePath
 * @returns {unknown}
 */
function readBundledJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger({ level: config.logLevel });
  const { version } = /** @type {{ version: string }} */ (readBundledJson('../package.json'));
  const status = createStatusService({
    filePath: config.statusPath,
    fileSystem: fs,
    policy: { staleAfterSeconds: config.staleAfterSeconds, version },
  });
  const theme = createThemeService({
    defaultTheme: readBundledJson('./theme/defaultTheme.json'),
    overridePath: config.themePath,
    fileSystem: fs,
    logger,
  });
  const publicDir = fileURLToPath(new URL('../public', import.meta.url));
  const app = buildApp({ config, services: { status, theme, logger }, site: { publicDir, version } });
  const server = app.listen(config.port, config.host, () => {
    logger.info('servidor.no_ar', {
      versao: version,
      host: config.host,
      porta: config.port,
      autenticacao: Boolean(config.auth),
    });
  });
  const shutdown = (/** @type {string} */ signal) => {
    logger.info('servidor.desligando', { sinal: signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ nivel: 'error', msg: 'servidor.falha_ao_subir', erro: error.message })}\n`,
  );
  process.exit(1);
});
