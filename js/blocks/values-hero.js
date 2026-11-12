export default function init(hero) {
  const image = hero.querySelector('.values-hero__image, .services-comparison__cover');
  if (!image) return;
  const title = hero.querySelector('.values-hero__title, :scope > h2');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none) and (pointer: coarse)');
  const stableTouchHero = hero.matches('.services-hero, .services-comparison__hero, [aria-labelledby="values-title"]');
  // Native touch scrolling is asynchronous; keep these covers stable on phones.
  const motionDisabled = () => reduced.matches || (stableTouchHero && touch.matches);
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
    if (!frame && !motionDisabled() && scrollDistance() !== previous) {
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

  function updateMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (motionDisabled()) clearTransforms();
    else measure();
  }
  reduced.addEventListener('change', updateMotion);
  touch.addEventListener('change', updateMotion);
  new ResizeObserver(measure).observe(hero);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('pageshow', measure);
  measure();
}
