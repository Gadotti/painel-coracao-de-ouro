import { fileURLToPath } from 'node:url';
import { buildApp } from '../../src/app.js';
import { createStatusService } from '../../src/status/statusService.js';
import { createThemeService } from '../../src/theme/themeService.js';
import { FakeFileSystem } from '../fakes/fakeFileSystem.js';
import { RecordingLogger } from '../fakes/recordingLogger.js';
import { defaultTheme, readProjectFile } from './fixtures.js';

export const TEST_STATUS_PATH = '/dados/status.json';
export const TEST_VERSION = '0.0.0-teste';
const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

/**
 * App completo sobre um sistema de arquivos em memória.
 * @param {{ files?: Record<string, string>, auth?: { user: string, passwordHash: string } | null, authOverrides?: object, statusService?: object }} [options]
 */
export function buildTestApp({ files, auth = null, authOverrides, statusService } = {}) {
  const fileSystem = new FakeFileSystem(
    files ?? { [TEST_STATUS_PATH]: readProjectFile('examples/status.example.json') },
  );
  const logger = new RecordingLogger();
  const status =
    statusService ??
    createStatusService({
      filePath: TEST_STATUS_PATH,
      fileSystem,
      policy: {
        staleAfterSeconds: 180,
        version: TEST_VERSION,
        clock: () => new Date('2026-09-27T11:31:00Z'),
      },
    });
  const theme = createThemeService({ defaultTheme: defaultTheme(), overridePath: null, fileSystem, logger });
  const app = buildApp({
    config: { auth },
    services: { status, theme, logger, authOverrides },
    site: { publicDir, version: TEST_VERSION },
  });
  return { app, logger, fileSystem };
}
