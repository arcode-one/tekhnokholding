import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

// All story images share one observer and one fallback frame per scroll.
const motion = createScrollMotion();
const photos = new Map();
const visible = new Set();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const touchHome = document.body.classList.contains('home-page--touch');
let frame = 0;
let geometryDirty = true;
let viewportHeight = innerHeight;

function render(timestamp) {
  frame = 0;
  if (reduced.matches || document.hidden) return;
  // Read stationary frames together before writing image transforms.
  const { y, height } = readMotionViewport(timestamp);
  const viewport = touchHome ? viewportHeight : height;
  const positions = [...visible].map((outer) => {
    const photo = photos.get(outer);
    if (!touchHome || geometryDirty || !photo.rect) {
      const { top, width, height } = outer.getBoundingClientRect();
      photo.rect = { top: top + y, width, height };
    }
    return photo;
  });
  geometryDirty = false;
  positions.forEach((photo) => {
    const { rect } = photo;
    if (!rect.height) return;
    const progress = Math.max(-1, Math.min(1,
      (rect.top - y + rect.height / 2 - viewport / 2) / ((viewport + rect.height) / 2),
    ));
    let travel = rect.height * photo.travel;
    let scale = 1 + photo.travel * 2 + 0.007;
    if (photo.contain) {
      // Keep the whole image within the available space.
      scale = 0.94;
      const { naturalWidth, naturalHeight } = photo.image;
      if (!naturalWidth || !naturalHeight) return;
      const contentHeight = Math.min(rect.height, rect.width * naturalHeight / naturalWidth) * scale;
      travel = Math.min(travel, Math.max(0, (rect.height - contentHeight) / 2 - 1));
    }
    // Keep the same crop underneath the native effect, including its first
    // pending frame and offscreen cancellation. Never expose scale(1).
    photo.image.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0) scale(${scale})`;
    motion.set(photo.image, { transform: [
      `translate3d(0,${travel}px,0) scale(${scale})`,
      `translate3d(0,${-travel}px,0) scale(${scale})`,
    ] }, rect.top - viewport, rect.top + rect.height);
  });
}

function schedule() {
  if (!motion.enabled && visible.size && !reduced.matches && !document.hidden && !frame)
    frame = requestAnimationFrame(render);
}

const visibility = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) {
      visible.add(target);
      photos.get(target).rect = null;
    } else {
      visible.delete(target);
      motion.remove(photos.get(target).image);
    }
  });
  // A sibling entering/leaving does not invalidate already visible frames.
  queueRender();
}, { rootMargin: '80px' });
function refresh() {
  geometryDirty = true;
  queueRender();
}
function queueRender() {
  if (visible.size && !reduced.matches && !document.hidden && !frame)
    frame = requestAnimationFrame(render);
}

const resize = new ResizeObserver(refresh);
if (touchHome) resize.observe(document.body);

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
  photos.forEach(({ image }) => image.style.removeProperty('transform'));
  refresh();
});
document.fonts?.ready.then(refresh);

export default function init(outer) {
  if (touchHome && outer.closest('#team, #clients')) return;
  const image = outer.querySelector('img');
  if (!image || photos.has(outer)) return;
  const requestedTravel = Number(outer.dataset.storyTravel);
  const travel = Number.isFinite(requestedTravel) && requestedTravel > 0
    ? Math.min(requestedTravel, 0.2) : 0.024;
  photos.set(outer, { image, travel, contain: outer.hasAttribute('data-story-contain') });
  visibility.observe(outer);
  resize.observe(outer);
  image.addEventListener('load', refresh);
}
