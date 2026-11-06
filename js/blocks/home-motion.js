import createScrollReveal from '../lib/scroll-reveal.js';

export default function init(home) {
  if (!('IntersectionObserver' in window)) return;
  const projects = home.querySelector('#objects');
  const team = home.querySelector('#team');
  const clients = home.querySelector('#clients');
  const { add, start } = createScrollReveal('home', { rootMargin: '0px 0px -48px 0px' });

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
}
