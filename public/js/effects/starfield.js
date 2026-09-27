const PIXEL_SIZE = 3;
const AREA_PER_STAR = 900;
const FRAME_MS = 60;
const SPEED = 0.35;
const BACKGROUND = '#04040c';
const STAR_COLORS = ['#ffffff', '#ffb8ff', '#00e5ff', '#ffe000', '#9494c8'];

/**
 * @typedef {object} Star
 * @property {number} x
 * @property {number} y
 * @property {number} depth
 * @property {string} color
 */

/**
 * @param {{ width: number, height: number }} size
 * @param {() => number} random
 * @returns {Star[]}
 */
export function createStars(size, random) {
  const count = Math.round((size.width * size.height) / AREA_PER_STAR);
  return Array.from({ length: count }, () => ({
    x: random() * size.width,
    y: random() * size.height,
    depth: random() * 0.6 + 0.1,
    color: STAR_COLORS[Math.floor(random() * STAR_COLORS.length)],
  }));
}

/**
 * Estrelas que passam da direita para a esquerda; quem sai da tela volta do outro lado.
 * @param {Star[]} stars
 * @param {{ width: number, height: number }} size
 * @param {() => number} random
 * @returns {void}
 */
export function advanceStars(stars, size, random) {
  for (const star of stars) {
    star.x -= star.depth * SPEED;
    if (star.x < 0) {
      star.x = size.width;
      star.y = random() * size.height;
    }
  }
}

/**
 * Campo de estrelas em pixel no fundo. Parado quando o usuário prefere menos movimento.
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion: boolean, random?: () => number }} options
 * @returns {() => void} Função que para a animação.
 * @example const stop = startStarfield(canvas, { reducedMotion: false })
 */
export function startStarfield(canvas, { reducedMotion, random = Math.random }) {
  const context = canvas.getContext?.('2d');
  if (!context) return () => {};
  let stars = /** @type {Star[]} */ ([]);
  const size = { width: 0, height: 0 };
  const resize = () => {
    size.width = canvas.width = Math.ceil(globalThis.innerWidth / PIXEL_SIZE);
    size.height = canvas.height = Math.ceil(globalThis.innerHeight / PIXEL_SIZE);
    stars = createStars(size, random);
  };
  const draw = () => {
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, size.width, size.height);
    for (const star of stars) {
      context.globalAlpha = 0.35 + star.depth;
      context.fillStyle = star.color;
      context.fillRect(Math.round(star.x), Math.round(star.y), 1, 1);
    }
    context.globalAlpha = 1;
  };
  const tick = () => {
    advanceStars(stars, size, random);
    draw();
  };
  resize();
  draw();
  globalThis.addEventListener('resize', resize);
  const timer = reducedMotion ? null : setInterval(tick, FRAME_MS);
  return () => {
    if (timer) clearInterval(timer);
    globalThis.removeEventListener('resize', resize);
  };
}
