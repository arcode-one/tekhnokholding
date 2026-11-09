// Native timelines follow the browser's scrolling thread, including touch inertia.
// Root scroll + pixel ranges also work inside clipped photos / horizontal rails,
// where a ViewTimeline would otherwise bind to the wrong scroll container.
const touch = matchMedia('(hover: none) and (pointer: coarse)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const supported = typeof ScrollTimeline === 'function' &&
  'rangeStart' in Animation.prototype && CSS.supports('animation-range: 0px 1px');
let timeline;
let viewportFrame;
let viewport;

// Fallback effects read the viewport once per animation frame, before any of
// them write transforms. Reading it again after a write can force style/layout.
export function readMotionViewport(timestamp) {
  if (!touch.matches) return { y: scrollY, height: innerHeight };
  if (typeof timestamp !== 'number' || timestamp !== viewportFrame) {
    viewportFrame = timestamp;
    viewport = { y: scrollY, height: innerHeight };
  }
  return viewport;
}

export function createScrollMotion() {
  const animations = new Map();
  let failed = false;
  const motion = {
    get enabled() {
      return supported && !failed && touch.matches && !reduced.matches &&
        document.body.classList.contains('home-page--touch');
    },
    set(element, keyframes, start, end, options = {}) {
      if (!element || !motion.enabled || end <= start) return false;
      try {
        timeline ??= new ScrollTimeline({ source: document.scrollingElement, axis: 'block' });
        animations.get(element)?.cancel();
        const animation = element.animate(keyframes, {
          timeline, rangeStart: `${start}px`, rangeEnd: `${end}px`,
          fill: 'both', easing: 'linear', ...options,
        });
        if (options.pseudoElement && animation.effect.pseudoElement !== options.pseudoElement) {
          animation.cancel();
          throw new Error('Pseudo-element animation is not supported');
        }
        animations.set(element, animation);
        return true;
      } catch {
        // Older / partial implementations retain the existing rAF renderer.
        failed = true;
        motion.clear();
        return false;
      }
    },
    remove(element) {
      animations.get(element)?.cancel();
      animations.delete(element);
    },
    clear() {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    },
  };
  reduced.addEventListener('change', () => { if (reduced.matches) motion.clear(); });
  return motion;
}

// A collapsing Safari/Chrome toolbar is not a layout breakpoint. ResizeObserver
// still catches actual component size changes; width/orientation refresh ranges.
export function onMotionResize(refresh) {
  let width = innerWidth;
  addEventListener('resize', () => {
    const changed = width !== innerWidth;
    width = innerWidth;
    if (!touch.matches || changed) refresh();
  }, { passive: true });
}

export function sampleMotion(render, steps = 60) {
  return Array.from({ length: steps + 1 }, (_, index) => render(index / steps));
}
