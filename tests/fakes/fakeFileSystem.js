/** Sistema de arquivos em memória que satisfaz ReadableFileSystem (src/lib/jsonFile.js). */
export class FakeFileSystem {
  /** @param {Record<string, string>} [files] */
  constructor(files = {}) {
    this.files = new Map(Object.entries(files));
    this.modifiedAt = new Date('2026-09-27T11:30:00Z');
  }

  /**
   * @param {string} path
   * @param {string} content
   */
  write(path, content) {
    this.files.set(path, content);
  }

  /** @param {string} path */
  async stat(path) {
    return { size: Buffer.byteLength(this.#read(path)), mtime: this.modifiedAt };
  }

  /** @param {string} path */
  async readFile(path) {
    return this.#read(path);
  }

  /** @param {string} path */
  #read(path) {
    if (!this.files.has(path)) {
      throw Object.assign(new Error(`ENOENT: no such file, open '${path}'`), { code: 'ENOENT' });
    }
    return this.files.get(path);
  }
}
