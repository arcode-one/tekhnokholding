import createScrollReveal from '../lib/scroll-reveal.js';

function initValuesOverlap(section) {
  const card = section?.querySelector('.home-values__card');
  if (!card) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let frame = 0;

  function render() {
    frame = 0;
    // The stationary section keeps the scroll progress independent of the card's offset.
    const { top, height } = section.getBoundingClientRect();
    const center = top + height / 2;
    const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - center) / (innerHeight * 0.4)));
    const travel = Math.max(12, Math.min(innerWidth * 0.0225, 32));
    const offset = Math.sin(progress * Math.PI / 2) * travel;
    card.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
  }

  function schedule() {
    if (visible && !reduced.matches && !frame) frame = requestAnimationFrame(render);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { rootMargin: '64px 0px' }).observe(section);

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduced.matches) card.style.removeProperty('transform');
    else schedule();
  });
}

export default function init(home) {
  if (!('IntersectionObserver' in window)) return;
  const mission = home.querySelector('#mission');
  const values = home.querySelector('#values');
  const projects = home.querySelector('#objects');
  const team = home.querySelector('#team');
  const clients = home.querySelector('#clients');
  const { add, start } = createScrollReveal('home', { rootMargin: '0px 0px -48px 0px' });

  add(mission, '#home-mission-title', 'heading');
  add(mission, '.home-mission__thumbnail', 'photo', 80);
  add(mission, '.home-mission__statement p', 'heading', (index) => 80 + index * 80);
  add(mission, '#home-mission-talents-title', 'heading');
  add(mission, '.home-mission__talent', 'text', (index) => 80 + index * 80);

  add(values, '#home-values-title', 'heading');
  add(values, '.home-values__media', 'photo', 55);
  add(values, '.home-values__list li', 'text', (index) => 55 + index * 40);

  add(projects, '#projects-title', 'heading');
  add(projects, '.projects-filters', 'text', 55);
  // Reveal the rail as a unit so switching filters and rebuilding loop copies stay instant.
  add(projects, '.projects-rail', 'rail', 110);

  add(team, '#company-team-title', 'heading');
  add(team, '.company-team__feature', 'photo', (index) => 55 + index * 55);
  add(team, '.department-card', 'text', (index) => 55 + (index % 2) * 55);

  add(clients, '#recommendations-title', 'heading');
  add(clients, '.company-recommendations__slider', 'rail', 55);

  start();
  initValuesOverlap(values);
}
