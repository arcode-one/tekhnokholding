import { onMotionResize } from '../lib/scroll-motion.js';

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
  let distance = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function render() {
    frame = 0;
    if (!desktop.matches || reduced.matches) {
      image.style.transform = '';
      return;
    }
    // Earlier sections can change height after an anchor jump. Read the current
    // position, and never move the photo beyond the visible bottom of the footer.
    const bounds = footer.getBoundingClientRect();
    const progress = clamp((innerHeight - bounds.top) / innerHeight);
    const offset = Math.min(
      Math.round((1 - progress) * distance),
      Math.max(0, bounds.bottom - innerHeight),
    );
    image.style.transform = `translateY(${-offset}px)`;
  }
  function measure() {
    distance = image.offsetHeight * 0.5;
    render();
  }
  function schedule() {
    if (visible && desktop.matches && !reduced.matches && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) measure();
    },
    { rootMargin: '100px' },
  ).observe(footer);
  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(measure);
  reduced.addEventListener('change', measure);
  desktop.addEventListener('change', measure);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(footer);
  resizeObserver.observe(document.body);
  document.fonts?.ready.then(measure);
}
