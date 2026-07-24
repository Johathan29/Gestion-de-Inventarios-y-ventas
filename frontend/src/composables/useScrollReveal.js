import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable for scroll-triggered reveal animations.
 * Usage:
 *   const { revealRef } = useScrollReveal({ threshold: 0.15 });
 *   <div ref="revealRef" class="scroll-reveal">...</div>
 */
export function useScrollReveal(options = {}) {
  const revealRef = ref(null);
  let observer = null;

  onMounted(() => {
    const el = revealRef.value;
    if (!el) return;

    const threshold = options.threshold ?? 0.15;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: options.rootMargin || '0px 0px -40px 0px' }
    );

    observer.observe(el);
  });

  onUnmounted(() => {
    if (observer) observer.disconnect();
  });

  return { revealRef };
}
