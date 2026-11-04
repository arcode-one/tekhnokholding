import initMissionParallax from './mission-parallax.js';
import createScrollReveal from '../lib/scroll-reveal.js';

export default function init(story) {
  const footer = document.querySelector('[data-mission-footer]');
  const { add, start } = createScrollReveal('mission');
  initMissionParallax(story, footer);

  add(story, '.mission-hero__photo', 'cover');
  add(story, '.mission-hero__title-main', 'heading');
  add(story, '.mission-hero__title-sub', 'heading', 70);
  add(footer, '.site-footer__visual', 'cover');
  add(footer, '.site-footer__nav, .site-footer__right > h2', 'heading');
  add(footer, '.site-footer__contact-group, .site-footer__office', 'text', 60);
  add(footer, '.site-footer__brand, .site-footer__copyright, .site-footer__privacy, .site-footer__bottom', 'text');

  start();
}
