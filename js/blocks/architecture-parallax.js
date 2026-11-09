import setFiguresPhotoParallax from '../lib/figures-photo-parallax.js';

export default function init(container) {
  const image = container.querySelector('img');
  if (!image) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const figuresMotion = container.dataset.architectureParallax === 'figures';
  const cacheFrame = !figuresMotion && container.closest('.home-page--touch') !== null;
  const desktopTravel = Number(container.dataset.parallaxTravel) || 78;
  let visible = false;
  let frame = 0;
  let geometry;

  function render() {
    frame = 0;
    if (reduced.matches || document.hidden) return;

    const y = scrollY;
    if (!cacheFrame || !geometry) {
      const { top, height } = container.getBoundingClientRect();
      geometry = { top: top + y, height };
    }
    const { top, height } = geometry;
    if (figuresMotion) {
      setFiguresPhotoParallax(image, top - y, height, innerHeight, 0.35);
      return;
    }

    const progress = Math.max(-1, Math.min(1,
      (top - y + height / 2 - innerHeight / 2) / ((innerHeight + height) / 2),
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
    geometry = undefined;
    container.toggleAttribute('data-parallax-active', !reduced.matches);
    image.style.removeProperty('transform');
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
  }, { rootMargin: '100px' }).observe(container);
  const sizes = new ResizeObserver(refresh);
  sizes.observe(container);
  if (cacheFrame) sizes.observe(document.body);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', refresh, { passive: true });
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  image.addEventListener('load', schedule);
  reduced.addEventListener('change', updatePreference);
  narrow.addEventListener('change', schedule);
  document.fonts?.ready.then(refresh);
  updatePreference();
}
