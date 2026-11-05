import initMissionParallax from './mission-parallax.js';
import createScrollReveal from '../lib/scroll-reveal.js';
import initMissionValues from './mission-values.js';

export default function init(story) {
  const footer = document.querySelector('[data-mission-footer]');
  const { add, start } = createScrollReveal('mission', { rootMargin: '0px' });
  initMissionParallax(story, footer);
  initMissionValues(story);

  add(story, '#mission-title', 'heading');
  add(story, '.mission-statement__copy', 'text', 80);
  add(story, '.mission-project__photo', 'cover', 100);
  add(story, '#talents-title, #values-title', 'text', 140);
  add(story, '.mission-talents__item', 'text', (index) => 140 + index * 60);
  // Start the entire list when its section enters, including the last row at the viewport edge.
  add(story, 'button.mission-value', 'text', (index) => 140 + index * 45, story.querySelector('.mission-values'));
  add(footer, '.site-footer__visual', 'cover');
  add(footer, '.site-footer__nav, .site-footer__right > h2', 'heading');
  add(footer, '.site-footer__contact-group, .site-footer__office', 'text', 60);
  add(footer, '.site-footer__brand, .site-footer__copyright, .site-footer__privacy, .site-footer__bottom', 'text');

  start();
}
