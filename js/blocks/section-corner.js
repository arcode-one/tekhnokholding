export default function init(corner) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bottomEdge = corner.dataset.sectionCorner === 'bottom';
  let visible = false;
  let frame = 0;

  function render() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    // Measure the fixed edge so the same progress works above or below a seam.
    const bounds = corner.getBoundingClientRect();
    const seam = bottomEdge ? bounds.bottom : bounds.top;
    const start = innerHeight * .78;
    const end = Math.min(48, innerHeight * .12);
    const progress = Math.max(0, Math.min(1,
      (start - seam) / (start - end),
    ));
    corner.style.setProperty('--section-step-progress', progress.toFixed(4));
  }

  function schedule() {
    if (visible && !frame && !reduced.matches && !document.hidden)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    corner.style.removeProperty('--section-step-progress');
    if (!reduced.matches) render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '100px' }).observe(corner);
  new ResizeObserver(schedule).observe(corner);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', updatePreference);
  document.fonts?.ready.then(schedule);
  updatePreference();
}
