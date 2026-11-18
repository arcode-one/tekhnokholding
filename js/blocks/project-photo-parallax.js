import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

export default function initProjectPhotoParallax(section) {
  const photoScale = section.classList.contains('projects-section--catalog') ? 1.03 : 1.08;
  const motion = createScrollMotion();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const photos = new Map();
  const visible = new Set();
  let frame = 0;
  let measureFrame = 0;
  let viewport = window.innerHeight;

  function paint(photo, y = scrollY) {
    const travel = Math.max(0, photo.height * (photoScale - 1) / 2 - 1);
    if (motion.set(photo.image, { transform: [
      `translate3d(0,${-travel}px,0) scale(${photoScale})`, `translate3d(0,${travel}px,0) scale(${photoScale})`,
    ] }, photo.top - viewport, photo.top + photo.height)) return;
    const progress = Math.max(0, Math.min(
      1, (viewport - photo.top + y) / (viewport + photo.height),
    ));
    const offset = (2 * progress - 1) * travel;
    photo.image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(${photoScale})`;
  }

  function update(timestamp) {
    frame = 0;
    if (reducedMotion.matches) return;
    const { y } = readMotionViewport(timestamp);
    visible.forEach((element) => paint(photos.get(element), y));
  }

  function schedule() {
    if (!motion.enabled && !frame && visible.size && !reducedMotion.matches) frame = requestAnimationFrame(update);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      const photo = photos.get(target);
      if (!photo) return;
      if (isIntersecting && !reducedMotion.matches) {
        visible.add(target);
        target.classList.add('project-card__photo--parallax-visible');
        paint(photo);
      } else {
        visible.delete(target);
        motion.remove(photo.image);
        target.classList.remove('project-card__photo--parallax-visible');
        photo.image.style.removeProperty('transform');
      }
    });
  });

  function measure() {
    measureFrame = 0;
    motion.clear();
    observer.disconnect();
    photos.forEach(({ image }, element) => {
      element.classList.remove('project-card__photo--parallax', 'project-card__photo--parallax-visible');
      image.style.removeProperty('transform');
    });
    photos.clear();
    visible.clear();
    viewport = window.innerHeight;
    if (reducedMotion.matches) return;
    const scrollY = window.scrollY;
    const measured = [...section.querySelectorAll('.project-card:not([hidden]) .project-card__photo')].map((element) => {
      const image = element.querySelector('img');
      const rect = element.getBoundingClientRect();
      return { element, image, rect };
    });
    measured.forEach(({ element, image, rect }) => {
      if (!image || !rect.height) return;
      photos.set(element, { image, top: rect.top + scrollY, height: rect.height });
      element.classList.add('project-card__photo--parallax');
      observer.observe(element);
    });
  }

  function refresh() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  onMotionResize(refresh);
  reducedMotion.addEventListener('change', refresh);
  new ResizeObserver(refresh).observe(section);
  document.fonts.ready.then(refresh);
  return refresh;
}
