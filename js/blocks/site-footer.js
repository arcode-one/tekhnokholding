export default function init(footer) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const image = footer.querySelector('.site-footer__visual img');
  const layout = footer.querySelector('.site-footer__layout');
  if (!image || !layout) return;
  // Contacts scroll with the document. Only the photograph has parallax.
  layout.style.removeProperty('top');
  const desktop = matchMedia('(min-width:768px)');
  let visible = false;
  let frame = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function render() {
    frame = 0;
    if (!desktop.matches || reduced.matches) {
      image.style.transform = '';
      return;
    }
    const rect = footer.getBoundingClientRect();
    const progress = clamp((innerHeight - rect.top) / innerHeight);
    const imageHeight = image.offsetHeight;
    const distance = imageHeight * 0.5;
    const offset = Math.round((1 - progress) * distance);
    image.style.transform = `translateY(${-offset}px)`;
  }
  function schedule() {
    if (visible && !frame) frame = requestAnimationFrame(render);
  }
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) render();
    },
    { rootMargin: '100px' },
  ).observe(footer);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', render, { passive: true });
  reduced.addEventListener('change', render);
  desktop.addEventListener('change', render);
}
