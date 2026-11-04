// All story images share one observer and one animation frame per scroll.
const photos = new Map();
const visible = new Set();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;

function render() {
  frame = 0;
  if (reduced.matches || document.hidden) return;
  // Read stationary frames together before writing image transforms.
  const positions = [...visible].map((outer) => ({
    photo: photos.get(outer),
    rect: outer.getBoundingClientRect(),
  }));
  positions.forEach(({ photo, rect }) => {
    if (!rect.height) return;
    const progress = Math.max(-1, Math.min(1,
      (rect.top + rect.height / 2 - innerHeight / 2) / ((innerHeight + rect.height) / 2),
    ));
    let travel = rect.height * photo.travel;
    let scale = 1 + photo.travel * 2 + 0.007;
    if (photo.contain) {
      // Real certificates stay complete, moving only within their spare space.
      scale = 0.94;
      const { naturalWidth, naturalHeight } = photo.image;
      if (!naturalWidth || !naturalHeight) return;
      const contentHeight = Math.min(rect.height, rect.width * naturalHeight / naturalWidth) * scale;
      travel = Math.min(travel, Math.max(0, (rect.height - contentHeight) / 2 - 1));
    }
    photo.image.style.transform = `translate3d(0, ${(progress * travel).toFixed(2)}px, 0) scale(${scale})`;
  });
}

function schedule() {
  if (visible.size && !reduced.matches && !document.hidden && !frame)
    frame = requestAnimationFrame(render);
}

const visibility = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting) visible.add(target);
    else visible.delete(target);
  });
  schedule();
}, { rootMargin: '80px' });
const resize = new ResizeObserver(schedule);

addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule, { passive: true });
addEventListener('pageshow', schedule);
document.addEventListener('visibilitychange', schedule);
reduced.addEventListener('change', () => {
  cancelAnimationFrame(frame);
  frame = 0;
  photos.forEach(({ image }) => image.style.removeProperty('transform'));
  schedule();
});
document.fonts?.ready.then(schedule);

export default function init(outer) {
  const image = outer.querySelector('img');
  if (!image || photos.has(outer)) return;
  const requestedTravel = Number(outer.dataset.storyTravel);
  const travel = Number.isFinite(requestedTravel) && requestedTravel > 0
    ? Math.min(requestedTravel, 0.2) : 0.024;
  photos.set(outer, { image, travel, contain: outer.hasAttribute('data-story-contain') });
  visibility.observe(outer);
  resize.observe(outer);
  image.addEventListener('load', schedule);
}
