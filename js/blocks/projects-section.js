import initMapLayout from './company-map-layout.js';
import initProjectPhotoParallax from './project-photo-parallax.js';

export default function init(section) {
  const rail = section.querySelector('[data-projects-rail]');
  const group = section.querySelector('[data-projects-group]');
  const body = section.querySelector('.projects-body');
  const cards = [...group.children];
  const types = [...section.querySelectorAll('[data-project-type]')];
  const years = [...section.querySelectorAll('[data-project-year]')];
  const yearList = section.querySelector('[data-years-list]');
  const yearSteps = [...section.querySelectorAll('[data-years-step]')];
  const count = section.querySelector('[data-projects-count]');
  const countValue = count?.querySelector('[data-projects-count-value]');
  const countLabel = count?.querySelector('[data-projects-count-label]');
  const empty = section.querySelector('[data-projects-empty]');
  const pause = section.querySelector('[data-projects-pause]');
  const pauseLabel = pause?.querySelector('[data-projects-pause-label]');
  const prev = section.querySelector('[data-projects-prev]');
  const next = section.querySelector('[data-projects-next]');
  const catalog = section.classList.contains('projects-section--catalog');
  const mapSection = section.nextElementSibling;
  if (!catalog && mapSection?.matches('[data-company-map]')) initMapLayout(mapSection);
  const reduce = matchMedia('(prefers-reduced-motion:reduce)');
  const hover = matchMedia('(hover:hover) and (pointer:fine)');
  const plurals = new Intl.PluralRules('ru');
  let selectedType = '',
    selectedYear = '',
    filtered = cards;
  let frame = 0,
    lastTime = 0,
    speed = 0;
  let autoPosition = 0,
    lastWrittenScroll = 0;
  let loopGroup = null,
    loopDistance = 0;
  let visible = false,
    hovered = false,
    focused = false,
    userPaused = false;
  let pointer = null,
    moved = false,
    manualUntil = 0;
  let cardSizeKey = '';
  let edgeRanges = [];
  const refreshPhotoParallax = initProjectPhotoParallax(section);

  function syncEdgeRanges() {
    if (catalog || !body) return;
    const origin = rail.getBoundingClientRect().left - rail.scrollLeft;
    const edgeCards = [...filtered, ...(loopGroup ? loopGroup.children : [])];
    edgeRanges = edgeCards.map((card) => {
      const rect = card.getBoundingClientRect();
      return { left: rect.left - origin, right: rect.right - origin };
    });
  }

  function updateEdgeBorders() {
    if (catalog || !body) return;
    // Геометрия кешируется при смене набора/размера, без чтения карточек на скролле.
    const cutsCard = (position) => !rail.hidden && edgeRanges.some(
      (range) => position > range.left + 0.5 && position < range.right - 0.5,
    );
    body.toggleAttribute('data-projects-cut-start', cutsCard(rail.scrollLeft));
    body.toggleAttribute('data-projects-cut-end', cutsCard(rail.scrollLeft + rail.clientWidth));
  }

  function syncCardHeights(force = false) {
    if (!rail.clientWidth) return;
    const key = `${rail.clientWidth}:${window.innerWidth}`;
    if (!force && key === cardSizeKey) return;
    cardSizeKey = key;
    // Общую высоту считаем с прежним размером фотографии.
    section.style.setProperty('--project-photo-extra', '0px');
    // Hidden years participate only in this synchronous measurement, never in paint.
    section.setAttribute('data-measuring-cards', '');
    try {
      const height = Math.ceil(Math.max(0, ...cards.map((card) => card.getBoundingClientRect().height)));
      section.style.setProperty('--project-card-height', `${height}px`);
    } finally {
      section.removeAttribute('data-measuring-cards');
    }
    balanceCardPhotos();
  }

  function balanceCardPhotos() {
    section.style.setProperty('--project-photo-extra', '0px');
    const visibleCards = filtered.filter((card) => !card.hidden);
    if (!visibleCards.length || rail.hidden) return;
    const requested = parseFloat(
      getComputedStyle(visibleCards[0]).getPropertyValue('--project-photo-transfer'),
    ) || 0;
    // Переносим свободный margin в фото, оставляя 8px воздуха над деталями.
    // Один размер фото для всей выбранной группы; длинный текст не обрезается.
    const available = Math.min(...visibleCards.map((card) => {
      const details = card.querySelector('.project-card__details');
      return Math.max(0, (parseFloat(getComputedStyle(details).marginTop) || 0) - 8);
    }));
    const extra = Math.floor(Math.min(requested, available));
    section.style.setProperty('--project-photo-extra', `${extra}px`);
  }

  function wantsMotion() {
    return (
      !catalog &&
      loopDistance > 0 &&
      visible &&
      !document.hidden &&
      !reduce.matches &&
      !userPaused &&
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
      (target || Math.abs(speed) > 0.05 || performance.now() < manualUntil)
    )
      frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }
  function wake() {
    if (!frame && !catalog) frame = requestAnimationFrame(tick);
  }
  function updatePause() {
    if (!pause) return;
    pause.disabled = !loopDistance || reduce.matches;
    (pauseLabel || pause).textContent = pause.disabled
      ? 'Лента остановлена'
      : userPaused
        ? 'Запустить ленту'
        : 'Остановить ленту';
    pause.setAttribute('aria-pressed', String(userPaused || pause.disabled));
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
    updateEdgeBorders();
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
    syncEdgeRanges();
    refreshPhotoParallax();
    updatePause();
    updateArrows();
  }
  function applyFilters() {
    speed = 0;
    filtered = cards.filter((card) => {
      const start = Number(card.dataset.yearStart),
        end = Number(card.dataset.yearEnd) || start;
      const matchYear =
        !selectedYear ||
        (start && Number(selectedYear) >= start && Number(selectedYear) <= end);
      card.hidden = !((!selectedType || card.dataset.type === selectedType) && matchYear);
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
    balanceCardPhotos();
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
      if (!selectedType) {
        clearYear();
        manualUntil = performance.now() + 3000;
      }
      applyFilters();
    }),
  );
  function clearYear() {
    selectedYear = '';
    years.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    layoutYears();
  }
  function setYear(button, scroll = true) {
    if (scroll) manualUntil = performance.now() + 3000;
    selectedYear = button.dataset.projectYear;
    years.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    layoutYears();
    // На телефоне шкала обычная лента: подкручиваем выбранный год в видимую часть
    if (scroll && yearList && !drumMode.matches) {
      const left = button.offsetLeft - (yearList.clientWidth - button.offsetWidth) / 2;
      yearList.scrollTo({ left, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    applyFilters();
  }
  years.forEach((button) => button.addEventListener('click', () => setYear(button)));
  // Кольцо лет: каждый год встаёт на кратчайшее расстояние от выбранного.
  // Год, перескочивший через край кольца, переставляется без анимации, пока он вне окна
  const drumMode = matchMedia('(min-width: 768px)');
  const activeYear = () => Math.max(0, years.findIndex((b) => b.getAttribute('aria-pressed') === 'true'));
  const yearAt = (shift) => years[(activeYear() + shift + years.length) % years.length];
  function layoutYears() {
    const n = years.length,
      active = activeYear();
    const rowHeight = yearList ? parseFloat(getComputedStyle(yearList).getPropertyValue('--year-row')) || 48 : 48;
    const radius = drumMode.matches && yearList
      ? Math.min(3, Math.max(1, Math.floor((yearList.clientHeight / rowHeight - 1) / 2)))
      : 3;
    const visibleOffsets = [];
    years.forEach((button, i) => {
      let d = (((i - active) % n) + n) % n;
      if (d > n / 2) d -= n;
      const previous = Number(button.dataset.d ?? d);
      button.classList.toggle('projects-years__year--jump', Math.abs(d - previous) > 3);
      button.dataset.d = d;
      button.style.setProperty('--d', d);
      // В окне активный год и не более трёх соседних с каждой стороны.
      button.style.setProperty('--fade', String(Math.min(1, Math.max(0, Math.abs(d) - 1) / Math.max(1, radius - 1))));
      button.classList.toggle('projects-years__year--far', drumMode.matches && Math.abs(d) > radius);
      button.tabIndex = drumMode.matches && Math.abs(d) > radius ? -1 : 0;
      if (Math.abs(d) <= radius) visibleOffsets.push(d);
    });
    if (drumMode.matches && yearList && visibleOffsets.length) {
      const first = Math.min(...visibleOffsets) * rowHeight;
      const last = Math.max(...visibleOffsets) * rowHeight;
      yearList.style.setProperty('--year-line-start', `${first}px`);
      yearList.style.setProperty('--year-line-height', `${last - first}px`);
      const halfHeight = yearList.clientHeight / 2;
      section.style.setProperty('--year-button-top-offset', `${Math.max(0, halfHeight + first - 12)}px`);
      section.style.setProperty('--year-button-bottom-offset', `${Math.max(0, halfHeight - last - 12)}px`);
    }
  }
  function syncYearScroll() {
    if (!yearList) return;
    const drum = drumMode.matches;
    const overflow =
      yearList.scrollHeight > yearList.clientHeight + 1 ||
      yearList.scrollWidth > yearList.clientWidth + 1;
    // Вертикальный барабан забирает колесо всегда, горизонтальная лента на телефоне только при переполнении
    yearList.toggleAttribute('data-lenis-prevent', drum || overflow);
    yearList.classList.toggle('projects-years__list--scrollable', !drum && overflow);
  }
  let wheelSum = 0,
    wheelLock = 0;
  yearList?.addEventListener(
    'wheel',
    (e) => {
      if (!drumMode.matches) return;
      e.preventDefault();
      wheelSum += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      const now = performance.now();
      if (Math.abs(wheelSum) < 40 || now < wheelLock) return;
      const nextYear = yearAt(Math.sign(wheelSum));
      wheelSum = 0;
      wheelLock = now + 140;
      setYear(nextYear);
    },
    { passive: false },
  );
  if (yearList) new ResizeObserver(() => requestAnimationFrame(() => {
    layoutYears();
    syncYearScroll();
  })).observe(yearList);
  window.addEventListener('load', syncYearScroll);
  syncYearScroll();
  yearSteps.forEach((step) =>
    step.addEventListener('click', () => {
      setYear(yearAt(Number(step.dataset.yearsStep)));
    }),
  );
  section.querySelector('[data-projects-reset]').addEventListener('click', () => {
    selectedType = '';
    types.forEach((b, i) => b.setAttribute('aria-pressed', String(i === 0)));
    clearYear();
    manualUntil = performance.now() + 3000;
    applyFilters();
  });
  pause?.addEventListener('click', () => {
    userPaused = !userPaused;
    updatePause();
    wake();
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
      if (rail.hasPointerCapture(pointer.id)) rail.releasePointerCapture(pointer.id);
      pointer = null;
      rail.classList.remove('projects-rail--dragging');
      manualUntil = performance.now() + 2000;
      wake();
    }
    window.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
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
    layoutYears();
    syncLoop();
    wake();
  }).observe(rail);
  syncCardHeights();
  document.fonts.ready.then(() => {
    syncCardHeights(true);
    refreshPhotoParallax();
  });
  clearYear();
  applyFilters();
}
