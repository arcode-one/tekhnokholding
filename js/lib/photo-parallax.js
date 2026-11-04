export default function initPhotoParallax(frames, scopes, className, settings = () => ({})) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 767px)');
  const photos = frames.map((element) => ({
    element, image: element.querySelector('img'), top: 0, height: 0,
    travel: [0.56, 0.44], ...settings(element),
  }));
  const byElement = new Map(photos.map((photo) => [photo.element, photo]));
  const visible = new Set();
  let frame = 0;
  let needsMeasure = true;
  let viewport = innerHeight;

  function paint(photo, position) {
    const progress = Math.max(0, Math.min(1, photo.anchorTop
      ? (position - photo.top) / photo.height
      : (viewport + position - photo.top) / (viewport + photo.height)));
    const travel = photo.travel[compact.matches ? 1 : 0];
    const offset = photo.anchorTop ? -progress : progress - 0.5;
    // Individual translate composes with the once-only entrance scale on transform.
    photo.image.style.translate = `0 ${(offset * photo.height * travel).toFixed(2)}px`;
  }

  function update() {
    frame = 0;
    if (reduced.matches || document.hidden) return;
    const position = scrollY;
    if (needsMeasure) {
      viewport = innerHeight;
      // Read geometry together, before any image style writes.
      for (const photo of photos) {
        const rect = photo.element.getBoundingClientRect();
        photo.top = rect.top + position;
        photo.height = rect.height;
      }
      needsMeasure = false;
    }
    visible.forEach((photo) => paint(photo, position));
  }

  function schedule() {
    if (!frame && !reduced.matches && !document.hidden && (visible.size || needsMeasure))
      frame = requestAnimationFrame(update);
  }

  function refresh() {
    needsMeasure = true;
    schedule();
  }

  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const photo = byElement.get(target);
      target.classList.toggle(`${className}--visible`, isIntersecting);
      if (isIntersecting) visible.add(photo);
      else visible.delete(photo);
    }
    schedule();
  }, { rootMargin: '100px 0px' });
  const sizes = new ResizeObserver(refresh);

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    observer.disconnect();
    sizes.disconnect();
    visible.clear();
    removeEventListener('scroll', schedule);
    for (const photo of photos) {
      photo.element.classList.toggle(className, !reduced.matches);
      photo.element.classList.remove(`${className}--visible`);
      photo.image.style.removeProperty('translate');
      if (!reduced.matches) {
        observer.observe(photo.element);
        sizes.observe(photo.element);
      }
    }
    if (!reduced.matches) {
      scopes.filter(Boolean).forEach((scope) => sizes.observe(scope));
      addEventListener('scroll', schedule, { passive: true });
      refresh();
    }
  }

  reduced.addEventListener('change', syncMotion);
  addEventListener('resize', refresh, { passive: true });
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  document.fonts.ready.then(refresh);
  syncMotion();
}
