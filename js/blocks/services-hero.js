import createScrollReveal from '../lib/scroll-reveal.js';

export default function init(hero) {
  const page = hero.closest('.services-page');
  if (!page) return;
  const { add, start } = createScrollReveal('services', { rootMargin: '0px' });
  page.querySelectorAll('.services-screen').forEach((screen) => {
    add(screen, '[data-service-reveal]', 'text', (index) => index * 60, screen);
  });
  start();
  const photos = page.querySelectorAll('.services-hero__ambient');
  const visible = new Set();
  const sync = () => {
    for (const photo of photos) {
      photo.toggleAttribute('data-ambient-paused', document.hidden || !visible.has(photo.parentElement));
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    sync();
  });
  for (const photo of photos) observer.observe(photo.parentElement);
  document.addEventListener('visibilitychange', sync);
  sync();
}
