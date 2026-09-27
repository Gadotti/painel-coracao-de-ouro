/** @jest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createPanelController, historySample } from '../../public/js/data/panelController.js';
import { createStatusClient } from '../../public/js/data/statusClient.js';
import { createHistory } from '../../public/js/lib/history.js';
import { byId } from '../../public/js/render/dom.js';
import { renderStaticSprites } from '../../public/js/render/guide.js';
import {
  IMPROBABLE_LINES,
  createImprobabilityDrive,
  playFanfare,
} from '../../public/js/effects/improbability.js';
import { advanceStars, createStars, startStarfield } from '../../public/js/effects/starfield.js';
import { ScriptedFetch } from '../fakes/scriptedFetch.js';
import { SAMPLE_NOW, defaultTheme, loadPanelDom, sampleStatus } from '../helpers/fixtures.js';

const text = (id) => byId(document, id).textContent;
const meta = { gerado_em: '2026-09-27T11:30:00Z', idade_s: 60, velho: false, versao: '0.1.0' };

function buildController(script) {
  const fake = new ScriptedFetch(script);
  const client = createStatusClient({
    fetchFn: fake.fetch,
    statusUrl: '/api/status',
    themeUrl: '/api/theme',
  });
  const history = createHistory(48);
  const controller = createPanelController({
    root: document,
    client,
    history,
    environment: { clock: () => SAMPLE_NOW, random: () => 0.5, hostAddress: '192.0.2.10' },
  });
  return { controller, history };
}

beforeEach(() => {
  loadPanelDom();
  renderStaticSprites(document);
});

describe('createPanelController', () => {
  it('fica ao vivo com status real e guarda o histórico', async () => {
    const { controller, history } = buildController({
      '/api/status': [{ status: 200, body: { status: sampleStatus(), meta } }],
    });
    controller.setTheme(defaultTheme());
    const health = await controller.refresh();
    expect(health.score).toBe(42);
    expect(text('badge')).toBe('● AO VIVO');
    expect(history.values('cpu')).toEqual([14.2]);
  });

  it('perde a conexão mantendo o último status, sem duplicar o histórico', async () => {
    const { controller, history } = buildController({
      '/api/status': [{ status: 200, body: { status: sampleStatus(), meta } }, new Error('rede caiu')],
    });
    controller.setTheme(defaultTheme());
    await controller.refresh();
    await controller.refresh();
    expect(text('badge')).toBe('✕ SEM CONEXÃO');
    expect(document.querySelectorAll('#crew .crew')).toHaveLength(2);
    expect(history.values('cpu')).toHaveLength(1);
  });

  it('sem status no servidor fica "sem sinal"', async () => {
    const { controller } = buildController({ '/api/status': [{ status: 503 }] });
    const health = await controller.refresh();
    expect(text('badge')).toBe('✕ SEM SINAL');
    expect(health.score).toBe(0);
  });

  it('roda a simulação só quando pedida', () => {
    const { controller, history } = buildController({});
    expect(controller.tickDemo()).toBeNull();
    controller.startDemo('vogons');
    controller.tickDemo();
    expect(text('badge')).toBe('◌ SIMULAÇÃO');
    expect(history.values('cpu')).toHaveLength(1);
  });

  it('usa os verbetes do tema recebido', async () => {
    const { controller } = buildController({
      '/api/status': [{ status: 200, body: { status: sampleStatus(), meta } }],
    });
    const theme = defaultTheme();
    theme.agentes['bot-telegram'].nome = 'Computador Eddie';
    controller.setTheme(theme);
    await controller.refresh();
    expect(document.querySelector('#crew h3').textContent).toBe('COMPUTADOR EDDIE');
  });

  it('historySample tolera leituras ausentes', () => {
    expect(historySample(sampleStatus({ hardware: {}, rede: {} }))).toEqual({ cpu: 0, rx: 0, tx: 0 });
  });
});

describe('improbabilidade', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('solta baleia, petúnias e uma frase, e limpa tudo depois', () => {
    let played = 0;
    const drive = createImprobabilityDrive({ doc: document, random: () => 0, playSound: () => played++ });
    expect(drive.trigger()).toBe(true);
    expect(drive.trigger()).toBe(false);
    expect(played).toBe(1);
    expect(document.body.classList.contains('improbavel')).toBe(true);
    expect(document.querySelectorAll('.faller')).toHaveLength(2);
    expect(document.querySelector('.toast').textContent).toBe(IMPROBABLE_LINES[0]);
    jest.advanceTimersByTime(5000);
    expect(document.querySelector('.toast')).toBeNull();
    expect(document.querySelectorAll('.faller')).toHaveLength(0);
    expect(drive.trigger()).toBe(true);
  });

  it('a fanfarra usa o áudio quando existe e nunca quebra', () => {
    const calls = [];
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          connect: () => calls.push('connect'),
          frequency: { setValueAtTime: (hz) => calls.push(hz) },
          start: () => calls.push('start'),
          stop: () => calls.push('stop'),
        };
      }
      createGain() {
        return { connect() {}, gain: { value: 0 } };
      }
      close() {}
    }
    playFanfare(FakeAudioContext);
    expect(calls).toEqual(expect.arrayContaining(['start', 'stop', 523]));
    expect(() => playFanfare(undefined)).not.toThrow();
    class BrokenAudio {
      constructor() {
        throw new Error('bloqueado');
      }
    }
    expect(() => playFanfare(BrokenAudio)).not.toThrow();
  });
});

describe('campo de estrelas', () => {
  it('cria estrelas proporcionais à área e as recicla na borda', () => {
    const size = { width: 90, height: 100 };
    const stars = createStars(size, () => 0.5);
    expect(stars).toHaveLength(10);
    stars[0].x = 0.01;
    advanceStars(stars, size, () => 0.2);
    expect(stars[0]).toMatchObject({ x: 90, y: 20 });
  });

  it('anima e para; sem canvas 2D vira no-op', () => {
    jest.useFakeTimers();
    const canvas = document.createElement('canvas');
    let frames = 0;
    canvas.getContext = () => ({ fillRect: () => frames++, globalAlpha: 1, fillStyle: '' });
    const stop = startStarfield(canvas, { reducedMotion: false, random: () => 0.5 });
    const before = frames;
    jest.advanceTimersByTime(200);
    expect(frames).toBeGreaterThan(before);
    stop();
    const stopped = frames;
    jest.advanceTimersByTime(200);
    expect(frames).toBe(stopped);
    jest.useRealTimers();

    const still = startStarfield(canvas, { reducedMotion: true });
    expect(typeof still).toBe('function');
    still();
    const noCanvas = document.createElement('canvas');
    noCanvas.getContext = () => null;
    expect(() => startStarfield(noCanvas, { reducedMotion: false })()).not.toThrow();
  });
});
