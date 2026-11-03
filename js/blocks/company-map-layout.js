export default function init(section) {
  const stage = section.querySelector('.company-map__stage');
  if (!stage) return;
  section.classList.add('company-map--viewport-fit');

  function measure() {
    // Карте остаётся высота окна за вычетом заголовка, фильтров и отступов.
    const fixedHeight = section.getBoundingClientRect().height - stage.getBoundingClientRect().height;
    const height = `${Math.max(320, Math.floor(innerHeight - fixedHeight))}px`;
    if (section.style.getPropertyValue('--map-viewport-height') !== height)
      section.style.setProperty('--map-viewport-height', height);
  }

  measure();
  addEventListener('resize', measure, { passive: true });
  const observer = new ResizeObserver(measure);
  observer.observe(section);
  observer.observe(document.body);
  document.fonts.ready.then(measure);
}
