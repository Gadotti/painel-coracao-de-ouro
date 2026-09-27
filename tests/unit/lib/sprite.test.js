import { describe, expect, it } from '@jest/globals';
import { ghostSprite, renderSprite } from '../../../public/js/sprites/sprite.js';
import { SPRITES, SPRITE_NAMES } from '../../../public/js/sprites/spriteDefs.js';

describe('definições de sprites', () => {
  it.each(SPRITE_NAMES)('%s tem todas as linhas com a mesma largura', (name) => {
    const { rows, rows2 } = SPRITES[name];
    const widths = new Set([...rows, ...(rows2 ?? [])].map((row) => row.length));
    expect(widths.size).toBe(1);
    if (rows2) expect(rows2).toHaveLength(rows.length);
  });
});

describe('renderSprite', () => {
  it('anima sprites de dois quadros', () => {
    const svg = renderSprite('pac', { scale: 2 });
    expect(svg).toContain('class="spr anim"');
    expect(svg).toContain('<g class="f0">');
    expect(svg).toContain('width="26"');
  });

  it('desliga a animação com still', () => {
    expect(renderSprite('pac', { still: true })).not.toContain('anim');
  });

  it('junta pixels vizinhos da mesma cor num só retângulo', () => {
    const svg = renderSprite('heart', { still: true });
    expect(svg).toContain('<rect x="1" y="0" width="3" height="1" fill="#ffc83d"/>');
  });

  it('usa o bloco "?" para nomes desconhecidos', () => {
    expect(renderSprite('nao-existe', { scale: 1 })).toContain('viewBox="0 0 12 12"');
  });
});

describe('ghostSprite', () => {
  it('ok usa a cor do agente', () => {
    expect(ghostSprite('ok', { color: '#00e5ff' })).toContain('fill="#00e5ff"');
  });

  it('aviso pisca', () => {
    expect(ghostSprite('aviso', { color: '#00e5ff' })).toContain('warn');
  });

  it('falha vira fantasma assustado', () => {
    expect(ghostSprite('falha')).toContain('#2121ff');
  });

  it('parado mostra só os olhos', () => {
    const svg = ghostSprite('parado');
    expect(svg).toContain('#ffffff');
    expect(svg).not.toContain('#ff3b3b');
  });

  it('cor inválida volta ao vermelho padrão', () => {
    expect(ghostSprite('ok', { color: 'red"><script>' })).toContain('fill="#ff3b3b"');
  });
});
