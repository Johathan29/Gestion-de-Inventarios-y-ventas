/**
 * useGsapAnimations — Composable para animaciones con GSAP + ScrollTrigger
 *
 * Proporciona animaciones reutilizables para:
 * - Scroll-triggered entrance/exit de secciones
 * - Stagger de tarjetas (productos, reseñas, ofertas)
 * - Timeline del Hero
 * - Animación numérica (contadores) para KPIs
 * - Efectos parallax sutiles
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Anima una sección completa cuando entra al viewport.
 * @param {string|Element} target — Selector o elemento.
 * @param {object} opts — { from, to, trigger, start, end, scrub, markers }
 */
export function useSectionReveal(target, opts = {}) {
  const defaults = {
    from: { opacity: 0, y: 60, scale: 0.97, filter: 'blur(6px)' },
    to: { opacity: 1, y: 0, scale: 1, filter: 'blur(0)', duration: 1.2, ease: 'power3.out' },
    start: 'top 85%',
    end: 'top 35%',
    toggleActions: 'play none none none',
    ...opts,
  };
  return gsap.fromTo(target, defaults.from, {
    ...defaults.to,
    scrollTrigger: {
      trigger: defaults.trigger || target,
      start: defaults.start,
      end: defaults.end,
      toggleActions: defaults.toggleActions,
      ...(opts.scrollTrigger || {}),
    },
  });
}

/**
 * Stagger de tarjetas hijos dentro de un contenedor.
 * @param {string|Element} container — Contenedor padre.
 * @param {string} childSelector — Selector de hijos (ej: '.product-card').
 * @param {object} opts — { from, stagger, start, ... }
 */
export function useStaggerReveal(container, childSelector, opts = {}) {
  const defaults = {
    from: { opacity: 0, y: 50, scale: 0.95 },
    stagger: 0.15,
    duration: 0.8,
    ease: 'back.out(1.2)',
    start: 'top 85%',
    ...opts,
  };
  const children = gsap.utils.toArray(
    typeof container === 'string'
      ? `${container} ${childSelector}`
      : container?.querySelectorAll?.(childSelector) ?? []
  );
  if (!children.length) return null;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: defaults.start,
      toggleActions: 'play none none reverse',
    },
  });
  tl.fromTo(
    children,
    defaults.from,
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: defaults.duration,
      ease: defaults.ease,
      stagger: defaults.stagger,
    }
  );
  return tl;
}

/**
 * Timeline entrada del Hero (badge, título, descripción, CTA, imagen).
 * @param {object} refs — { badge, title, description, cta, image }
 */
export function useHeroTimeline(refs) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (refs.badge) {
    tl.fromTo(refs.badge,
      { opacity: 0, y: -20, scale: 0.8 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6 }
    );
  }

  if (refs.title) {
    const lines = refs.title.querySelectorAll?.('span, .line') || [refs.title];
    tl.fromTo(
      lines,
      { opacity: 0, y: 40, rotateX: -15 },
      { opacity: 1, y: 0, rotateX: 0, duration: 0.8, stagger: 0.12 },
      '-=0.3'
    );
  }

  if (refs.description) {
    tl.fromTo(refs.description,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7 },
      '-=0.4'
    );
  }

  if (refs.cta) {
    const btns = refs.cta.querySelectorAll?.('button, a, .btn') || [refs.cta];
    tl.fromTo(
      btns,
      { opacity: 0, y: 30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1 },
      '-=0.3'
    );
  }

  if (refs.image) {
    tl.fromTo(refs.image,
      { opacity: 0, scale: 0.7, rotateY: 25 },
      { opacity: 1, scale: 1, rotateY: 0, duration: 1.0 },
      '-=0.6'
    );
  }

  return tl;
}

/**
 * Animación de contador numérico con GSAP.
 * @param {number|Element} target — Valor final o elemento donde mostrar.
 * @param {object} opts — { from, to, duration, onUpdate, ease }
 * @returns {gsap.core.Tween}
 */
export function useCountUp(target, opts = {}) {
  const { from = 0, to = 0, duration = 1.5, onUpdate, ease = 'power2.out' } = opts;
  const obj = { val: from };

  return gsap.to(obj, {
    val: to,
    duration,
    ease,
    onUpdate: onUpdate ? () => onUpdate(obj.val) : undefined,
  });
}

/**
 * Animación parallax sutil en scroll.
 */
export function useParallax(target, opts = {}) {
  const { yPercent = -20, start = 'top bottom', end = 'bottom top' } = opts;
  return gsap.fromTo(
    target,
    { y: 0 },
    {
      y: yPercent,
      ease: 'none',
      scrollTrigger: {
        trigger: target,
        start,
        end,
        scrub: 1,
      },
    }
  );
}

/**
 * Efecto de enfoque / atención cuando una sección está centrada en el viewport.
 * Escala + brillo sutil.
 */
export function useFocusHighlight(target, opts = {}) {
  const { scale = 1.02, duration = 0.6 } = opts;

  return gsap.fromTo(
    target,
    { scale: 1, filter: 'brightness(1)' },
    {
      scale,
      filter: 'brightness(1.05)',
      duration,
      ease: 'power1.inOut',
      scrollTrigger: {
        trigger: target,
        start: 'top 40%',
        end: 'top 10%',
        scrub: 1,
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Inicializa todas las animaciones de scroll del Landing.
 * Busca elementos con data-gsap="section", data-gsap="stagger", etc.
 */
export function useLandingAnimations() {
  /**
   * Inicializa animaciones escaneando el DOM.
   * Llamar desde onMounted de LandingView.
   */
  function init() {
    // Limpiar ScrollTriggers anteriores (evita duplicados en HMR)
    ScrollTrigger.getAll().forEach(st => st.kill());

    // --- Sections with data-gsap="section" ---
    gsap.utils.toArray('[data-gsap="section"]').forEach(section => {
      useSectionReveal(section, {
        from: { opacity: 0, y: 60, scale: 0.97, filter: 'blur(6px)' },
        to: { opacity: 1, y: 0, scale: 1, filter: 'blur(0)', duration: 1.2, ease: 'power3.out' },
        start: 'top 82%',
      });
      useFocusHighlight(section);
    });

    // --- Section titles with data-gsap="section-title" ---
    gsap.utils.toArray('[data-gsap="section-title"]').forEach(title => {
      useSectionReveal(title, {
        from: { opacity: 0, y: 30, scale: 0.98 },
        to: { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power2.out' },
        start: 'top 88%',
      });
    });

    // --- Stagger containers with data-gsap="stagger" ---
    gsap.utils.toArray('[data-gsap="stagger"]').forEach(container => {
      useStaggerReveal(container, '[data-gsap="item"]', {
        start: 'top 83%',
        stagger: 0.13,
        ease: 'back.out(1.4)',
      });
    });

    // --- Parallax elements with data-gsap="parallax" ---
    gsap.utils.toArray('[data-gsap="parallax"]').forEach(el => {
      useParallax(el, { yPercent: -15 });
    });

    // Force initial refresh
    ScrollTrigger.refresh();
  }

  /**
   * Limpia todos los ScrollTriggers. Llamar desde onUnmounted.
   */
  function cleanup() {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }

  /**
   * Refresca ScrollTrigger (útil tras cambios de layout).
   */
  function refresh() {
    ScrollTrigger.refresh();
  }

  return { init, cleanup, refresh };
}

export default {
  useSectionReveal,
  useStaggerReveal,
  useHeroTimeline,
  useCountUp,
  useParallax,
  useFocusHighlight,
  useLandingAnimations,
};
