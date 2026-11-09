import setFiguresPhotoParallax from '../lib/figures-photo-parallax.js';
import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

export default function init(container) {
  const image = container.querySelector('img');
  if (!image) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const motion = createScrollMotion();
  const figuresMotion = container.dataset.architectureParallax === 'figures';
  const cacheFrame = container.closest('.home-page--touch') !== null;
  const desktopTravel = Number(container.dataset.parallaxTravel) || 78;
  let visible = false;
  let frame = 0;
  let geometry;

  function render(timestamp) {
    frame = 0;
    if (reduced.matches || document.hidden) return;

    const { y, height: viewport } = readMotionViewport(timestamp);
    if (!cacheFrame || !geometry) {
      const { top, height } = container.getBoundingClientRect();
      geometry = { top: top + y, height };
    }
    const { top, height } = geometry;
    if (motion.enabled) {
      const travel = figuresMotion ? height * .16 * .35 : narrow.matches ? Math.min(desktopTravel, 36) : desktopTravel;
      const scale = figuresMotion ? ' scale(1.119)' : '';
      const from = figuresMotion ? -travel : travel;
      if (motion.set(image, { transform: [`translate3d(0,${from}px,0)${scale}`, `translate3d(0,${-from}px,0)${scale}`] }, top - viewport, top + height)) return;
    }
    if (figuresMotion) {
      setFiguresPhotoParallax(image, top - y, height, viewport, 0.35);
      return;
    }

    const progress = Math.max(-1, Math.min(1,
      (top - y + height / 2 - viewport / 2) / ((viewport + height) / 2),
    ));
    // Each frame provides enough CSS overscan for its configured travel.
    const travel = narrow.matches ? Math.min(desktopTravel, 36) : desktopTravel;
    image.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0)`;
  }

  function schedule() {
    if (!motion.enabled && visible && !reduced.matches && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    motion.clear();
    geometry = undefined;
    container.toggleAttribute('data-parallax-active', !reduced.matches);
    image.style.removeProperty('transform');
    if (!reduced.matches) render();
  }

  function refresh() {
    geometry = undefined;
    if (visible && !reduced.matches && !frame) frame = requestAnimationFrame(render);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '100px' }).observe(container);
  const sizes = new ResizeObserver(refresh);
  sizes.observe(container);
  if (cacheFrame || motion.enabled) sizes.observe(document.body);
  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  image.addEventListener('load', refresh);
  reduced.addEventListener('change', updatePreference);
  narrow.addEventListener('change', refresh);
  document.fonts?.ready.then(refresh);
  updatePreference();
}
