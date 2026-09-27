import { renderSprite } from '../sprites/sprite.js';

const EFFECT_MS = 3200;
const FALLER_EXTRA_MS = 3400;
const PETUNIA_DELAY_S = 0.35;
const WHALE_SCALE = 7;
const PETUNIA_SCALE = 6;
const FANFARE_HZ = [523, 659, 784, 1047, 784, 1319];
const FANFARE_NOTE_S = 0.07;
const FANFARE_VOLUME = 0.04;

export const IMPROBABLE_LINES = Object.freeze([
  'Oh não, de novo não.',
  'Olá, chão! Será que vamos ser amigos?',
  'Dois mísseis viraram uma baleia e um vaso de petúnias.',
  'Probabilidade restaurada: 1 para 1. Nada mudou. Provavelmente.',
  'Isso foi altamente improvável.',
]);

/**
 * Toca uma fanfarra 8-bit curta; sem suporte a áudio, fica em silêncio.
 * @param {typeof AudioContext | undefined} AudioContextClass
 * @returns {void}
 * @example playFanfare(window.AudioContext)
 */
export function playFanfare(AudioContextClass) {
  if (!AudioContextClass) return;
  try {
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'square';
    oscillator.connect(gain);
    gain.connect(audio.destination);
    gain.gain.value = FANFARE_VOLUME;
    FANFARE_HZ.forEach((hz, index) =>
      oscillator.frequency.setValueAtTime(hz, audio.currentTime + index * FANFARE_NOTE_S),
    );
    oscillator.start();
    oscillator.stop(audio.currentTime + FANFARE_HZ.length * FANFARE_NOTE_S);
    oscillator.onended = () => audio.close();
  } catch {
    // Navegadores podem bloquear áudio; o efeito visual continua.
  }
}

/**
 * @param {Document} doc
 * @param {{ sprite: string, scale: number, leftVw: number, delayS: number }} faller
 * @returns {void}
 */
function dropFaller(doc, { sprite, scale, leftVw, delayS }) {
  const element = doc.createElement('div');
  element.className = 'faller';
  element.style.left = `${leftVw}vw`;
  element.style.animationDelay = `${delayS}s`;
  element.innerHTML = renderSprite(sprite, { scale });
  doc.body.appendChild(element);
  setTimeout(() => element.remove(), FALLER_EXTRA_MS + delayS * 1000);
}

/**
 * @param {Document} doc
 * @param {string} text
 * @returns {HTMLElement}
 */
function showToast(doc, text) {
  const toast = doc.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = text;
  doc.body.appendChild(toast);
  return toast;
}

/**
 * Botão sem utilidade prática: cai uma baleia e um vaso de petúnias.
 * @param {{ doc: Document, random?: () => number, playSound?: () => void }} options
 * @returns {{ trigger: () => boolean }}
 * @example createImprobabilityDrive({ doc: document }).trigger()
 */
export function createImprobabilityDrive({ doc, random = Math.random, playSound = () => {} }) {
  let busy = false;
  return {
    trigger() {
      if (busy) return false;
      busy = true;
      doc.body.classList.add('improbavel');
      playSound();
      dropFaller(doc, { sprite: 'whale', scale: WHALE_SCALE, leftVw: 15 + random() * 40, delayS: 0 });
      dropFaller(doc, {
        sprite: 'petunia',
        scale: PETUNIA_SCALE,
        leftVw: 55 + random() * 30,
        delayS: PETUNIA_DELAY_S,
      });
      const toast = showToast(doc, IMPROBABLE_LINES[Math.floor(random() * IMPROBABLE_LINES.length)]);
      setTimeout(() => {
        toast.remove();
        doc.body.classList.remove('improbavel');
        busy = false;
      }, EFFECT_MS);
      return true;
    },
  };
}
