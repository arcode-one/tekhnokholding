import createScrollReveal from '../lib/scroll-reveal.js';

export default function init(hero) {
  const { add, start } = createScrollReveal('services', { rootMargin: '0px' });
  hero.closest('.services-page')?.querySelectorAll('.services-screen').forEach((screen) => {
    add(screen, '[data-service-reveal]', 'text', (index) => index * 60, screen);
  });
  start();
  let visible = true;
  const sync = () => {
    hero.toggleAttribute('data-ambient-paused', !visible || document.hidden);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  document.addEventListener('visibilitychange', sync);
  sync();
}
