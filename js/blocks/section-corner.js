export default function init(corner) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bottomEdge = corner.dataset.sectionCorner === 'bottom';
  const touch = corner.closest('.home-page--touch') !== null;
  let visible = false;
  let frame = 0;
  let geometry;

  function render() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const y = scrollY;
    if (!touch || !geometry) {
      const bounds = corner.getBoundingClientRect();
      geometry = { seam: (bottomEdge ? bounds.bottom : bounds.top) + y, height: bounds.height };
    }
    const seam = geometry.seam - y;
    const start = innerHeight * .78;
    const end = Math.min(48, innerHeight * .12);
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
    if (visible && !frame && !reduced.matches && !document.hidden)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    corner.style.removeProperty('--section-step-progress');
    corner.style.removeProperty('--section-step-offset');
    if (!reduced.matches) render();
  }

  function refresh() {
    geometry = undefined;
    schedule();
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
  addEventListener('resize', refresh, { passive: true });
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', updatePreference);
  document.fonts?.ready.then(refresh);
  updatePreference();
}
