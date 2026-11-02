export default function init(section) {
  const rail = section.querySelector('[data-projects-rail]');
  const group = section.querySelector('[data-projects-group]');
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
  // Колесо над карточками копит импульс, лента плавно его отрабатывает
  let wheelImpulse = 0;

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
    const wheelStep = wheelImpulse * (1 - Math.exp(-dt / 0.09));
    wheelImpulse -= wheelStep;
    if (Math.abs(wheelImpulse) < 0.5) wheelImpulse = 0;
    // После последней карточки видна копия начала. Возврат к оригиналам незаметен.
    // scrollLeft округляется браузером, поэтому дробную позицию храним отдельно.
    if (Math.abs(speed) > 0.05 || wheelStep) {
      if (Math.abs(rail.scrollLeft - lastWrittenScroll) > 1) autoPosition = rail.scrollLeft;
      autoPosition += speed * dt + wheelStep;
      if (target && autoPosition >= loopDistance) autoPosition %= loopDistance;
      autoPosition = Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, autoPosition));
      rail.scrollLeft = autoPosition;
      lastWrittenScroll = rail.scrollLeft;
    }
    if (
      visible &&
      !document.hidden &&
      (target || wheelImpulse || Math.abs(speed) > 0.05 || performance.now() < manualUntil)
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
      group.getBoundingClientRect().width > rail.clientWidth + 1
    ) {
      // Копируем только первые карточки на ширину окна, а не весь каталог.
      loopGroup = group.cloneNode(false);
      loopGroup.removeAttribute('data-projects-group');
      loopGroup.setAttribute('data-projects-loop', '');
      loopGroup.setAttribute('aria-hidden', 'true');
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      let width = 0;
      for (const card of filtered) {
        const copy = card.cloneNode(true);
        copy.tabIndex = -1;
        copy.removeAttribute('id');
        copy.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
        loopGroup.append(copy);
        width += card.getBoundingClientRect().width + gap;
        if (width >= rail.clientWidth) break;
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
    updatePause();
  }
  function applyFilters() {
    speed = 0;
    wheelImpulse = 0;
    filtered = cards.filter((card) => {
      const start = Number(card.dataset.yearStart),
        end = Number(card.dataset.yearEnd) || start;
      const matchYear =
        !selectedYear ||
        (selectedYear === 'none'
          ? !start
          : start && Number(selectedYear) >= start && Number(selectedYear) <= end);
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
    rail.scrollLeft = 0;
    autoPosition = 0;
    lastWrittenScroll = 0;
    syncLoop();
    if (prev) prev.disabled = filtered.length < 2;
    if (next) next.disabled = filtered.length < 2;
    wake();
  }
  types.forEach((button) =>
    button.addEventListener('click', () => {
      selectedType = button.dataset.projectType;
      types.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      applyFilters();
    }),
  );
  function setYear(button, scroll = true) {
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
  // Кольцо лет: каждый год встаёт на кратчайшее расстояние от выбранного, после «2005» снова идёт «Все».
  // Год, перескочивший через край кольца, переставляется без анимации, пока он вне окна
  const drumMode = matchMedia('(min-width: 768px)');
  const activeYear = () => years.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
  const yearAt = (shift) => years[(activeYear() + shift + years.length) % years.length];
  function layoutYears() {
    const n = years.length,
      active = activeYear();
    years.forEach((button, i) => {
      let d = (((i - active) % n) + n) % n;
      if (d > n / 2) d -= n;
      const previous = Number(button.dataset.d ?? d);
      button.classList.toggle('projects-years__year--jump', Math.abs(d - previous) > 3);
      button.dataset.d = d;
      button.style.setProperty('--d', d);
      // Выбранный и соседние чёткие, ещё по два с каждой стороны размыты, остальные скрыты
      button.style.setProperty('--fade', ['0', '0', '.6', '1'][Math.min(Math.abs(d), 3)]);
      button.classList.toggle('projects-years__year--far', drumMode.matches && Math.abs(d) > 3);
      button.tabIndex = drumMode.matches && Math.abs(d) > 3 ? -1 : 0;
    });
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
  if (yearList) new ResizeObserver(() => requestAnimationFrame(syncYearScroll)).observe(section);
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
    setYear(years[0]);
  });
  pause?.addEventListener('click', () => {
    userPaused = !userPaused;
    updatePause();
    wake();
  });
  function nudge(direction) {
    speed = 0;
    manualUntil = performance.now() + 3500;
    const distance = (filtered[0]?.getBoundingClientRect().width || 350) + 28;
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
    // Мышь над карточками: колесо крутит ленту, а не страницу (Lenis пропускает событие по data-lenis-prevent)
    const syncWheelMode = () => rail.toggleAttribute('data-lenis-prevent', hover.matches);
    syncWheelMode();
    hover.addEventListener('change', syncWheelMode);
    rail.addEventListener(
      'wheel',
      (e) => {
        const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? rail.clientWidth : 1;
        const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
        if (!delta) return;
        // У края ленты колесо отдаём странице
        const room = rail.scrollWidth - rail.clientWidth;
        const stuck = room < 2 || (delta < 0 ? rail.scrollLeft <= 1 : rail.scrollLeft >= room - 1);
        if (!hover.matches || stuck) {
          manualUntil = performance.now() + 3000;
          wake();
          return;
        }
        e.preventDefault();
        wheelImpulse = Math.max(-1600, Math.min(1600, wheelImpulse + delta));
        manualUntil = performance.now() + 2500;
        wake();
      },
      { passive: false },
    );
    rail.addEventListener('dragstart', (e) => e.preventDefault());
    rail.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
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
      if (!pointer || !pointer.mouse) return;
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
    function release() {
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
      visible = entry.isIntersecting;
      wake();
    }).observe(rail);
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
    syncLoop();
    wake();
  }).observe(rail);
  if (years[0]) setYear(years[0], false);
  else applyFilters();
}
