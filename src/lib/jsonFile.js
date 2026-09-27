/**
 * Interface mínima de sistema de arquivos que o painel usa — `node:fs/promises` a satisfaz,
 * e os testes usam um fake nomeado (tests/fakes/fakeFileSystem.js).
 * @typedef {object} ReadableFileSystem
 * @property {(path: string, encoding: 'utf8') => Promise<string>} readFile
 * @property {(path: string) => Promise<{ size: number, mtime: Date }>} stat
 */

/** Um status de verdade tem poucos KB; acima disso, algo está errado no coletor. */
export const MAX_JSON_FILE_BYTES = 1024 * 1024;

export class FileTooLargeError extends Error {
  /**
   * @param {string} filePath
   * @param {number} size
   */
  constructor(filePath, size) {
    super(`Arquivo "${filePath}" tem ${size} bytes; esperado no máximo ${MAX_JSON_FILE_BYTES}.`);
    this.name = 'FileTooLargeError';
  }
}

/**
 * Lê e interpreta um arquivo JSON com limite de tamanho.
 * Erros de sistema (ENOENT etc.) e de sintaxe (SyntaxError) sobem para quem chamou decidir.
 * @param {ReadableFileSystem} fileSystem
 * @param {string} filePath
 * @returns {Promise<{ content: unknown, modifiedAt: Date }>}
 * @example await readJsonFile(fs, './data/status.json')
 */
export async function readJsonFile(fileSystem, filePath) {
  const info = await fileSystem.stat(filePath);
  if (info.size > MAX_JSON_FILE_BYTES) throw new FileTooLargeError(filePath, info.size);
  const raw = await fileSystem.readFile(filePath, 'utf8');
  return { content: JSON.parse(raw), modifiedAt: info.mtime };
}

/**
 * @param {unknown} error
 * @returns {boolean}
 * @example isMissingFile(Object.assign(new Error(), { code: 'ENOENT' })) // true
 */
export function isMissingFile(error) {
  return /** @type {{ code?: string }} */ (error)?.code === 'ENOENT';
}
