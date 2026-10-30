/* Однократное раскрытие цифр и небольшой параллакс связанных текстовых групп.
   Допустимый сдвиг вычисляется по свободному месту, без пересечения фото. */
(function () {
  const section = document.querySelector('.company-figures');
  if (!section) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COUNT_DURATION = 2000;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // Число выносится в отдельный span: под него резервируется финальная ширина,
  // поэтому «+» и «%» не прыгают, пока цифры набегают от нуля
  function createCounter(value) {
    const textNode = Array.from(value.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!textNode) return null;
    const original = textNode.textContent.trim();
    const separator = (original.match(/\D/) || [''])[0];
    const target = Number(original.replace(/\D/g, ''));
    const num = document.createElement('span');
    num.className = 'company-figures__num';
    num.textContent = original;
    textNode.replaceWith(num);
    const format = (n) => (separator ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separator) : String(n));
    return { num, target, format, started: false };
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
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const reveals = Array.from(section.querySelectorAll('[data-figures-reveal]'), (outer) => {
    const counter = createCounter(outer.firstElementChild);
    if (counter && !reducedMotion.matches) counter.num.textContent = counter.format(0);
    const parts = [outer.firstElementChild, outer.closest('.company-figures__item')?.querySelector('dt > span')].filter(Boolean);
    parts.forEach((part) => part.classList.add('company-figures__reveal'));
    return {
      outer,
      parts,
      counter,
      revealInset: Number(outer.dataset.figuresReveal || 0),
      revealed: !outer.hasAttribute('data-figures-reveal'),
    };
  });
  const title = section.querySelector('.company-figures__title');
  const groups = [
    ...(title ? [{ outer: title, parts: [title.firstElementChild], range: 12 }] : []),
    ...Array.from(section.querySelectorAll('.company-figures__item'), (outer, index) => ({
      outer,
      parts: Array.from(outer.querySelectorAll('dt > span, dd > span')),
      range: [28, 24, 32, 24][index] || 24,
    })),
  ];
  const photos = Array.from(section.querySelectorAll('[data-figures-image]'), (outer) => ({
    outer,
    image: outer.querySelector('img'),
  }));
  let frame = 0;
  let viewport = 0;
  let maxScroll = 0;
  let sectionTop = 0;
  let sectionBottom = 0;
  let edgeGap = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlapsHorizontally = (a, b) => a.left < b.right && a.right > b.left;

  function update() {
    frame = 0;
    if (reducedMotion.matches) return;
    const y = window.scrollY;
    groups.forEach((group) => {
      const progress = clamp((viewport - group.top + y) / (viewport + group.height), 0, 1);
      const offset = group.maxOffset + progress * (group.minOffset - group.maxOffset);
      group.parts.forEach((part) => {
        part.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
    });
    reveals.forEach((item) => {
      const top = item.top - y;
      if (!item.revealed) {
        // Последние показатели должны раскрыться и без следующего экрана.
        const reachableLine = Math.min(viewport - 24, item.top - maxScroll + 1);
        const triggerLine = Math.max(viewport - item.revealInset, reachableLine);
        if (top < triggerLine) {
          item.revealed = true;
          item.parts.forEach((part) => part.classList.remove('is-reveal-pending'));
          startCount(item.counter);
        }
      }
    });
    // Рамки сближаются со своими цифрами, внутренний параллакс сохраняется.
    photos.forEach((photo) => {
      const frameProgress = clamp((y - photo.scrollStart) / (photo.scrollEnd - photo.scrollStart), 0, 1);
      const frameOffset = photo.startOffset + frameProgress * (photo.endOffset - photo.startOffset);
      photo.outer.style.transform = `translate3d(0, ${frameOffset.toFixed(2)}px, 0)`;
      const progress = Math.max(0, Math.min(1, (viewport - photo.top + y) / (viewport + photo.height)));
      const offset = (progress - .5) * photo.height * .32;
      photo.image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(1.34)`;
    });
  }

  function schedule() {
    if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(update);
  }

  function measure() {
    viewport = window.innerHeight;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
    const sectionRect = section.getBoundingClientRect();
    sectionTop = sectionRect.top + window.scrollY;
    sectionBottom = sectionRect.bottom + window.scrollY;
    edgeGap = parseFloat(getComputedStyle(section).getPropertyValue('--figures-edge-gap')) || 40;
    reveals.forEach((item) => {
      const rect = item.outer.getBoundingClientRect();
      item.top = rect.top + window.scrollY;
      item.height = rect.height;
      if (item.counter) reserveWidth(item.counter);
      if (reducedMotion.matches) {
        item.parts.forEach((part) => part.classList.remove('is-reveal-pending'));
        item.revealed = true;
        if (item.counter) item.counter.num.textContent = item.counter.format(item.counter.target);
      } else if (!item.revealed) {
        item.parts.forEach((part) => part.classList.add('is-reveal-pending'));
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
    const gap = mobile ? 12 : 16;
    groups.forEach((group) => {
      const rect = group.outer.getBoundingClientRect();
      group.top = rect.top + window.scrollY;
      group.height = rect.height;
      group.bottom = group.top + group.height;
      group.left = rect.left;
      group.right = rect.right;
      group.travel = group.range * (mobile ? .5 : 1);
      const boundaryGap = group.outer === title ? edgeGap / 2 : edgeGap;
      group.minOffset = Math.max(-group.travel, sectionTop + boundaryGap - group.top);
      group.maxOffset = Math.min(0, sectionBottom - boundaryGap - group.bottom);
      if (reducedMotion.matches) group.parts.forEach((part) => part.style.removeProperty('transform'));
    });
    groups.forEach((group) => {
      photos.forEach((photo) => {
        if (!overlapsHorizontally(group, photo)) return;
        if (group.top < photo.top) {
          group.maxOffset = Math.min(group.maxOffset, photo.top - gap - group.bottom);
        } else {
          group.minOffset = Math.max(group.minOffset, photo.bottom + gap - group.top);
        }
      });
      // Соседние подвижные группы делят свободный промежуток пополам.
      groups.forEach((other) => {
        if (group === other || !overlapsHorizontally(group, other)) return;
        if (group.top < other.top) {
          group.maxOffset = Math.min(group.maxOffset, (other.top - gap - group.bottom) / 2);
        } else {
          group.minOffset = Math.max(group.minOffset, (other.bottom + gap - group.top) / 2);
        }
      });
    });
    photos.forEach((photo) => {
      const roof = photo.outer.classList.contains('company-figures__photo--roof');
      const travel = mobile ? 56 : 140;
      const clearance = mobile ? 20 : 24;
      photo.startOffset = 0;
      photo.endOffset = roof ? -travel : travel;
      photo.scrollStart = photo.top - viewport * (roof ? .9 : .8);
      photo.scrollEnd = roof
        ? photo.top - viewport * .35
        : Math.max(photo.scrollStart + 1, Math.min(maxScroll, photo.top + photo.height * .35));
      if (!roof) {
        // Офис начинает чуть выше исходной позиции и продолжает двигаться,
        // пока секция видна, а не заканчивает ход до появления цифры.
        photo.startOffset = Math.max(mobile ? -24 : -64, sectionTop + clearance - photo.top);
      }
      groups.forEach((group) => {
        if (!overlapsHorizontally(photo, group)) return;
        if (roof && group.top < photo.top) {
          photo.endOffset = Math.max(photo.endOffset, group.bottom + group.maxOffset + clearance - photo.top);
        } else if (!roof && group.top > photo.top) {
          photo.endOffset = Math.min(photo.endOffset, group.top + group.minOffset - clearance - photo.bottom);
        } else if (!roof) {
          photo.startOffset = Math.max(photo.startOffset, group.bottom + group.maxOffset + clearance - photo.top);
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
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  reducedMotion.addEventListener('change', measure);
  new ResizeObserver(measure).observe(section);
  if (document.fonts) document.fonts.ready.then(measure);
})();
