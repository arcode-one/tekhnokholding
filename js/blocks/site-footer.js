export default function init(footer) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const image = footer.querySelector('.site-footer__visual img');
  const layout = footer.querySelector('.site-footer__layout');
  if (!image || !layout) return;
  const desktop = matchMedia('(min-width:768px)');
  let visible = false;
  let frame = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function render() {
    frame = 0;
    if (!desktop.matches || reduced.matches) {
      image.style.transform = '';
      layout.style.top = '';
      return;
    }
    const rect = footer.getBoundingClientRect();
    const progress = clamp((innerHeight - rect.top) / innerHeight);
    const imageHeight = image.offsetHeight;
    const distance = imageHeight * 0.5;
    const offset = Math.round((1 - progress) * distance);
    // Прежняя сцена -50% и вложенный контент +25% давали разные скорости
    // фото и контактов. Воспроизводим их итоговые позиции без transform текста.
    // Целые пиксели и relative top сохраняют обычную отрисовку шрифта.
    const contentOffset = Math.round(
      (1 - progress) * (layout.offsetHeight * 0.25 - imageHeight * 0.5),
    );
    image.style.transform = `translateY(${-offset}px)`;
    layout.style.top = `${contentOffset}px`;
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
