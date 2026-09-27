/**
 * Busca um elemento obrigatório pelo id; falha alto se o HTML e o JS saírem de sincronia.
 * @param {ParentNode} root
 * @param {string} id
 * @returns {HTMLElement}
 * @example byId(document, 'score')
 */
export function byId(root, id) {
  const element = root.querySelector(`#${id}`);
  if (!element) throw new Error(`Elemento #${id} não encontrado; esperado no index.html do painel.`);
  return /** @type {HTMLElement} */ (element);
}

/** @type {WeakMap<Element, string>} */
const lastMarkup = new WeakMap();

/**
 * Só troca o HTML quando ele muda — evita reiniciar as animações dos sprites a cada atualização.
 * @param {Element} element
 * @param {string} markup
 * @returns {void}
 * @example setHtmlIfChanged(byId(document, 'crew'), '<p>…</p>')
 */
export function setHtmlIfChanged(element, markup) {
  if (lastMarkup.get(element) === markup) return;
  element.innerHTML = markup;
  lastMarkup.set(element, markup);
}

/**
 * O CSP bloqueia `style=""` em HTML injetado; posições (`data-pos`, em %) e cores (`data-color`)
 * viajam como atributos e são aplicadas aqui via CSSOM, que o CSP permite.
 * @param {ParentNode} container
 * @returns {void}
 * @example applyDataStyles(byId(document, 'crew'))
 */
export function applyDataStyles(container) {
  container.querySelectorAll('[data-pos]').forEach((element) => {
    const target = /** @type {HTMLElement} */ (element);
    target.style.left = `${Number(target.dataset.pos)}%`;
  });
  container.querySelectorAll('[data-color]').forEach((element) => {
    const target = /** @type {HTMLElement} */ (element);
    target.style.setProperty('--c', target.dataset.color);
  });
}

/**
 * Como `setHtmlIfChanged`, já aplicando os estilos dos atributos `data-*`.
 * @param {Element} element
 * @param {string} markup
 * @returns {void}
 * @example renderInto(byId(document, 'hangar'), '<li data-color="#fff">…</li>')
 */
export function renderInto(element, markup) {
  setHtmlIfChanged(element, markup);
  applyDataStyles(element);
}

/**
 * @param {ParentNode} root
 * @param {string} id
 * @param {string} text
 * @returns {void}
 * @example setText(document, 'score', '42')
 */
export function setText(root, id, text) {
  byId(root, id).textContent = text;
}
