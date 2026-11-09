import { onMotionResize } from '../lib/scroll-motion.js';

export default function init(section) {
  const stage = section.querySelector('.company-map__stage');
  if (!stage) return;
  section.classList.add('company-map--viewport-fit');
  let frame = 0;

  function measure() {
    frame = 0;
    // Карте остаётся высота окна за вычетом заголовка и отступов.
    const fixedHeight = section.getBoundingClientRect().height - stage.getBoundingClientRect().height;
    const height = `${Math.max(320, Math.floor(innerHeight - fixedHeight))}px`;
    if (section.style.getPropertyValue('--map-viewport-height') !== height)
      section.style.setProperty('--map-viewport-height', height);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure);
  }

  measure();
  onMotionResize(schedule);
  const observer = new ResizeObserver(schedule);
  observer.observe(section);
  observer.observe(document.body);
  document.fonts.ready.then(schedule);
}
