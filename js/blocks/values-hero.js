export default function init(hero) {
  const image = hero.querySelector('.values-hero__image');
  if (!image) return;
  const title = hero.querySelector('.values-hero__title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let top = 0;
  let height = 0;
  let previous = 0;
  let frame = 0;

  const scrollDistance = () => Math.max(0, Math.min(scrollY - top, height));

  function clearTransforms() {
    image.style.removeProperty('transform');
    title.style.removeProperty('transform');
  }

  function render() {
    frame = 0;
    const distance = scrollDistance();
    if (distance === previous) return;
    previous = distance;
    if (distance === 0) {
      clearTransforms();
      return;
    }

    const scale = 1 + 0.07 * distance / height;
    image.style.transform = `translate3d(0, ${distance * 0.5}px, 0) scale(${scale})`;
    title.style.transform = `translate3d(0, ${distance * 0.2}px, 0)`;
  }

  function schedule() {
    if (!frame && !reduced.matches && scrollDistance() !== previous) {
      frame = requestAnimationFrame(render);
    }
  }

  function measure() {
    const rect = hero.getBoundingClientRect();
    top = rect.top + scrollY;
    height = rect.height;
    previous = -1;
    schedule();
  }

  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduced.matches) clearTransforms();
    else measure();
  });
  new ResizeObserver(measure).observe(hero);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('pageshow', measure);
  measure();
}
