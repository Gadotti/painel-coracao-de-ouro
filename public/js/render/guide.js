import { byId } from './dom.js';
import { ghostSprite, renderSprite } from '../sprites/sprite.js';
import { escapeHtml } from '../lib/format.js';

/** @typedef {import('../types.js').PanelTheme} PanelTheme */

/** Verbetes fixos: o que cada área do painel significa. */
export const AREA_ENTRIES = Object.freeze([
  ['CORAÇÃO DE OURO', 'O painel inteiro: a ponte de comando da nave.'],
  ['42', 'Nota de saúde. Cada checagem que passa conta; tudo certo dá 42.'],
  ['NÃO ENTRE EM PÂNICO', 'Resumo do estado. Muda de cor e lista o que está errado.'],
  [
    'ROTA DO DIA',
    'O Pac-Man anda com o relógio; as pastilhas grandes são os crons de hoje. Se Blinky aparecer atrás dele, há problema.',
  ],
  ['MOTOR DE IMPROBABILIDADE', 'Hardware: CPU, temperatura, RAM, swap, cartão SD, energia.'],
  ['TRIPULAÇÃO', 'Agentes e scripts (systemd, cron) que trabalham sozinhos.'],
  ['HANGAR', 'Programas e containers, com atalho para abrir cada um.'],
  ['PEIXE BABEL', 'Rede: tráfego, ping, internet e serviços externos de que os agentes dependem.'],
  ['BUROCRACIA VOGON', 'Crons: agenda, última execução, resultado (carimbo) e próxima execução.'],
  ['MARVIN', 'Diário de bordo. Quanto mais avisos e erros, mais deprimido ele fica.'],
  ['TERRA MK II', 'Roadmap: o que ainda vai ser instalado.'],
  ['IMPROBABILIDADE ∞', 'Botão sem nenhuma utilidade prática. Aperte mesmo assim.'],
]);

/**
 * @param {Array<[string, string]>} rows
 * @returns {string}
 */
function glossaryRows(rows) {
  return rows.map(([term, meaning]) => `<tr><td>${escapeHtml(term)}</td><td>${meaning}</td></tr>`).join('');
}

/**
 * @param {PanelTheme} theme
 * @returns {Array<[string, string]>}
 */
export function crewEntries(theme) {
  const describe = (/** @type {string} */ id, /** @type {{ nome: string, desc: string }} */ entry) =>
    /** @type {[string, string]} */ ([
      entry.nome.toUpperCase(),
      `${escapeHtml(entry.desc)} <span class="st-parado">(${escapeHtml(id)})</span>`,
    ]);
  return [
    ...Object.entries(theme.agentes).map(([id, entry]) => describe(id, entry)),
    ...Object.entries(theme.programas).map(([id, entry]) => describe(id, entry)),
  ];
}

/**
 * @returns {string}
 */
function legendHtml() {
  return [
    [ghostSprite('ok', { color: '#ff3b3b', scale: 3 }), 'EM ÓRBITA — tudo certo'],
    [ghostSprite('aviso', { color: '#ffb852', scale: 3 }), 'TURBULÊNCIA — rodando com aviso (pisca)'],
    [ghostSprite('falha', { scale: 3 }), 'PÂNICO — falhou (fantasma assustado)'],
    [ghostSprite('parado', { scale: 3 }), 'À DERIVA — parado (só os olhos)'],
  ]
    .map(([sprite, text]) => `<div>${sprite}<span>${text}</span></div>`)
    .join('');
}

/**
 * Preenche o diálogo "O Guia" e o roadmap (Terra Mk II), que só mudam com o tema.
 * @param {ParentNode} root
 * @param {PanelTheme} theme
 * @returns {void}
 * @example renderThemeSections(document, theme)
 */
export function renderThemeSections(root, theme) {
  byId(root, 'gl-areas').innerHTML = glossaryRows(
    AREA_ENTRIES.map(([term, meaning]) => [term, escapeHtml(meaning)]),
  );
  byId(root, 'gl-crew').innerHTML = glossaryRows(crewEntries(theme));
  byId(root, 'legend').innerHTML = legendHtml();
  byId(root, 'future').innerHTML = theme.roadmap
    .map(
      (item) => `<div class="fcard">
      ${item.sprite === 'ghost' ? ghostSprite('parado', { scale: 3 }) : renderSprite(item.sprite, { scale: 3 })}
      <div><b>${escapeHtml(item.nome.toUpperCase())}</b><small>${escapeHtml(item.real)} · NA PRANCHETA</small><p>${escapeHtml(item.desc)}</p></div>
    </div>`,
    )
    .join('');
}

/**
 * Troca os marcadores `data-spr` do HTML estático pelos sprites.
 * @param {ParentNode} root
 * @returns {void}
 * @example renderStaticSprites(document)
 */
export function renderStaticSprites(root) {
  root.querySelectorAll('[data-spr]').forEach((placeholder) => {
    const element = /** @type {HTMLElement} */ (placeholder);
    const color = element.dataset.ghostColor;
    element.outerHTML = renderSprite(element.dataset.spr, {
      scale: Number(element.dataset.scale) || 3,
      pal: color ? { X: color } : undefined,
    });
  });
}
