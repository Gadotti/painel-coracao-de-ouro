import { validateStatus } from './statusSchema.js';
import { StatusInvalidError, StatusUnavailableError } from '../lib/errors.js';
import { isMissingFile, readJsonFile } from '../lib/jsonFile.js';

/** @typedef {import('../../public/js/types.js').PanelStatus} PanelStatus */
/** @typedef {import('../../public/js/types.js').StatusMeta} StatusMeta */
/** @typedef {import('../lib/jsonFile.js').ReadableFileSystem} ReadableFileSystem */

/**
 * @typedef {object} StatusServiceOptions
 * @property {string} filePath
 * @property {ReadableFileSystem} fileSystem
 * @property {{ staleAfterSeconds: number, version: string, clock?: () => Date }} policy
 */

/**
 * @param {ReadableFileSystem} fileSystem
 * @param {string} filePath
 * @returns {Promise<unknown>}
 */
async function readStatusFile(fileSystem, filePath) {
  try {
    return (await readJsonFile(fileSystem, filePath)).content;
  } catch (error) {
    if (isMissingFile(error)) throw new StatusUnavailableError(filePath, error);
    throw new StatusInvalidError(/** @type {Error} */ (error).message, error);
  }
}

/**
 * Lê o status.json do coletor, valida e calcula há quanto tempo foi gerado.
 * @param {StatusServiceOptions} options
 * @returns {{ getSnapshot: () => Promise<{ status: PanelStatus, meta: StatusMeta }> }}
 * @example await createStatusService({ filePath, fileSystem: fs, policy: { staleAfterSeconds: 180, version: '0.1.0' } }).getSnapshot()
 */
export function createStatusService({ filePath, fileSystem, policy }) {
  const clock = policy.clock ?? (() => new Date());
  return {
    async getSnapshot() {
      const status = validateStatus(await readStatusFile(fileSystem, filePath));
      const ageSeconds = Math.max(
        0,
        Math.round((clock().getTime() - new Date(status.gerado_em).getTime()) / 1000),
      );
      return {
        status,
        meta: {
          gerado_em: status.gerado_em,
          idade_s: ageSeconds,
          velho: ageSeconds > policy.staleAfterSeconds,
          versao: policy.version,
        },
      };
    },
  };
}
