export default function init(corner) {
  const section = corner.closest('section');
  if (!section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let frame = 0;

  function render() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    // Same travel as the figures/projects corner, measured from the fixed section.
    const progress = Math.max(0, Math.min(1,
      (innerHeight - section.getBoundingClientRect().top) / innerHeight,
    ));
    corner.style.transform = `translate3d(0, ${(-corner.offsetHeight * progress).toFixed(2)}px, 0)`;
  }

  function schedule() {
    if (visible && !frame && !reduced.matches && !document.hidden)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    corner.style.removeProperty('transform');
    if (!reduced.matches) render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '100px' }).observe(section);
  new ResizeObserver(schedule).observe(corner);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', updatePreference);
  document.fonts?.ready.then(schedule);
  updatePreference();
}
