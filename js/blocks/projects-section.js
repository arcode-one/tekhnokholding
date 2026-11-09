import initProjectPhotoParallax from './project-photo-parallax.js';

export default function init(section) {
  const rail = section.querySelector('[data-projects-rail]');
  const group = section.querySelector('[data-projects-group]');
  const cards = [...group.children];
  const headings = cards.map((card) => card.querySelector('.project-card__heading'));
  const photoFirst = section.classList.contains('projects-section--photo-first');
  const staticHome = section.closest('.home-page--static') !== null;
  const areaValues = cards.map((card) => card.querySelector('.project-card__area dd'));
  const types = [...section.querySelectorAll('[data-project-type]')];
  const count = section.querySelector('[data-projects-count]');
  const countValue = count?.querySelector('[data-projects-count-value]');
  const countLabel = count?.querySelector('[data-projects-count-label]');
  const empty = section.querySelector('[data-projects-empty]');
  const prev = section.querySelector('[data-projects-prev]');
  const next = section.querySelector('[data-projects-next]');
  const controls = section.querySelector('[data-projects-controls]');
  const catalog = section.classList.contains('projects-section--catalog');
  const more = section.querySelector('[data-projects-more]');
  const moreWrap = section.querySelector('[data-projects-more-wrap]');
  const pageSize = 8;
  let shown = pageSize;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const hover = matchMedia('(hover:hover) and (pointer:fine)');
  const plurals = new Intl.PluralRules('ru');
  let selectedType = '',
    filtered = cards;
  let frame = 0,
    lastTime = 0,
    speed = 0;
  let resumeTimer = 0;
  let autoPosition = 0,
    lastWrittenScroll = 0;
  let loopGroup = null,
    loopDistance = 0;
  let visible = false,
    hovered = false,
    focused = false;
  let pointer = null,
    moved = false,
    manualUntil = 0;
  let cardSizeKey = '';
  const refreshPhotoParallax = staticHome ? () => {} : initProjectPhotoParallax(section);

  function syncCardHeights(force = false) {
    if (!rail.clientWidth) return;
    const key = `${rail.clientWidth}:${window.innerWidth}`;
    if (!force && key === cardSizeKey) return;
    cardSizeKey = key;
    // Align content rows before measuring the whole card, including compound areas.
    // Hidden categories participate only in this synchronous measurement, never in paint.
    section.setAttribute('data-measuring-cards', '');
    try {
      section.style.removeProperty('--project-heading-height');
      section.style.removeProperty('--project-area-value-height');
      section.style.removeProperty('--project-card-height');
      if (!photoFirst) {
        const headingHeight = Math.ceil(Math.max(0, ...headings.map((heading) => heading.getBoundingClientRect().height)));
        section.style.setProperty('--project-heading-height', `${headingHeight}px`);
        const areaHeight = Math.ceil(Math.max(0, ...areaValues.map((value) => value.getBoundingClientRect().height)));
        section.style.setProperty('--project-area-value-height', `${areaHeight}px`);
      }
      const height = Math.ceil(Math.max(0, ...cards.map((card) => card.getBoundingClientRect().height)));
      section.style.setProperty('--project-card-height', `${height}px`);
    } finally {
      section.removeAttribute('data-measuring-cards');
    }
  }

  function wantsMotion() {
    return (
      !catalog &&
      loopDistance > 0 &&
      visible &&
      !document.hidden &&
      !reduce.matches &&
      !hovered &&
      !focused &&
      !pointer &&
      performance.now() >= manualUntil
    );
  }
  function tick(now) {
    frame = 0;
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;
    const target = wantsMotion() ? 32 : 0;
    speed += (target - speed) * (1 - Math.exp(-dt / 0.12));
    // После последней карточки видна копия начала. Возврат к оригиналам незаметен.
    // scrollLeft округляется браузером, поэтому дробную позицию храним отдельно.
    if (Math.abs(speed) > 0.05) {
      if (Math.abs(rail.scrollLeft - lastWrittenScroll) > 1) autoPosition = rail.scrollLeft;
      autoPosition += speed * dt;
      if (target && autoPosition >= loopDistance) autoPosition %= loopDistance;
      autoPosition = Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, autoPosition));
      rail.scrollLeft = autoPosition;
      lastWrittenScroll = rail.scrollLeft;
    }
    if (
      visible &&
      !document.hidden &&
      (target || Math.abs(speed) > 0.05)
    )
      frame = requestAnimationFrame(tick);
    else {
      lastTime = 0;
      const remaining = manualUntil - performance.now();
      if (visible && !document.hidden && remaining > 0) {
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(wake, remaining);
      }
    }
  }
  function wake() {
    clearTimeout(resumeTimer);
    if (!frame && !catalog && !staticHome) frame = requestAnimationFrame(tick);
  }
  function updateArrows() {
    const room = rail.scrollWidth - rail.clientWidth;
    const scrollable = !rail.hidden && filtered.length > 1 && room > 1;
    if (prev) {
      prev.hidden = !scrollable;
      prev.disabled = !scrollable || (!loopDistance && rail.scrollLeft <= 1);
    }
    if (next) {
      next.hidden = !scrollable;
      next.disabled = !scrollable || (!loopDistance && rail.scrollLeft >= room - 1);
    }
    if (controls) controls.hidden = !scrollable;
  }
  // Фото дальних карточек ставятся, когда до них остаётся около трёх экранов ленты
  const photoObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const img = entry.target;
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              photoObserver.unobserve(img);
            }),
          { root: rail, rootMargin: '0px 1600px' },
        )
      : null;
  const watchPhotos = (scope) =>
    scope.querySelectorAll('img[data-src]').forEach((img) => {
      if (photoObserver) photoObserver.observe(img);
      else {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  watchPhotos(group);
  function syncLoop() {
    const position = loopDistance ? rail.scrollLeft % loopDistance : rail.scrollLeft;
    loopGroup?.querySelectorAll('img[data-src]').forEach((img) => photoObserver?.unobserve(img));
    loopGroup?.remove();
    loopGroup = null;
    loopDistance = 0;
    if (
      !catalog &&
      !staticHome &&
      !reduce.matches &&
      filtered.length > 1 &&
      rail.clientWidth > 0 &&
      group.getBoundingClientRect().width >= rail.clientWidth - 1
    ) {
      // Копируем начало на ширину окна и ещё один шаг для перехода стрелкой через стык.
      loopGroup = group.cloneNode(false);
      loopGroup.removeAttribute('data-projects-group');
      loopGroup.setAttribute('data-projects-loop', '');
      loopGroup.setAttribute('aria-hidden', 'true');
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      const step = filtered[0].getBoundingClientRect().width + gap;
      let width = 0;
      for (let i = 0; width < rail.clientWidth + step && i <= filtered.length; i++) {
        const card = filtered[i % filtered.length];
        const copy = card.cloneNode(true);
        copy.tabIndex = -1;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        loopGroup.append(copy);
        width += card.getBoundingClientRect().width + gap;
      }
      group.after(loopGroup);
      loopDistance =
        loopGroup.firstElementChild.getBoundingClientRect().left -
        filtered[0].getBoundingClientRect().left;
      watchPhotos(loopGroup);
    }
    rail.scrollLeft = position;
    autoPosition = rail.scrollLeft;
    lastWrittenScroll = rail.scrollLeft;
    refreshPhotoParallax();
    updateArrows();
  }
  function syncCatalogPage() {
    if (!catalog || !more) return;
    filtered.forEach((card, index) => { card.hidden = index >= shown; });
    moreWrap.hidden = shown >= filtered.length;
    refreshPhotoParallax();
  }
  more?.addEventListener('click', () => {
    const firstNewCard = filtered[shown];
    shown += pageSize;
    syncCatalogPage();
    firstNewCard?.focus({ preventScroll: true });
  });
  function applyFilters() {
    speed = 0;
    filtered = cards.filter((card) => {
      card.hidden = Boolean(selectedType && card.dataset.type !== selectedType);
      return !card.hidden;
    });
    const ending = { one: 'объект', few: 'объекта', many: 'объектов', other: 'объекта' }[
      plurals.select(filtered.length)
    ];
    if (countValue && countLabel) {
      countValue.textContent = filtered.length;
      countLabel.textContent = ending;
    } else if (count) count.textContent = `${filtered.length} ${ending}`;
    empty.hidden = filtered.length !== 0;
    rail.hidden = filtered.length === 0;
    shown = pageSize;
    syncCatalogPage();
    rail.scrollLeft = 0;
    autoPosition = 0;
    lastWrittenScroll = 0;
    syncLoop();
    wake();
  }
  types.forEach((button) =>
    button.addEventListener('click', () => {
      selectedType = button.dataset.projectType;
      types.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      manualUntil = performance.now() + 3000;
      applyFilters();
    }),
  );
  section.querySelector('[data-projects-reset]').addEventListener('click', () => {
    selectedType = '';
    types.forEach((b, i) => b.setAttribute('aria-pressed', String(i === 0)));
    manualUntil = performance.now() + 3000;
    applyFilters();
  });
  function nudge(direction) {
    speed = 0;
    manualUntil = performance.now() + 3500;
    const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
    const distance = (filtered[0]?.getBoundingClientRect().width || 350) + gap;
    // На стыке копии и оригинала продолжаем листать в обе стороны.
    if (loopDistance) {
      if (direction < 0 && rail.scrollLeft < distance) rail.scrollLeft += loopDistance;
      else if (direction > 0 && rail.scrollLeft >= loopDistance - 1)
        rail.scrollLeft -= loopDistance;
    }
    rail.scrollBy({ left: direction * distance, behavior: reduce.matches ? 'auto' : 'smooth' });
    wake();
  }
  prev?.addEventListener('click', () => nudge(-1));
  next?.addEventListener('click', () => nudge(1));
  if (!catalog) {
    rail.addEventListener('pointerenter', () => {
      if (hover.matches) {
        hovered = true;
        wake();
      }
    });
    rail.addEventListener('pointerleave', () => {
      hovered = false;
      wake();
    });
    rail.addEventListener('focusin', () => {
      focused = true;
      wake();
    });
    rail.addEventListener('focusout', (e) => {
      focused = rail.contains(e.relatedTarget);
      wake();
    });
    // Вертикальное колесо проходит к странице и её плавной прокрутке.
    // Лентой управляют стрелки, перетаскивание и нативный горизонтальный свайп.
    rail.addEventListener('scroll', updateArrows, { passive: true });
    rail.addEventListener('dragstart', (e) => e.preventDefault());
    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || pointer) return;
      pointer = {
        id: e.pointerId,
        x: e.clientX,
        left: rail.scrollLeft,
        mouse: e.pointerType === 'mouse',
      };
      moved = false;
      speed = 0;
      rail.scrollTo({ left: rail.scrollLeft, behavior: 'instant' });
      wake();
    });
    rail.addEventListener('pointermove', (e) => {
      if (!pointer || !pointer.mouse || pointer.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x;
      if (Math.abs(dx) > 6) {
        moved = true;
        rail.classList.add('projects-rail--dragging');
        rail.setPointerCapture(e.pointerId);
      }
      if (moved) {
        e.preventDefault();
        rail.scrollLeft = pointer.left - dx;
      }
    });
    function release(e) {
      if (!pointer || pointer.id !== e.pointerId) return;
      const id = pointer.id;
      pointer = null;
      if (rail.hasPointerCapture(id)) rail.releasePointerCapture(id);
      rail.classList.remove('projects-rail--dragging');
      manualUntil = performance.now() + 2000;
      wake();
    }
    window.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
    rail.addEventListener('lostpointercapture', release);
    rail.addEventListener(
      'click',
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true,
    );
    rail.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        nudge(e.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      if (inView && !visible) {
        speed = 0;
        manualUntil = Math.max(manualUntil, performance.now() + 3000);
      }
      visible = inView;
      wake();
    }, { threshold: [0, 0.15] }).observe(rail);
    document.addEventListener('visibilitychange', () => {
      lastTime = 0;
      wake();
    });
  }
  reduce.addEventListener('change', () => {
    speed = 0;
    syncLoop();
    wake();
  });
  new ResizeObserver(() => {
    syncCardHeights();
    syncLoop();
    wake();
  }).observe(rail);
  syncCardHeights();
  document.fonts.ready.then(() => {
    syncCardHeights(true);
    refreshPhotoParallax();
  });
  applyFilters();
}
