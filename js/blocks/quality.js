import createScrollReveal from '../lib/scroll-reveal.js';
import initPhotoParallax from '../lib/photo-parallax.js';

export default function init(page) {
  const footer = document.querySelector('[data-quality-footer]');
  const { add, start } = createScrollReveal('quality');
  // CSS sticky owns the left column. The page keeps its normal scroll.
  initPhotoParallax(
    [...page.querySelectorAll('.quality-hero__media picture, .quality-story__frame')],
    [page],
    'quality-parallax',
    (element) => ({ travel: element.matches('picture') ? [0.14, 0.14] : [0.28, 0.28] }),
  );
  add(page, '.quality-hero__media', 'cover');
  add(page, '.quality-hero h1', 'heading');
  add(page, '.quality-hero__lead', 'text', 70);
  add(page, '.quality-story__intro > *', 'text');
  add(page, '.quality-story__step-head, .quality-story__text', 'text');
  add(page, '.quality-story__photo', 'photo');
  add(footer, '.site-footer__nav, .site-footer__right > h2', 'heading');
  add(footer, '.site-footer__contact-group, .site-footer__office', 'text');
  start();
}
