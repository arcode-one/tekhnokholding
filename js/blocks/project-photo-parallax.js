export default function initProjectPhotoParallax(section) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const photos = new Map();
  const visible = new Set();
  let frame = 0;
  let measureFrame = 0;
  let viewport = window.innerHeight;

  function paint(photo) {
    const progress = Math.max(0, Math.min(
      1, (viewport - photo.top + window.scrollY) / (viewport + photo.height),
    ));
    // Тот же внутренний ход и запас изображения, что в company-figures.
    const offset = (progress - 0.5) * photo.height * 0.32;
    photo.image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(1.34)`;
  }

  function update() {
    frame = 0;
    if (reducedMotion.matches) return;
    visible.forEach((element) => paint(photos.get(element)));
  }

  function schedule() {
    if (!frame && visible.size && !reducedMotion.matches) frame = requestAnimationFrame(update);
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
        target.classList.remove('project-card__photo--parallax-visible');
        photo.image.style.removeProperty('transform');
      }
    });
  });

  function measure() {
    measureFrame = 0;
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
  window.addEventListener('resize', refresh, { passive: true });
  reducedMotion.addEventListener('change', refresh);
  new ResizeObserver(refresh).observe(section);
  document.fonts.ready.then(refresh);
  return refresh;
}
