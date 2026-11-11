import setFiguresPhotoParallax from '../lib/figures-photo-parallax.js';
import { createScrollMotion, onMotionResize, readMotionViewport } from '../lib/scroll-motion.js';

export default function init(section) {
  const motion = createScrollMotion();
  const grid = section.querySelector('[data-ui~=company-figures__grid]');
  const nextSection = section.closest('[data-ui~=roof-background]')?.nextElementSibling;
  const coverSection = nextSection?.matches('[data-company-map]') ? nextSection : null;
  const transition = coverSection ? document.createElement('span') : null;
  const corner = transition ? document.createElement('span') : null;
  if (transition) {
    const edge = document.createElement('span');
    transition.className = 'projects-transition';
    transition.setAttribute('aria-hidden', 'true');
    edge.className = 'projects-transition__edge';
    corner.className = 'projects-corner';
    edge.append(corner);
    transition.append(edge);
    coverSection.prepend(transition);
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchHome = section.closest('.home-page--touch') !== null;
  const COUNT_DURATION = 2000;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // Число выносится в отдельный span: под него резервируется финальная ширина,
  // поэтому «+» и «%» не прыгают, пока цифры набегают от нуля
  function createCounter(value) {
    const textNode = Array.from(value.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
    );
    if (!textNode) return null;
    const original = textNode.textContent.trim();
    const separator = (original.match(/\D/) || [''])[0];
    const target = Number(original.replace(/\D/g, ''));
    const num = document.createElement('span');
    num.className = 'company-figures__num';
    num.textContent = original;
    textNode.replaceWith(num);
    const format = (n) =>
      separator ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator) : String(n);
    return { num, target, format, started: false, frame: 0 };
  }

  function reserveWidth(counter) {
    const current = counter.num.textContent;
    counter.num.style.minWidth = '';
    counter.num.textContent = counter.format(counter.target);
    counter.num.style.minWidth = `${counter.num.getBoundingClientRect().width}px`;
    counter.num.textContent = current;
  }

  function startCount(counter) {
    if (!counter || counter.started) return;
    counter.started = true;
    const start = performance.now();
    let lastPaint = -Infinity;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION);
      if (t === 1 || !touchHome || now - lastPaint >= 32) {
        const value = counter.format(Math.round(counter.target * easeOutCubic(t)));
        if (counter.num.textContent !== value) counter.num.textContent = value;
        lastPaint = now;
      }
      counter.frame = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    counter.frame = requestAnimationFrame(tick);
  }

  const reveals = Array.from(section.querySelectorAll('[data-figures-reveal]'), (outer) => {
    const counter = createCounter(outer.firstElementChild);
    if (counter && !reducedMotion.matches) counter.num.textContent = counter.format(0);
    return {
      outer,
      counter,
      revealInset: Number(outer.dataset.figuresReveal || 0),
      revealed: !outer.hasAttribute('data-figures-reveal'),
    };
  });
  const title = section.querySelector('[data-ui~=company-figures__title]');
  const groups = [
    title,
    ...section.querySelectorAll('[data-ui~=company-figures__item]'),
  ].filter(Boolean).map((outer) => ({ outer }));
  const photos = Array.from(section.querySelectorAll('[data-figures-image]'), (outer) => ({
    outer,
    parallaxImage: outer.querySelector('.home-photo-zoom img'),
  }));
  let frame = 0;
  let measureFrame = 0;
  const visibleSections = new Set();
  let viewport = 0;
  let maxScroll = 0;
  let sectionTop = 0;
  let coverTop = 0;
  let coverDistance = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlapsHorizontally = (a, b) => a.left < b.right && a.right > b.left;

  function updateCorner(y) {
    if (!corner || reducedMotion.matches) return;
    // Каждый пиксель прохода границы через окно сразу меняет положение угла.
    // Без стартового порога, easing и дополнительного сглаживания после скролла.
    const progress = clamp((y - coverTop + viewport) / viewport, 0, 1);
    const offset = -coverDistance * progress;
    const ratio = devicePixelRatio || 1;
    const aligned = touchHome ? Math.round(offset * ratio) / ratio : offset;
    corner.style.transform = `translate3d(0, ${aligned.toFixed(2)}px, 0)`;
  }

  function update(timestamp) {
    frame = 0;
    if (reducedMotion.matches) return;
    const { y } = readMotionViewport(timestamp);
    reveals.forEach((item) => {
      const top = item.top - y;
      if (!item.revealed) {
        // Последние показатели должны раскрыться и без следующего экрана.
        const reachableLine = Math.min(viewport - 24, item.top - maxScroll + 1);
        const triggerLine = Math.max(viewport - item.revealInset, reachableLine);
        if (top < triggerLine) {
          item.revealed = true;
          if (touchHome && item.counter && top + item.height <= 0) {
            item.counter.num.textContent = item.counter.format(item.counter.target);
          } else {
            startCount(item.counter);
          }
        }
      }
    });
    // Смещение рамок привязано к прокрутке.
    if (motion.enabled) return;
    photos.forEach((photo) => {
      const frameProgress = clamp(
        (y - photo.scrollStart) / (photo.scrollEnd - photo.scrollStart),
        0,
        1,
      );
      const frameOffset = photo.startOffset + frameProgress * (photo.endOffset - photo.startOffset);
      photo.outer.style.transform = `translate3d(0, ${frameOffset.toFixed(2)}px, 0)`;
      if (photo.parallaxImage) {
        setFiguresPhotoParallax(photo.parallaxImage, photo.top - y, photo.height, viewport);
      }
    });
    updateCorner(y);
  }

  function schedule() {
    if (motion.enabled && reveals.every((item) => item.revealed)) return;
    if (!frame && visibleSections.size && !document.hidden && !reducedMotion.matches)
      frame = requestAnimationFrame(update);
  }

  function measure() {
    measureFrame = 0;
    motion.clear();
    const overlapEnabled = !!transition && !reducedMotion.matches;
    grid.style.removeProperty('transform');
    if (transition) {
      transition.hidden = !overlapEnabled;
      corner.style.removeProperty('transform');
    }
    viewport = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
    const sectionRect = section.getBoundingClientRect();
    sectionTop = sectionRect.top + window.scrollY;
    const sectionBottom = sectionRect.bottom + window.scrollY;
    coverTop = coverSection ? coverSection.getBoundingClientRect().top + window.scrollY : 0;
    coverDistance = overlapEnabled ? corner.offsetHeight : 0;
    reveals.forEach((item) => {
      const rect = item.outer.getBoundingClientRect();
      item.top = rect.top + window.scrollY;
      item.height = rect.height;
      if (item.counter) reserveWidth(item.counter);
      if (reducedMotion.matches) {
        item.revealed = true;
        if (item.counter) {
          cancelAnimationFrame(item.counter.frame);
          item.counter.frame = 0;
          item.counter.num.textContent = item.counter.format(item.counter.target);
        }
      }
    });
    photos.forEach((photo) => {
      // Измеряем исходную рамку: повторный resize не накапливает сдвиг.
      photo.outer.style.removeProperty('transform');
      const rect = photo.outer.getBoundingClientRect();
      photo.top = rect.top + window.scrollY;
      photo.height = rect.height;
      photo.bottom = photo.top + photo.height;
      photo.left = rect.left;
      photo.right = rect.right;
      if (reducedMotion.matches) photo.parallaxImage?.style.removeProperty('transform');
    });
    const mobile = window.innerWidth <= 767;
    // Текст неподвижен. Его границы нужны только для безопасного хода фотографий.
    groups.forEach((group) => {
      const rect = group.outer.getBoundingClientRect();
      group.top = rect.top + window.scrollY;
      group.height = rect.height;
      group.bottom = group.top + group.height;
      group.left = rect.left;
      group.right = rect.right;
    });
    photos.forEach((photo) => {
      const roof = photo.outer.classList.contains('company-figures__photo--roof');
      const travel = mobile ? 56 : 140;
      const clearance = mobile ? 20 : 24;
      const upwardTravel = roof ? travel : mobile ? 24 : 64;
      // Кадр кровли отстаёт от прокрутки целиком, в пределах свободного места.
      photo.startOffset = Math.max(-upwardTravel, sectionTop + clearance - photo.top);
      photo.endOffset = roof ? Math.min(travel, sectionBottom - clearance - photo.bottom) : travel;
      photo.scrollStart = photo.top - viewport * (roof ? 0.9 : 0.8);
      photo.scrollEnd = roof
        ? photo.bottom - viewport * 0.35
        : Math.max(photo.scrollStart + 1, Math.min(maxScroll, photo.top + photo.height * 0.35));
      groups.forEach((group) => {
        if (!overlapsHorizontally(photo, group)) return;
        if (group.top > photo.top) {
          photo.endOffset = Math.min(
            photo.endOffset,
            group.top - clearance - photo.bottom,
          );
        } else {
          photo.startOffset = Math.max(
            photo.startOffset,
            group.bottom + clearance - photo.top,
          );
        }
      });
      // Две фотографии тоже резервируют друг другу место на узких экранах.
      photos.forEach((other) => {
        if (photo === other || !overlapsHorizontally(photo, other)) return;
        if (other.top > photo.top) {
          photo.endOffset = Math.min(photo.endOffset, other.top - clearance - photo.bottom);
        } else {
          photo.startOffset = Math.max(photo.startOffset, other.bottom + clearance - photo.top);
        }
      });
      photo.endOffset = clamp(photo.endOffset, 0, travel);
      photo.startOffset = clamp(photo.startOffset, -upwardTravel, 0);
    });
    if (motion.enabled) {
      photos.forEach((photo) => {
        motion.set(photo.outer, { transform: [
          `translate3d(0,${photo.startOffset}px,0)`, `translate3d(0,${photo.endOffset}px,0)`,
        ] }, photo.scrollStart, photo.scrollEnd);
        if (photo.parallaxImage) {
          motion.set(photo.parallaxImage, { transform: [
            `translate3d(0,${-photo.height * .16}px,0) scale(1.34)`,
            `translate3d(0,${photo.height * .16}px,0) scale(1.34)`,
          ] }, photo.top - viewport, photo.top + photo.height);
        }
      });
      if (coverDistance) motion.set(corner, { transform: ['translate3d(0,0,0)', `translate3d(0,${-coverDistance}px,0)`] },
        coverTop - viewport, coverTop, { easing: `steps(${Math.max(1, Math.round(coverDistance * (devicePixelRatio || 1)))}, end)` });
    }
    update();
  }

  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }

  measure();
  const visibility = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) visibleSections.add(target);
      else visibleSections.delete(target);
    });
    schedule();
  }, { rootMargin: '100px' });
  visibility.observe(section);
  if (coverSection) visibility.observe(coverSection);
  window.addEventListener('scroll', schedule, { passive: true });
  onMotionResize(scheduleMeasure);
  reducedMotion.addEventListener('change', scheduleMeasure);
  const sizes = new ResizeObserver(scheduleMeasure);
  sizes.observe(section);
  if (coverSection) sizes.observe(coverSection);
  if (document.fonts) document.fonts.ready.then(scheduleMeasure);
}
