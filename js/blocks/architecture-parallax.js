export default function init(container) {
  const image = container.querySelector('img');
  if (!image) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const desktopTravel = Number(container.dataset.parallaxTravel) || 78;
  let visible = false;
  let frame = 0;

  function render() {
    frame = 0;
    if (reduced.matches || document.hidden) return;

    // Measure the stationary frame, never the translated image.
    const rect = container.getBoundingClientRect();
    const progress = Math.max(-1, Math.min(1,
      (rect.top + rect.height / 2 - innerHeight / 2) / ((innerHeight + rect.height) / 2),
    ));
    // Each frame provides enough CSS overscan for its configured travel.
    const travel = narrow.matches ? Math.min(desktopTravel, 36) : desktopTravel;
    image.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0)`;
  }

  function schedule() {
    if (visible && !reduced.matches && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }

  function updatePreference() {
    cancelAnimationFrame(frame);
    frame = 0;
    container.toggleAttribute('data-parallax-active', !reduced.matches);
    image.style.removeProperty('transform');
    if (!reduced.matches) render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { rootMargin: '100px' }).observe(container);
  new ResizeObserver(schedule).observe(container);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  image.addEventListener('load', schedule);
  reduced.addEventListener('change', updatePreference);
  narrow.addEventListener('change', schedule);
  document.fonts?.ready.then(schedule);
  updatePreference();
}
