/** @jest-environment jsdom */
import { beforeEach, describe, expect, it } from '@jest/globals';
import { renderDashboard } from '../../public/js/render/dashboard.js';
import { renderStaticSprites, renderThemeSections } from '../../public/js/render/guide.js';
import { describeFailures } from '../../public/js/render/header.js';
import { metersHtml, powerHtml } from '../../public/js/render/motor.js';
import { programAction } from '../../public/js/render/hangar.js';
import { crewCardHtml } from '../../public/js/render/crew.js';
import { stampFor } from '../../public/js/render/vogon.js';
import { byId } from '../../public/js/render/dom.js';
import { drawBars } from '../../public/js/render/bars.js';
import { createHistory } from '../../public/js/lib/history.js';
import { SAMPLE_NOW, defaultTheme, loadPanelDom, sampleLookup, sampleStatus } from '../helpers/fixtures.js';

const text = (id) => byId(document, id).textContent;
const meta = { gerado_em: '2026-09-27T11:30:00Z', idade_s: 60, velho: false, versao: '0.1.0' };

function render(overrides = {}) {
  return renderDashboard(document, {
    status: sampleStatus(),
    meta,
    connection: 'ao-vivo',
    lookup: sampleLookup(),
    history: createHistory(48),
    now: SAMPLE_NOW,
    hostAddress: '192.0.2.10',
    version: '0.1.0',
    ...overrides,
  });
}

beforeEach(() => {
  loadPanelDom();
  renderStaticSprites(document);
});

describe('painel ao vivo com o status de exemplo', () => {
  beforeEach(() => render());

  it('mostra a nota 42 e não entra em pânico', () => {
    expect(text('score')).toBe('42');
    expect(text('panic-title')).toBe('NÃO ENTRE EM PÂNICO');
    expect(text('badge')).toBe('● AO VIVO');
    expect(text('hostname')).toBe('nave-exemplo');
    expect(text('src')).toContain('v0.1.0');
  });

  it('desenha tripulação, hangar, crons e diário com os nomes do Guia', () => {
    const crew = [...document.querySelectorAll('#crew h3')].map((node) => node.textContent);
    expect(crew).toEqual(['EDDIE', 'MAGRATHEA']);
    expect(document.querySelectorAll('#hangar .ship')).toHaveLength(4);
    expect(document.querySelectorAll('#vogon tr')).toHaveLength(2);
    expect(document.querySelectorAll('#log li')).toHaveLength(3);
    expect(text('crew-meta')).toBe('2/2EM ÓRBITA');
  });

  it('aplica as cores do tema via CSSOM, não via atributo style no HTML', () => {
    const card = document.querySelector('#crew .crew');
    expect(card.getAttribute('data-color')).toBe('#ffb8ff');
    expect(card.style.getPropertyValue('--c')).toBe('#ffb8ff');
    const markup = crewCardHtml(sampleStatus().agentes[0], {
      status: sampleStatus(),
      lookup: sampleLookup(),
      now: SAMPLE_NOW,
      hostAddress: 'x',
    });
    expect(markup).not.toContain('style=');
  });

  it('mostra hardware e rede', () => {
    expect(text('hw-cpu')).toBe('14');
    expect(byId(document, 'hw-cpu').parentElement.className).toBe('big lvl-ok');
    expect(text('hw-power')).toContain('estável');
    expect(text('net-rx')).toBe('180');
    expect(document.querySelectorAll('#meters .meter')).toHaveLength(3);
    expect(text('net-links')).toContain('api do chat');
  });

  it('coloca o Pac-Man e as pastilhas na rota do dia', () => {
    expect(document.querySelectorAll('#track .dot')).toHaveLength(48);
    expect(byId(document, 'pac').style.left).not.toBe('');
    expect(byId(document, 'chaser').hidden).toBe(true);
    expect(text('lane-next')).toContain('MAGRATHEA');
  });
});

describe('estados de alerta', () => {
  it('lista problemas e solta o Blinky', () => {
    const status = sampleStatus();
    status.agentes[0].estado = 'falha';
    render({ status });
    expect(text('panic-title')).toBe('ENTRE EM PÂNICO (SÓ UM POUCO)');
    expect(text('panic-sub')).toBe('1 problema: Eddie pânico');
    expect(byId(document, 'chaser').hidden).toBe(false);
    expect(document.querySelector('#crew .spr').innerHTML).toContain('#2121ff');
  });

  it('dados velhos derrubam a nota', () => {
    render({ meta: { ...meta, velho: true } });
    expect(text('panic-sub')).toContain('dados velhos');
  });

  it('sem nenhum sinal mostra painel vazio e nota zero', () => {
    render({ status: null, meta: null, connection: 'sem-conexao' });
    expect(text('score')).toBe('0');
    expect(text('badge')).toBe('✕ SEM CONEXÃO');
    expect(text('crew')).toContain('Ninguém a bordo');
    expect(text('hangar')).toContain('Hangar vazio');
    expect(text('vogon')).toContain('Nenhum formulário');
    expect(text('log')).toContain('Nada aconteceu');
    expect(text('hw-cpu')).toBe('--');
    expect(text('src')).toContain('nenhum sinal recebido');
  });

  it('modo simulação mostra o seletor de cenário', () => {
    render({ connection: 'simulacao', meta: null });
    expect(byId(document, 'demo-ctl').hidden).toBe(false);
    expect(text('src')).toContain('simulação');
  });

  it('resume no máximo três problemas', () => {
    const failures = ['a', 'b', 'c', 'd'].map((descricao) => ({ ok: false, descricao }));
    expect(describeFailures({ checks: failures, failures, score: 0, level: 'bad' })).toBe(
      '4 problemas: a · b · c …',
    );
  });
});

describe('segurança da renderização', () => {
  it('escapa textos vindos do coletor', () => {
    const status = sampleStatus();
    status.agentes[0].mensagem = '<img src=x onerror=alert(1)>';
    status.eventos[0].texto = '<script>alert(1)</script>';
    render({ status });
    expect(document.querySelector('#crew img')).toBeNull();
    expect(document.querySelector('#log script')).toBeNull();
    expect(text('crew')).toContain('<img src=x onerror=alert(1)>');
  });

  it('só cria links http(s) no Hangar', () => {
    expect(programAction({ id: 'a', estado: 'ok', url: 'javascript:alert(1)' }, 'host')).toBe('');
    expect(programAction({ id: 'a', estado: 'ok', porta: 9000 }, '192.0.2.10')).toContain(
      'href="http://192.0.2.10:9000/"',
    );
    expect(programAction({ id: 'a', estado: 'ok', compartilhamento: '\\\\nave' }, 'host')).toContain(
      'data-copy',
    );
    expect(programAction({ id: 'a', estado: 'ok' }, 'host')).toBe('');
  });
});

describe('peças do motor e dos crons', () => {
  it.each([
    [undefined, 'sem leitura'],
    ['0x50000', 'desde o boot: subtensão, throttling'],
    ['0x5', 'agora: subtensão, throttling'],
  ])('energia %p', (hex, expected) => {
    expect(powerHtml(hex)).toContain(expected);
  });

  it('sem leituras de memória não desenha medidores', () => {
    expect(metersHtml({})).toBe('');
    expect(metersHtml({ ram: { usado_mb: 1, total_mb: 0 } })).toBe('');
  });

  it('carimbos da burocracia', () => {
    expect(stampFor('ok').texto).toBe('APROVADO');
    expect(stampFor('falha').texto).toBe('INDEFERIDO');
    expect(stampFor(null).texto).toBe('PENDENTE');
    expect(stampFor('?').texto).toBe('PENDENTE');
  });
});

describe('O Guia e o roadmap', () => {
  it('preenche glossário, legenda e Terra Mk II a partir do tema', () => {
    const theme = defaultTheme();
    renderThemeSections(document, theme);
    expect(document.querySelectorAll('#gl-areas tr').length).toBeGreaterThan(5);
    expect(text('gl-crew')).toContain('EDDIE');
    expect(document.querySelectorAll('#legend div')).toHaveLength(4);
    expect(document.querySelectorAll('#future .fcard')).toHaveLength(theme.roadmap.length);
  });

  it('troca os marcadores data-spr por sprites', () => {
    expect(document.querySelectorAll('[data-spr]')).toHaveLength(0);
    expect(document.querySelectorAll('svg.spr').length).toBeGreaterThan(5);
  });
});

describe('drawBars', () => {
  it('pinta os blocos no canvas conforme a densidade da tela', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 96 });
    Object.defineProperty(canvas, 'clientHeight', { value: 20 });
    const painted = [];
    canvas.getContext = () => ({
      setTransform() {},
      clearRect() {},
      fillRect: (...args) => painted.push(args),
      fillStyle: '',
    });
    drawBars(canvas, { series: [{ values: [50, 100], color: '#0ff' }], max: 100, slots: 2 });
    expect(canvas.width).toBe(96);
    expect(painted.length).toBeGreaterThan(2);
  });

  it('não faz nada sem tamanho ou sem contexto 2D', () => {
    const canvas = document.createElement('canvas');
    canvas.getContext = () => null;
    expect(() => drawBars(canvas, { series: [], max: 1, slots: 1 })).not.toThrow();
  });
});
