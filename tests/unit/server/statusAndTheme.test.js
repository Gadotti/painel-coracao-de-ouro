import { describe, expect, it } from '@jest/globals';
import { validateStatus } from '../../../src/status/statusSchema.js';
import { createStatusService } from '../../../src/status/statusService.js';
import { createThemeService, mergeThemes } from '../../../src/theme/themeService.js';
import { validateTheme } from '../../../src/theme/themeSchema.js';
import {
  FileTooLargeError,
  MAX_JSON_FILE_BYTES,
  isMissingFile,
  readJsonFile,
} from '../../../src/lib/jsonFile.js';
import { StatusInvalidError, StatusUnavailableError } from '../../../src/lib/errors.js';
import { FakeFileSystem } from '../../fakes/fakeFileSystem.js';
import { RecordingLogger } from '../../fakes/recordingLogger.js';
import { defaultTheme, readProjectFile, sampleStatus } from '../../helpers/fixtures.js';

const STATUS_PATH = '/dados/status.json';
const THEME_PATH = '/dados/theme.json';

describe('validateStatus', () => {
  it('aceita o exemplo do repositório', () => {
    expect(validateStatus(sampleStatus()).agentes).toHaveLength(2);
  });

  it('descarta campos desconhecidos (nada vaza para o navegador)', () => {
    const status = sampleStatus({ segredo: 'TOKEN-FALSO-123' });
    status.agentes[0].token = 'TOKEN-FALSO-456';
    const clean = validateStatus(status);
    expect(JSON.stringify(clean)).not.toContain('TOKEN-FALSO');
  });

  it('preenche listas ausentes com vazio', () => {
    expect(validateStatus({ gerado_em: '2026-09-27T11:30:00Z' })).toMatchObject({
      agentes: [],
      eventos: [],
      host: {},
    });
  });

  it.each([
    ['estado desconhecido', (status) => (status.agentes[0].estado = 'feliz')],
    ['url javascript:', (status) => (status.programas[0].url = 'javascript:alert(1)')],
    ['id com caracteres estranhos', (status) => (status.agentes[0].id = '<script>')],
    ['eventos demais', (status) => (status.eventos = Array.from({ length: 201 }, () => status.eventos[0]))],
    ['throttled fora do formato', (status) => (status.hardware.throttled = 'muito')],
    ['sem gerado_em', (status) => delete status.gerado_em],
  ])('rejeita %s', (_label, mutate) => {
    const status = sampleStatus();
    mutate(status);
    expect(() => validateStatus(status)).toThrow(StatusInvalidError);
  });
});

describe('readJsonFile', () => {
  it('recusa arquivo grande demais', async () => {
    const fileSystem = new FakeFileSystem({ [STATUS_PATH]: 'x'.repeat(MAX_JSON_FILE_BYTES + 1) });
    await expect(readJsonFile(fileSystem, STATUS_PATH)).rejects.toThrow(FileTooLargeError);
  });

  it('reconhece arquivo inexistente', async () => {
    const error = await readJsonFile(new FakeFileSystem(), STATUS_PATH).catch((caught) => caught);
    expect(isMissingFile(error)).toBe(true);
    expect(isMissingFile(new Error('outro'))).toBe(false);
  });
});

describe('createStatusService', () => {
  const build = (fileSystem, now = '2026-09-27T11:31:00Z') =>
    createStatusService({
      filePath: STATUS_PATH,
      fileSystem,
      policy: { staleAfterSeconds: 180, version: '9.9.9', clock: () => new Date(now) },
    });

  it('entrega status validado e a idade dele', async () => {
    const fileSystem = new FakeFileSystem({ [STATUS_PATH]: readProjectFile('examples/status.example.json') });
    const { meta } = await build(fileSystem).getSnapshot();
    expect(meta).toEqual({
      gerado_em: '2026-09-27T11:30:00.000Z',
      idade_s: 60,
      velho: false,
      versao: '9.9.9',
    });
  });

  it('marca como velho depois do limite', async () => {
    const fileSystem = new FakeFileSystem({ [STATUS_PATH]: readProjectFile('examples/status.example.json') });
    const { meta } = await build(fileSystem, '2026-09-27T11:40:00Z').getSnapshot();
    expect(meta).toMatchObject({ idade_s: 600, velho: true });
  });

  it('sem arquivo: indisponível', async () => {
    await expect(build(new FakeFileSystem()).getSnapshot()).rejects.toThrow(StatusUnavailableError);
  });

  it('JSON quebrado ou fora do schema: inválido', async () => {
    await expect(build(new FakeFileSystem({ [STATUS_PATH]: '{ quebrado' })).getSnapshot()).rejects.toThrow(
      StatusInvalidError,
    );
    await expect(
      build(new FakeFileSystem({ [STATUS_PATH]: '{"agentes": 3}' })).getSnapshot(),
    ).rejects.toThrow(StatusInvalidError);
  });
});

describe('tema', () => {
  const customAgent = {
    nome: 'Arthur Dent',
    papel: 'Terráqueo',
    cor: '#00e5ff',
    desc: 'Verbete de teste.',
    frases: ['Quintas-feiras…'],
  };

  it('o tema padrão do repositório é válido', () => {
    expect(() => validateTheme(defaultTheme())).not.toThrow();
  });

  it('rejeita cor que não seja #rrggbb e sprite desconhecido', () => {
    expect(() => validateTheme({ agentes: { a: { ...customAgent, cor: 'red' } } })).toThrow(/Tema inválido/);
    const program = { nome: 'X', sprite: 'dragao', cor: '#ffffff', desc: 'd', frase: 'f' };
    expect(() => validateTheme({ programas: { x: program } })).toThrow(/Tema inválido/);
  });

  it('mergeThemes sobrescreve por verbete e só troca o roadmap se vier um', () => {
    const base = defaultTheme();
    const merged = mergeThemes(base, { agentes: { arthur: customAgent }, programas: {}, crons: {} });
    expect(Object.keys(merged.agentes)).toEqual([...Object.keys(base.agentes), 'arthur']);
    expect(merged.roadmap).toBe(base.roadmap);
    expect(mergeThemes(base, { agentes: {}, programas: {}, crons: {}, roadmap: [] }).roadmap).toEqual([]);
  });

  it('sem arquivo personalizado entrega o padrão', async () => {
    const service = createThemeService({
      defaultTheme: defaultTheme(),
      overridePath: null,
      fileSystem: new FakeFileSystem(),
      logger: new RecordingLogger(),
    });
    expect((await service.getTheme()).origem).toBe('padrao');
  });

  it('mescla o tema personalizado', async () => {
    const fileSystem = new FakeFileSystem({
      [THEME_PATH]: JSON.stringify({ agentes: { arthur: customAgent } }),
    });
    const service = createThemeService({
      defaultTheme: defaultTheme(),
      overridePath: THEME_PATH,
      fileSystem,
      logger: new RecordingLogger(),
    });
    const { theme, origem } = await service.getTheme();
    expect(origem).toBe('personalizado');
    expect(theme.agentes.arthur.nome).toBe('Arthur Dent');
    expect(theme.agentes['bot-telegram'].nome).toBe('Eddie');
  });

  it.each([
    ['ausente', new FakeFileSystem(), 'arquivo não encontrado'],
    [
      'inválido',
      new FakeFileSystem({ [THEME_PATH]: '{"agentes": {"a": {"cor": "red"}}}' }),
      expect.stringMatching(/Tema inválido/),
    ],
  ])('tema personalizado %s cai no padrão e registra o erro', async (_label, fileSystem, reason) => {
    const logger = new RecordingLogger();
    const service = createThemeService({
      defaultTheme: defaultTheme(),
      overridePath: THEME_PATH,
      fileSystem,
      logger,
    });
    expect((await service.getTheme()).origem).toBe('padrao-por-falha');
    expect(logger.messages('tema.personalizado_ignorado')[0].fields).toEqual({
      caminho: THEME_PATH,
      motivo: reason,
    });
  });

  it('tema padrão quebrado impede a criação do serviço', () => {
    const build = () =>
      createThemeService({
        defaultTheme: { agentes: 'x' },
        overridePath: null,
        fileSystem: new FakeFileSystem(),
        logger: new RecordingLogger(),
      });
    expect(build).toThrow(/Tema inválido/);
  });
});
