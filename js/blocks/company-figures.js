export default function init(section) {
  const grid = section.querySelector('[data-ui~=company-figures__grid]');
  const nextSection = section.closest('[data-ui~=roof-background]')?.nextElementSibling;
  const coverSection = nextSection?.matches(
    '[data-ui~=projects-section]:not([data-ui~=projects-section--catalog])',
  )
    ? nextSection
    : null;
  const coverSurface = coverSection?.querySelector('[data-ui~=projects-surface]');
  const corner = coverSurface ? document.createElement('span') : null;
  if (corner) {
    const transition = document.createElement('span');
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
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION);
      counter.num.textContent = counter.format(Math.round(counter.target * easeOutCubic(t)));
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
    image: outer.querySelector('img'),
  }));
  let frame = 0;
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
    corner.style.transform = `translate3d(0, ${(-coverDistance * progress).toFixed(2)}px, 0)`;
  }

  function update() {
    frame = 0;
    if (reducedMotion.matches) return;
    const y = window.scrollY;
    reveals.forEach((item) => {
      const top = item.top - y;
      if (!item.revealed) {
        // Последние показатели должны раскрыться и без следующего экрана.
        const reachableLine = Math.min(viewport - 24, item.top - maxScroll + 1);
        const triggerLine = Math.max(viewport - item.revealInset, reachableLine);
        if (top < triggerLine) {
          item.revealed = true;
          startCount(item.counter);
        }
      }
    });
    // Рамки сближаются со своими цифрами, внутренний параллакс сохраняется.
    photos.forEach((photo) => {
      const frameProgress = clamp(
        (y - photo.scrollStart) / (photo.scrollEnd - photo.scrollStart),
        0,
        1,
      );
      const frameOffset = photo.startOffset + frameProgress * (photo.endOffset - photo.startOffset);
      photo.outer.style.transform = `translate3d(0, ${frameOffset.toFixed(2)}px, 0)`;
      const progress = Math.max(
        0,
        Math.min(1, (viewport - photo.top + y) / (viewport + photo.height)),
      );
      const offset = (progress - 0.5) * photo.height * 0.32;
      photo.image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(1.34)`;
    });
    updateCorner(y);
  }

  function schedule() {
    if (!frame && visibleSections.size && !document.hidden && !reducedMotion.matches)
      frame = requestAnimationFrame(update);
  }

  function measure() {
    const overlapEnabled = !!coverSurface && !reducedMotion.matches;
    section.classList.toggle('company-figures--overlap', overlapEnabled);
    coverSection?.classList.toggle('projects-section--overlap', overlapEnabled);
    section
      .closest('[data-ui~=roof-background]')
      ?.classList.toggle('roof-background--corner', overlapEnabled);
    grid.style.removeProperty('transform');
    coverSurface?.style.removeProperty('transform');
    if (corner) {
      corner.hidden = !overlapEnabled;
      corner.style.removeProperty('transform');
    }
    viewport = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
    const sectionRect = section.getBoundingClientRect();
    sectionTop = sectionRect.top + window.scrollY;
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
      if (reducedMotion.matches) photo.image.style.removeProperty('transform');
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
      photo.startOffset = 0;
      photo.endOffset = roof ? -travel : travel;
      photo.scrollStart = photo.top - viewport * (roof ? 0.9 : 0.8);
      photo.scrollEnd = roof
        ? photo.top - viewport * 0.35
        : Math.max(photo.scrollStart + 1, Math.min(maxScroll, photo.top + photo.height * 0.35));
      if (!roof) {
        // Офис начинает чуть выше исходной позиции и продолжает двигаться,
        // пока секция видна, а не заканчивает ход до появления цифры.
        photo.startOffset = Math.max(mobile ? -24 : -64, sectionTop + clearance - photo.top);
      }
      groups.forEach((group) => {
        if (!overlapsHorizontally(photo, group)) return;
        if (roof && group.top < photo.top) {
          photo.endOffset = Math.max(
            photo.endOffset,
            group.bottom + clearance - photo.top,
          );
        } else if (!roof && group.top > photo.top) {
          photo.endOffset = Math.min(
            photo.endOffset,
            group.top - clearance - photo.bottom,
          );
        } else if (!roof) {
          photo.startOffset = Math.max(
            photo.startOffset,
            group.bottom + clearance - photo.top,
          );
        }
      });
      // Две фотографии тоже резервируют друг другу место на узких экранах.
      photos.forEach((other) => {
        if (photo === other || !overlapsHorizontally(photo, other)) return;
        if (roof && other.top < photo.top) {
          photo.endOffset = Math.max(photo.endOffset, other.bottom + clearance - photo.top);
        } else if (!roof && other.top > photo.top) {
          photo.endOffset = Math.min(photo.endOffset, other.top - clearance - photo.bottom);
        } else if (!roof) {
          photo.startOffset = Math.max(photo.startOffset, other.bottom + clearance - photo.top);
        }
      });
      photo.endOffset = roof
        ? clamp(photo.endOffset, -travel, 0)
        : clamp(photo.endOffset, 0, travel);
      photo.startOffset = clamp(photo.startOffset, mobile ? -24 : -64, 0);
    });
    update();
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
  if (coverSurface) visibility.observe(coverSurface);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reducedMotion.addEventListener('change', measure);
  new ResizeObserver(measure).observe(section);
  if (document.fonts) document.fonts.ready.then(measure);
}
