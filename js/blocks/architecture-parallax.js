import setFiguresPhotoParallax, { setFiguresPhotoTimeline } from '../lib/figures-photo-parallax.js';
import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

export default function init(container) {
  const image = container.querySelector('img');
  if (!image) return;

  const photoFrame = container.querySelector('[data-parallax-frame]');
  const target = photoFrame ?? image;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const motion = createScrollMotion();
  const figuresMotion = container.dataset.architectureParallax === 'figures';
  const strength = Number(container.dataset.parallaxStrength ?? 0.35);
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
    if (figuresMotion) {
      if (motion.enabled && setFiguresPhotoTimeline(motion, image, top, height, viewport, strength)) return;
      setFiguresPhotoParallax(image, top - y, height, viewport, strength);
      return;
    }

    const travel = narrow.matches ? Math.min(desktopTravel, 36) : desktopTravel;
    const from = photoFrame ? -travel : travel;
    if (motion.enabled && motion.set(target, { transform: [
      `translate3d(0, ${from}px, 0)`, `translate3d(0, ${-from}px, 0)`,
    ] }, top - viewport, top + height)) return;

    const progress = Math.max(-1, Math.min(1,
      (top - y + height / 2 - viewport / 2) / ((viewport + height) / 2),
    ));
    target.style.transform = `translate3d(0, ${(progress * from).toFixed(2)}px, 0)`;
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
    target.style.removeProperty('transform');
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
