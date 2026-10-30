(function () {
  const root = document.documentElement;
  const preloader = document.querySelector('.preloader');
  const lockup = document.querySelector('.preloader__lockup');
  const wordmark = document.querySelector('.wordmark');
  const burger = document.querySelector('.header__burger');
  const menu = document.getElementById('mobile-menu');
  const dock = document.querySelector('.dock');
  const dockBurger = document.querySelector('.dock__burger');

  // Раскрывающаяся панель в доке работает только на десктопе с мышью; иначе бургер открывает полноэкранное меню
  const desktopDock = window.matchMedia('(min-width: 1101px)');
  const canHover = window.matchMedia('(hover: hover)');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Превью должно открывать именно первый экран, поэтому при обновлении всегда стартуем сверху
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // ---------- Preloader ----------

  const MIN_DURATION = 3600; // обводки → жёлтая заливка → белый куб → сдвиг к центру с надписью → короткая пауза
  const LOCKUP_OUT = 450;
  const CURTAIN_UP = 950;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const pageLoaded = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, { once: true });
  });

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  function finishLoading() {
    root.classList.add('is-loaded');
    root.classList.remove('is-locked');
    document.dispatchEvent(new Event('site:scroll-lock-change'));
  }

  async function runPreloader() {
    if (reducedMotion || !preloader) {
      preloader && preloader.remove();
      finishLoading();
      return;
    }

    await Promise.all([pageLoaded, fontsReady, wait(MIN_DURATION)]);

    lockup.classList.add('is-out');
    await wait(LOCKUP_OUT - 100);

    preloader.classList.add('is-leaving');
    finishLoading();
    await wait(CURTAIN_UP);

    preloader.remove();
  }

  runPreloader();

  // ---------- Скролл: разворот букв и сворачивание шапки в бургер ----------

  let scrolled = false;
  let headerHideAfter = 10;
  let wordmarkHidden = false;
  let previousScrollY = window.scrollY;
  let travel = 0;
  let direction = 0;
  const hero = wordmark.closest('.hero');
  let heroBottom = 0;
  let heroHeight = 0;

  function measureHero() {
    heroHeight = hero.offsetHeight;
    heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
  }
  measureHero();
  new ResizeObserver(measureHero).observe(hero);

  function updateWordmark(y) {
    const delta = y - previousScrollY;
    previousScrollY = y;
    if (Math.abs(delta) < 0.1) return;
    const nextDirection = Math.sign(delta);
    if (nextDirection !== direction) travel = 0;
    direction = nextDirection;
    travel += Math.abs(delta);

    // Вниз даём сначала немного пройти по хиро. Вверх раскрываем буквы,
    // когда нижняя часть хиро уже заняла четверть экрана, а не только у верха.
    const hideAfter = Math.max(90, heroHeight * 0.12);
    const returningToHero = heroBottom - y >= window.innerHeight * 0.25;
    if (!wordmarkHidden && direction > 0 && y > hideAfter && travel > 70) {
      wordmarkHidden = true;
    } else if (wordmarkHidden && ((direction < 0 && travel > 16 && returningToHero) || y <= 10)) {
      wordmarkHidden = false;
    }
    wordmark.classList.toggle('is-flipped', wordmarkHidden);
  }

  // Буквы и шапка имеют независимые пороги. Ориентируемся на реальный
  // сглаженный скролл, а не на первый импульс колёсика.
  function updateScrollState() {
    if (!root.classList.contains('is-loaded')) return;
    updateWordmark(window.scrollY);

    // Инерция скролла не должна перебивать наведение или работу с клавиатуры.
    // Вне меню сохраняем прежнее закрытие при прокрутке после открытия кликом.
    const dockEngaged = (canHover.matches && dock.matches(':hover')) || dock.querySelector(':focus-visible');
    if (dock.classList.contains('is-open') && !dockEngaged && Math.abs(window.scrollY - dockOpenedAt) > 30) {
      setDock(false);
    }

    const y = window.scrollY;
    let isScrolled = scrolled;
    if (scrolled) {
      // Не ждём последних пикселей затухающего скролла. Небольшой ход вверх
      // отличает возвращение от дрожания колеса в начале движения вниз.
      if (y <= 10 || (y <= 70 && direction < 0 && travel > 12)) {
        isScrolled = false;
        headerHideAfter = y + 48;
      }
    } else {
      // После появления нужен новый заметный жест вниз, чтобы снова скрыть
      // шапку. Это исключает мигание около порога её возвращения.
      headerHideAfter = Math.min(headerHideAfter, y + 48);
      isScrolled = y > headerHideAfter;
    }
    if (isScrolled === scrolled) return;
    scrolled = isScrolled;
    root.classList.toggle('is-scrolled', scrolled);
    if (!scrolled) setDock(false);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  // ---------- Dock: панель раскрывается при наведении на бургер ----------

  let closeTimer = null;
  let dockOpenedAt = 0;

  function setDock(open) {
    clearTimeout(closeTimer);
    if (open && !dock.classList.contains('is-open')) dockOpenedAt = window.scrollY;
    dock.classList.toggle('is-open', open);
    dockBurger.setAttribute('aria-expanded', String(open));
    dockBurger.setAttribute('aria-label', open ? 'Скрыть меню' : 'Открыть меню');
  }

  const dockMode = () => desktopDock.matches;

  dock.addEventListener('mouseenter', () => {
    if (dockMode() && canHover.matches) setDock(true);
  });

  dock.addEventListener('mouseleave', () => {
    // Открытой оставляем только при навигации с клавиатуры; после клика мышью фокус на бургере не держит плашку
    if (!dockMode() || dock.querySelector(':focus-visible')) return;
    // Небольшая задержка, чтобы панель не схлопывалась, если курсор чуть промахнулся
    closeTimer = setTimeout(() => setDock(false), 200);
  });

  dock.addEventListener('focusin', () => {
    if (dockMode() && dock.querySelector(':focus-visible')) setDock(true);
  });

  dock.addEventListener('focusout', (e) => {
    if (dockMode() && !dock.contains(e.relatedTarget) && !dock.matches(':hover')) setDock(false);
  });

  dockBurger.addEventListener('click', () => {
    if (!dockMode()) return setMenu(menu.hidden);
    // С мышью плашка уже раскрыта наведением, клик её не схлопывает; без наведения (тачскрин, клавиатура) клик переключает
    if (canHover.matches && dock.matches(':hover')) setDock(true);
    else setDock(!dock.classList.contains('is-open'));
  });

  document.addEventListener('click', (e) => {
    if (dock.classList.contains('is-open') && !dock.contains(e.target)) setDock(false);
  });

  desktopDock.addEventListener('change', () => setDock(false));

  // ---------- Полноэкранное меню (планшет и телефон) ----------

  function setMenu(open) {
    menu.hidden = !open;
    [burger, dockBurger].forEach((btn) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    root.classList.toggle('is-locked', open);
    document.dispatchEvent(new Event('site:scroll-lock-change'));
  }

  burger.addEventListener('click', () => setMenu(menu.hidden));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) {
      setMenu(false);
      (scrolled ? dockBurger : burger).focus();
    } else if (dock.classList.contains('is-open')) {
      setDock(false);
      dockBurger.focus();
    }
  });
})();
