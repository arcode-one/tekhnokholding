import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

export default function init(corner) {
  const motion = createScrollMotion();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bottomEdge = corner.dataset.sectionCorner === 'bottom';
  const touch = corner.closest('.home-page--touch') !== null;
  let visible = false;
  let frame = 0;
  let geometry;

  function render(timestamp) {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const { y, height: viewport } = readMotionViewport(timestamp);
    if (!touch || !geometry) {
      const bounds = corner.getBoundingClientRect();
      geometry = { seam: (bottomEdge ? bounds.bottom : bounds.top) + y, height: bounds.height };
    }
    const seam = geometry.seam - y;
    const start = viewport * .78;
    const end = Math.min(48, viewport * .12);
    if (motion.set(corner, { transform: [
      'translateY(0px)', `translateY(${bottomEdge ? geometry.height : -geometry.height}px)`,
    ] }, geometry.seam - start, geometry.seam - end, {
      pseudoElement: '::before',
      easing: `steps(${Math.max(1, Math.round(geometry.height * (devicePixelRatio || 1)))}, end)`,
    })) return;
    const progress = Math.max(0, Math.min(1,
      (start - seam) / (start - end),
    ));
    if (touch) {
      const ratio = devicePixelRatio || 1;
      const offset = Math.round(progress * geometry.height * ratio) / ratio;
      corner.style.setProperty('--section-step-offset', `${bottomEdge ? offset : -offset}px`);
    } else {
      corner.style.setProperty('--section-step-progress', progress.toFixed(4));
    }
  }

  function schedule() {
    if (!motion.enabled && visible && !frame && !reduced.matches && !document.hidden)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    motion.clear();
    corner.style.removeProperty('--section-step-progress');
    corner.style.removeProperty('--section-step-offset');
    if (!reduced.matches) render();
  }

  function refresh() {
    geometry = undefined;
    if (visible && !frame && !reduced.matches) frame = requestAnimationFrame(render);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '100px' }).observe(corner);
  const sizes = new ResizeObserver(refresh);
  sizes.observe(corner);
  if (touch) sizes.observe(document.body);
  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', updatePreference);
  document.fonts?.ready.then(refresh);
  updatePreference();
}
