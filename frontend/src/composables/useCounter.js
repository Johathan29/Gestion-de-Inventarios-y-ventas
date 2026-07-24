import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable for animated counter with IntersectionObserver.
 * Counts from 0 to target value when element enters viewport.
 *
 * Usage:
 *   const { counter, elementRef } = useCounter(() => 1500000, { duration: 2000 });
 *   <span ref="elementRef">{{ counter }}</span>
 *
 * @param {Function|Ref} targetGetter - Function that returns the target number
 * @param {Object} options
 * @param {number} options.duration - Animation duration in ms (default: 2000)
 * @param {boolean} options.easing - Apply ease-out cubic (default: true)
 * @param {number} options.threshold - Intersection threshold (default: 0.3)
 * @param {boolean} options.autoStart - Start when visible (default: true)
 * @param {boolean} options.resetOnFocus - Re-trigger on window focus (default: false)
 */
export function useCounter(targetGetter, options = {}) {
  const {
    duration = 2000,
    easing = true,
    threshold = 0.3,
    autoStart = true,
    resetOnFocus = false
  } = options;

  const counter = ref(0);
  const elementRef = ref(null);
  const isAnimating = ref(false);
  const hasAnimated = ref(false);

  let observer = null;
  let animationId = null;
  let startTime = null;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing ? easeOutCubic(progress) : progress;

    const target = typeof targetGetter === 'function' ? targetGetter() : targetGetter;
    counter.value = Math.round(easedProgress * Number(target));

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      const finalTarget = typeof targetGetter === 'function' ? targetGetter() : targetGetter;
      counter.value = Number(finalTarget);
      isAnimating.value = false;
      hasAnimated.value = true;
    }
  }

  function start() {
    if (hasAnimated.value) return;
    const target = typeof targetGetter === 'function' ? targetGetter() : targetGetter;
    if (Number(target) === 0) {
      counter.value = 0;
      hasAnimated.value = true;
      return;
    }
    isAnimating.value = true;
    startTime = null;
    counter.value = 0;
    animationId = requestAnimationFrame(animate);
  }

  function reset() {
    if (animationId) cancelAnimationFrame(animationId);
    counter.value = 0;
    isAnimating.value = false;
    hasAnimated.value = false;
    startTime = null;
  }

  function onFocus() {
    if (resetOnFocus && !hasAnimated.value) {
      start();
    }
  }

  onMounted(() => {
    if (autoStart && elementRef.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimated.value) {
              start();
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold, rootMargin: '0px 0px -40px 0px' }
      );
      observer.observe(elementRef.value);
    } else if (autoStart) {
      start();
    }

    if (resetOnFocus) {
      window.addEventListener('focus', onFocus);
    }
  });

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (observer) observer.disconnect();
    if (resetOnFocus) {
      window.removeEventListener('focus', onFocus);
    }
  });

  return {
    counter,
    elementRef,
    start,
    reset,
    isAnimating,
    hasAnimated
  };
}
