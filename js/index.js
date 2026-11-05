import { mount, loadBlocks } from './lib/blocks.js';
import navigation from './blocks/site-navigation.js';
import textRoll from './blocks/text-roll.js';

const enhancements = [];
const enhance = (...args) => enhancements.push(loadBlocks(...args));
mount(document.documentElement, 'navigation', navigation);
mount(document.documentElement, 'text-roll', textRoll);
enhance('html', 'wheel-scroll', () => import('./blocks/wheel-scroll.js'));
enhance('html', 'scrollbar', () => import('./blocks/site-scrollbar.js'));
enhance('[data-ui~="roof-background"]', 'roof', () => import('./blocks/roof-background.js'));
enhance('[data-ui~="company-figures"]', 'figures', () => import('./blocks/company-figures.js'));
enhance('[data-projects]', 'projects', () => import('./blocks/projects-section.js'));
enhance('[data-company-map]', 'map', () => import('./blocks/company-map.js'));
enhance('[data-company-carousel]', 'carousel', () => import('./blocks/company-carousel.js'));
enhance('[data-company-lightbox]', 'lightbox', () => import('./blocks/company-lightbox.js'));
enhance('[data-company-reveal]', 'reveal', () => import('./blocks/company-reveal.js'));
enhance('[data-story-photo]', 'story-photo', () => import('./blocks/story-photo.js'));
enhance('[data-architecture-parallax]', 'architecture-parallax', () => import('./blocks/architecture-parallax.js'));

enhance('[data-section-corner]', 'section-corner', () => import('./blocks/section-corner.js'));
enhance('[data-services-accordion]', 'services-accordion', () => import('./blocks/services-accordion.js'));
enhance('.services-hero', 'services-hero', () => import('./blocks/services-hero.js'));
enhance('[data-footer-motion]', 'footer', () => import('./blocks/site-footer.js'));
enhance('[data-ui~="mission-story"]', 'mission', () => import('./blocks/mission.js'));

enhance('[data-ui~="quality-page"]', 'quality', () => import('./blocks/quality.js'));
enhance('[data-privacy-toc]', 'privacy-toc', () => import('./blocks/privacy-toc.js'));
enhance(
  '[data-ui~="object-page--motion"]',
  'object-motion',
  () => import('./blocks/object-cinema.js'),
);

// Optional media has a predictable fallback; broken photos do not collapse their frames.
function fallbackImage(image) {
  if (!(image instanceof HTMLImageElement) || image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = 'true';
  image.removeAttribute('srcset');
  image.src = new URL('../icons/image-placeholder.svg', import.meta.url).href;
}
document.addEventListener('error', (event) => fallbackImage(event.target), true);
for (const image of document.images)
  if (image.complete && !image.naturalWidth) fallbackImage(image);

Promise.allSettled(enhancements).then(() =>
  requestAnimationFrame(() => {
    document.documentElement.dataset.blocksReady = 'true';
  }),
);
