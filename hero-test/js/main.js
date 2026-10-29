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

  const MIN_DURATION = 3900; // обводки → жёлтая заливка → серая заливка → куб и надпись → пауза
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

  // Классы меняются только при пересечении порога, поэтому обработчик дешёвый и не требует requestAnimationFrame
  function updateScrollState() {
    if (!root.classList.contains('is-loaded')) return;

    // Открытая плашка закрывается, как только страницу прокрутили, даже если её открыли кликом
    if (dock.classList.contains('is-open') && Math.abs(window.scrollY - dockOpenedAt) > 30) {
      setDock(false);
    }

    const isScrolled = window.scrollY > 10;
    if (isScrolled === scrolled) return;
    scrolled = isScrolled;
    wordmark.classList.toggle('is-flipped', scrolled);
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
    closeTimer = setTimeout(() => setDock(false), 280);
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
