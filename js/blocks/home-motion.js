import createScrollReveal from '../lib/scroll-reveal.js';
import initMissionLineReveal from './mission-line-reveal.js';
import { createScrollMotion, onMotionResize, readMotionViewport, sampleMotion } from '../lib/scroll-motion.js';

function initValuesOverlap(section) {
  const card = section?.querySelector('.home-values__card');
  const photo = card?.querySelector('.home-values__media');
  if (!photo) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const motion = createScrollMotion();
  let geometry;
  let visible = false;
  let frame = 0;

  function render(timestamp) {
    frame = 0;
    const { y, height: viewport } = readMotionViewport(timestamp);
    // The stationary section keeps the scroll progress independent of the card's offset.
    if (!geometry) {
      const { top, height } = section.getBoundingClientRect();
      geometry = { top: top + y, height };
    }
    const { height } = geometry;
    const top = geometry.top - y;
    const center = top + height / 2;
    const progress = Math.max(-1, Math.min(1, (viewport / 2 - center) / (viewport * 0.4)));
    const travel = narrow.matches ? 6 : Math.min(innerWidth * 0.0225, 22);
    const easedProgress = Math.sin(progress * Math.PI / 2);
    const offset = easedProgress * travel;
    if (motion.enabled && narrow.matches) {
      const start = geometry.top + height / 2 - viewport * .9;
      const end = start + viewport * .8;
      motion.set(card, sampleMotion((p) => ({ transform: `translate3d(0,${-Math.cos(p * Math.PI) * travel}px,0)` })), start, end);
      motion.set(photo, sampleMotion((p) => ({ transform: `translate3d(0,${Math.cos(p * Math.PI) * travel * 1.65}px,0)` })), start, end);
      return;
    }
    // Cancel the parent's travel, then move the photo frame the other way.
    const photoOffset = -offset - offset * 0.65;
    card.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    photo.style.transform = `translate3d(0, ${photoOffset.toFixed(2)}px, 0)`;
    if (!narrow.matches) photo.style.setProperty('--values-photo-side', (-easedProgress).toFixed(4));
  }

  function schedule() {
    if (!(motion.enabled && narrow.matches) && visible && !reduced.matches && !frame) frame = requestAnimationFrame(render);
  }

  function refresh() {
    geometry = undefined;
    motion.clear();
    if (!reduced.matches) render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
  }, { rootMargin: '64px 0px' }).observe(section);

  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  new ResizeObserver(refresh).observe(section);
  addEventListener('pageshow', refresh);
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduced.matches) {
      card.style.removeProperty('transform');
      photo.style.removeProperty('transform');
      photo.style.removeProperty('--values-photo-side');
    } else refresh();
  });
}

function initBrandStrip(strip) {
  if (!strip) return;
  const track = strip.querySelector('.home-brand-strip__track');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = createScrollMotion();
  let visible = false;
  let frame = 0;
  let geometry;

  function render(timestamp) {
    frame = 0;
    const { y, height: viewport } = readMotionViewport(timestamp);
    if (!geometry) {
      const { top, height, width } = strip.getBoundingClientRect();
      const travel = Math.max(0, Math.min(width * 0.65, track.offsetWidth - width));
      geometry = { top: top + y, height, travel };
    }
    const { top, height, travel } = geometry;
    if (motion.set(track, { transform: ['translate3d(0,0,0)', `translate3d(${-travel}px,0,0)`] }, top - viewport, top + height)) return;
    const progress = Math.max(0, Math.min(1, (viewport - top + y) / (viewport + height)));
    track.style.transform = `translate3d(${(-progress * travel).toFixed(2)}px, 0, 0)`;
  }

  function schedule() {
    if (!motion.enabled && visible && !reduced.matches && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }

  function refresh() {
    geometry = undefined;
    if (visible && !reduced.matches && !frame) frame = requestAnimationFrame(render);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
  }).observe(strip);

  const sizes = new ResizeObserver(refresh);
  sizes.observe(strip);
  sizes.observe(track);
  sizes.observe(document.body);
  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduced.matches) track.style.removeProperty('transform');
    else refresh();
  });
}

export default function init(home) {
  if (!('IntersectionObserver' in window)) return;
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const mission = home.querySelector('#mission');
  const values = home.querySelector('#values');
  const figures = home.querySelector('#figures');
  const map = home.querySelector('#map-objects');
  const projects = home.querySelector('#objects');
  const team = home.querySelector('#team');
  const clients = home.querySelector('#clients');
  const { add, start } = createScrollReveal('home', { rootMargin: '0px 0px -48px 0px' });

  add(mission, '#home-mission-title', 'heading');
  add(mission, '.home-mission__thumbnail', 'photo', 80);
  if (touch) add(mission, '.home-mission__statement p', 'text', (index) => index * 65);
  add(mission, '#home-mission-talents-title', 'heading');
  add(mission, '.home-mission__talent', 'talent', (index) => 80 + index * 80);

  add(values, '#home-values-title', 'heading');
  add(values, '.home-values__media', 'photo', 55);
  add(values, '.home-values__intro, .home-values__link', 'text', (index) => 55 + index * 65);

  add(figures, '.company-figures__photo-inner', 'photo');

  add(projects, '#projects-title', 'heading');
  add(projects, '.projects-filters', 'text', 55);
  // Reveal the rail as a unit so switching filters and rebuilding loop copies stay instant.
  add(projects, '.projects-rail', 'rail', 110);

  add(team, '#company-team-title', 'heading');
  add(team, '.company-team__feature', 'photo', (index) => 55 + index * 55);
  add(team, '.company-team__department-list', 'rail', 110);

  add(clients, '#recommendations-title', 'heading');
  add(clients, '.company-recommendations__slider', 'rail', 55);

  start();
  if (map) {
    const mapReveal = createScrollReveal('home', { rootMargin: '0px', threshold: 0.3 });
    mapReveal.add(map, '.company-map__stage', 'map');
    mapReveal.start();
  }
  if (!touch) initMissionLineReveal(mission);
  initValuesOverlap(values);
  initBrandStrip(home.querySelector('.home-brand-strip'));
}
