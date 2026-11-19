import createScrollReveal from '../lib/scroll-reveal.js?v=20261118-2';
import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

function initValuesOverlap(section) {
  const card = section?.querySelector('.home-values__card');
  const photo = card?.querySelector('.home-values__media');
  if (!photo) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 768px)');
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
    const travel = Math.min(innerWidth * 0.0225, 22);
    const easedProgress = Math.sin(progress * Math.PI / 2);
    const offset = easedProgress * travel;
    // Cancel the parent's travel, then move the photo frame the other way.
    const photoOffset = -offset - offset * 0.65;
    card.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    photo.style.transform = `translate3d(0, ${photoOffset.toFixed(2)}px, 0)`;
    photo.style.setProperty('--values-photo-side', (-easedProgress).toFixed(4));
  }

  function schedule() {
    if (visible && !narrow.matches && !reduced.matches && !frame) frame = requestAnimationFrame(render);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    frame = 0;
    geometry = undefined;
    if (narrow.matches || reduced.matches) {
      card.style.removeProperty('transform');
      photo.style.removeProperty('transform');
      photo.style.removeProperty('--values-photo-side');
    } else render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) refresh();
  }, { rootMargin: '64px 0px' }).observe(section);

  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  new ResizeObserver(refresh).observe(section);
  addEventListener('pageshow', refresh);
  narrow.addEventListener('change', refresh);
  reduced.addEventListener('change', refresh);
}

function initBrandStrip(strip) {
  if (!strip) return;
  const track = strip.querySelector('.home-brand-strip__track');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(hover: none) and (pointer: coarse)');
  let viewportHeight = innerHeight;
  const motion = createScrollMotion();
  let visible = false;
  let frame = 0;
  let geometry;

  function render(timestamp) {
    frame = 0;
    const { y, height: liveViewport } = readMotionViewport(timestamp);
    // Mobile browser chrome changes innerHeight during a gesture. Keep the
    // scroll range stable until a genuine width/orientation change.
    const viewport = touch.matches ? viewportHeight : liveViewport;
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
  onMotionResize(() => {
    viewportHeight = innerHeight;
    refresh();
  });
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (reduced.matches) track.style.removeProperty('transform');
    else refresh();
  });
}

function typeMissionStatement(element) {
  if (!('highlights' in CSS) || typeof Highlight === 'undefined') return;

  // Mask the unread suffix in place so bold text, wrapping and selection stay native.
  const letters = [];
  for (const paragraph of element.querySelectorAll('p')) {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (const match of node.data.matchAll(/\S/gu))
        letters.push({ node, start: match.index, end: match.index + match[0].length, delay: 24 });
    }
    if (letters.length) letters[letters.length - 1].delay = 160;
  }
  if (!letters.length) return;

  const unread = document.createRange();
  unread.selectNodeContents(element);
  CSS.highlights.set('mission-unread', new Highlight(unread));
  const current = document.createRange();
  CSS.highlights.set('mission-current', new Highlight(current));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let nextLetterAt = performance.now();

  function advance(now) {
    if (index === letters.length || document.hidden || reduced.matches) {
      CSS.highlights.delete('mission-unread');
      CSS.highlights.delete('mission-current');
      return;
    }
    if (now >= nextLetterAt) {
      const { node, start, end, delay } = letters[index++];
      unread.setStart(node, end);
      current.setStart(node, start);
      current.setEnd(node, end);
      // Keep the cadence steady, but never reveal a batch after a slow frame.
      nextLetterAt = Math.max(nextLetterAt + delay, now);
    }
    requestAnimationFrame(advance);
  }
  requestAnimationFrame(advance);
}

export default function init(home) {
  if (!('IntersectionObserver' in window)) return;
  const mission = home.querySelector('#mission');
  const values = home.querySelector('#values');
  const figures = home.querySelector('#figures');
  const map = home.querySelector('#map-objects');
  const projects = home.querySelector('#objects');
  const advantages = home.querySelector('#advantages');
  const team = home.querySelector('#team');
  const clients = home.querySelector('#clients');
  const { add, start } = createScrollReveal('home', { rootMargin: '0px 0px -48px 0px' });

  if (mission) {
    const missionReveal = createScrollReveal('home', {
      rootMargin: '0px 0px -96px 0px',
      beforeEnter(element) {
        if (element.dataset.homeEnter === 'mission-statement') typeMissionStatement(element);
      },
    });
    missionReveal.add(mission, '#home-mission-title', 'mission-title');
    missionReveal.add(mission, '.home-mission__photo', 'photo', 70);
    missionReveal.add(mission, '.home-mission__statement', 'mission-statement');
    missionReveal.add(mission, '#home-mission-talents-title', 'mission-title');
    missionReveal.add(mission, '.home-mission__talent', 'talent', (index) => 65 + index * 75);
    missionReveal.start();
  }

  add(values, '#home-values-title', 'heading');
  add(values, '.home-values__intro, .home-values__link', 'text', (index) => 55 + index * 65);

  // Prepare photos one viewport ahead; reveal only once they enter the screen.
  // Keep this separate from text, whose reveal threshold remains unchanged.
  if (figures) {
    const readyImages = new WeakSet();
    const photoReveal = createScrollReveal('home', {
      rootMargin: '0px 0px -48px 0px', readyImages,
    });
    photoReveal.add(figures, '.company-figures__photo-inner', 'photo');
    const preparePhotos = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        preparePhotos.unobserve(entry.target);
        const image = entry.target.querySelector('img');
        image.loading = 'eager';
        image.decode().then(() => readyImages.add(image)).catch(() => {});
      }
    }, { rootMargin: `${Math.max(innerHeight, 600)}px 0px` });
    figures.querySelectorAll('.company-figures__photo-inner').forEach((photo) => preparePhotos.observe(photo));
    photoReveal.start();
  }

  add(projects, '#projects-title, .projects-filters, .projects-rail', 'fade');
  add(advantages, '.company-advantages__intro, .advantage-card, .advantages-rating', 'fade');

  // Keep the team visible if a reload or a direct link already brought it into view.
  const teamBounds = team?.getBoundingClientRect();
  if (teamBounds && (teamBounds.top >= innerHeight || teamBounds.bottom <= 0)) {
    add(team, '#company-team-title, .company-team__feature, .company-team__people', 'fade');
  }

  add(clients, '#recommendations-title, .company-recommendations__slider', 'fade');

  start();
  if (map) {
    const mapReveal = createScrollReveal('home', { rootMargin: '0px', threshold: 0.3 });
    mapReveal.add(map, '.company-map__stage', 'map');
    mapReveal.start();
  }
  initValuesOverlap(values);
  initBrandStrip(home.querySelector('.home-brand-strip'));
}
