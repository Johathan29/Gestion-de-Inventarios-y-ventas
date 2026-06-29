/**
 * useAnimeEffects — Micro-interacciones con anime.js v4
 *
 * Proporciona animaciones ligeras para:
 * - Pulse de iconos
 * - Stagger lettering
 * - Float / levitación suave
 * - Ripple en botones
 * - Morphing de backgrounds
 * - Contador numérico alternativo
 * - Efecto "glow" en hover
 */
import { animate, stagger, utils } from 'animejs';

/**
 * Pulso sutil en un icono (escala + rotación leve).
 * @param {string|Element} target — Selector o elemento.
 * @param {object} opts — { scale, duration, loop }
 */
export function useIconPulse(target, opts = {}) {
  const { scale = 1.15, duration = 800, loop = true } = opts;
  return animate(target, {
    scale: [1, scale, 1],
    duration,
    easing: 'easeInOutSine',
    loop,
  });
}

/**
 * Animación de "levitación" flotante continua.
 */
export function useFloat(target, opts = {}) {
  const { translateY = [-6, 6], duration = 2500, delay = 0 } = opts;
  return animate(target, {
    translateY,
    duration,
    easing: 'easeInOutSine',
    direction: 'alternate',
    loop: true,
    delay,
  });
}

/**
 * Stagger de entrada para tarjetas / elementos.
 */
export function useStaggerEntrance(target, opts = {}) {
  const {
    translateY = 40,
    opacity = [0, 1],
    delay = 100,
    duration = 600,
    staggerDelay = 80,
    easing = 'easeOutElastic(1, .5)',
    begin,
    complete,
  } = opts;
  return animate(target, {
    translateY,
    opacity,
    delay: stagger(staggerDelay, { start: delay }),
    duration,
    easing,
    begin,
    complete,
  });
}

/**
 * Efecto Ripple en botón al hacer clic.
 * @param {Event} event — Evento de click.
 * @param {object} opts — { color, size }
 */
export function useButtonRipple(event, opts = {}) {
  const { color = 'rgba(233,179,252,0.4)', size = 30 } = opts;
  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: ${color};
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    pointer-events: none;
    z-index: 0;
  `;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);

  animate(ripple, {
    scale: [0, 6],
    opacity: [0.8, 0],
    duration: 600,
    easing: 'easeOutCubic',
    complete: () => ripple.remove(),
  });
}

/**
 * Animación de "glow" pulsante para badges o elementos destacados.
 */
export function useGlowPulse(target, opts = {}) {
  const { boxShadow = '0 0 18px rgba(233,179,252,0.5)', duration = 1200 } = opts;
  return animate(target, {
    boxShadow: ['0 0 0 rgba(233,179,252,0)', boxShadow, '0 0 0 rgba(233,179,252,0)'],
    duration,
    easing: 'easeInOutSine',
    loop: true,
  });
}

/**
 * Animación del background del icono en StatCards (cambio de color sutil).
 */
export function useIconBgMorph(target, opts = {}) {
  const { from = '#f5f0eb', to = '#e9b3fc', duration = 400 } = opts;
  return animate(target, {
    backgroundColor: [from, to, from],
    duration,
    easing: 'easeInOutSine',
    loop: 2,
  });
}

/**
 * Contador numérico animado con anime.js.
 * @param {object} ref — Vue ref con el valor actual.
 * @param {number} toVal — Valor final.
 */
export function useAnimeCounter(ref, toVal, opts = {}) {
  const { duration = 1200, easing = 'easeOutCubic', precision = 0 } = opts;
  const obj = { val: Number(ref.value) || 0 };

  return animate(obj, {
    val: toVal,
    duration,
    easing,
    round: precision,
    update: () => {
      ref.value = obj.val;
    },
  });
}

/**
 * Animación de entrada con bounce para WhatsApp Widget.
 */
export function useBounceIn(target, opts = {}) {
  const { delay = 300, duration = 800 } = opts;
  return animate(target, {
    scale: [0, 1.1, 1],
    opacity: [0, 1],
    duration,
    delay,
    easing: 'easeOutCubic',
  });
}

/**
 * Texto con stagger de letras (efecto glitch suave / revelado).
 */
export function useLetterStagger(target, opts = {}) {
  const { duration = 1000, staggerDelay = 30, from = 'center' } = opts;

  // Wrap each letter in a span
  const text = target.textContent;
  target.textContent = '';
  const chars = text.split('').map(ch => {
    const span = document.createElement('span');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.display = 'inline-block';
    target.appendChild(span);
    return span;
  });

  return animate(chars, {
    opacity: [0, 1],
    translateY: [20, 0],
    rotateX: [90, 0],
    duration,
    delay: stagger(staggerDelay, { from }),
    easing: 'easeOutElastic(1, .6)',
  });
}

export default {
  useIconPulse,
  useFloat,
  useStaggerEntrance,
  useButtonRipple,
  useGlowPulse,
  useIconBgMorph,
  useAnimeCounter,
  useBounceIn,
  useLetterStagger,
};
