export default function init() {
  const root = document.documentElement;
  const preloader = document.querySelector('[data-ui~=preloader]');
  const lockup = document.querySelector('[data-ui~=preloader__lockup]');
  const wordmark = document.querySelector('[data-ui~=wordmark]');
  const burger = document.querySelector('[data-ui~=header__burger]');
  const menu = document.querySelector('[data-mobile-menu]');
  const dock = document.querySelector('[data-ui~=dock]');
  const dockBurger = document.querySelector('[data-ui~=dock__burger]');

  // Раскрывающаяся панель в доке работает только на десктопе с мышью; иначе бургер открывает полноэкранное меню
  const desktopDock = window.matchMedia('(min-width: 1101px)');
  const canHover = window.matchMedia('(hover: hover)');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entryAnchor = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';

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
    root.classList.add('site--loaded');
    root.classList.remove('site--locked');
    document.dispatchEvent(new Event('site:scroll-lock-change'));
    // Возврат со страницы объекта ведёт к каталогу на главной.
    // При обычном обновлении прежнее поведение превью (начало сверху) сохранено.
    if (entryAnchor && !isReload) entryAnchor.scrollIntoView({ behavior: 'instant' });
    requestAnimationFrame(updateScrollState);
  }

  async function runPreloader() {
    if (reducedMotion || !preloader) {
      preloader && preloader.remove();
      root.classList.remove('site--preloading');
      finishLoading();
      return;
    }

    await Promise.all([pageLoaded, fontsReady, wait(MIN_DURATION)]);

    lockup.classList.add('preloader__lockup--out');
    await wait(LOCKUP_OUT - 100);

    preloader.classList.add('preloader--leaving');
    finishLoading();
    await wait(CURTAIN_UP);

    preloader.remove();
    root.classList.remove('site--preloading');
  }

  if (preloader) {
    root.classList.add('site--locked', 'site--preloading');
    root.classList.remove('site--loaded');
  }
  const releasePreloader = () => {
    preloader?.remove();
    root.classList.remove('site--preloading', 'site--locked');
    root.classList.add('site--loaded');
  };
  const watchdog = setTimeout(releasePreloader, 8000);
  runPreloader()
    .catch((error) => {
      console.error('preloader', error);
      releasePreloader();
    })
    .finally(() => clearTimeout(watchdog));

  // ---------- Скролл: разворот букв и сворачивание шапки в бургер ----------

  let scrolled = false;
  let headerHideAfter = 10;
  let wordmarkHidden = false;
  let previousScrollY = window.scrollY;
  let travel = 0;
  let direction = 0;
  const hero = wordmark?.closest('[data-ui~=hero]');
  let heroBottom = 0;
  let heroHeight = 0;

  function measureHero() {
    if (!hero) return;
    heroHeight = hero.offsetHeight;
    heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
  }
  measureHero();
  if (hero) new ResizeObserver(measureHero).observe(hero);

  function updateWordmark(y) {
    const delta = y - previousScrollY;
    previousScrollY = y;
    if (Math.abs(delta) < 0.1) return;
    const nextDirection = Math.sign(delta);
    if (nextDirection !== direction) travel = 0;
    direction = nextDirection;
    travel += Math.abs(delta);
    if (!wordmark) return;

    // Вниз даём сначала немного пройти по хиро. Вверх раскрываем буквы,
    // когда нижняя часть хиро уже заняла четверть экрана, а не только у верха.
    const hideAfter = Math.max(90, heroHeight * 0.12);
    const returningToHero = heroBottom - y >= window.innerHeight * 0.25;
    if (!wordmarkHidden && direction > 0 && y > hideAfter && travel > 70) {
      wordmarkHidden = true;
    } else if (wordmarkHidden && ((direction < 0 && travel > 16 && returningToHero) || y <= 10)) {
      wordmarkHidden = false;
    }
    wordmark.classList.toggle('wordmark--flipped', wordmarkHidden);
  }

  // Буквы и шапка имеют независимые пороги. Ориентируемся на реальный
  // сглаженный скролл, а не на первый импульс колёсика.
  function updateScrollState() {
    if (!root.classList.contains('site--loaded')) return;
    updateWordmark(window.scrollY);

    // Инерция скролла не должна перебивать наведение или работу с клавиатуры.
    // Вне меню сохраняем прежнее закрытие при прокрутке после открытия кликом.
    const dockEngaged =
      (canHover.matches && dock.matches(':hover')) || dock.querySelector(':focus-visible');
    if (
      dock.classList.contains('dock--open') &&
      !dockEngaged &&
      Math.abs(window.scrollY - dockOpenedAt) > 30
    ) {
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
    root.classList.toggle('site--scrolled', scrolled);
    if (!scrolled) setDock(false);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  // ---------- Dock: панель раскрывается при наведении на бургер ----------

  let closeTimer = null;
  let dockOpenedAt = 0;

  function setDock(open) {
    clearTimeout(closeTimer);
    if (open && !dock.classList.contains('dock--open')) dockOpenedAt = window.scrollY;
    dock.classList.toggle('dock--open', open);
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
    else setDock(!dock.classList.contains('dock--open'));
  });

  document.addEventListener('click', (e) => {
    if (dock.classList.contains('dock--open') && !dock.contains(e.target)) setDock(false);
  });

  desktopDock.addEventListener('change', () => setDock(false));

  // ---------- Полноэкранное меню (планшет и телефон) ----------

  let menuOpener;
  function setMenu(open) {
    if (open) menuOpener = document.activeElement;
    menu.hidden = !open;
    [burger, dockBurger].forEach((btn) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    root.classList.toggle('site--locked', open);
    document.dispatchEvent(new Event('site:scroll-lock-change'));
    if (open) menu.querySelector('a,button')?.focus({ preventScroll: true });
    else if (menuOpener?.isConnected) menuOpener.focus({ preventScroll: true });
  }

  // The menu is a modal surface on touch widths; keep keyboard focus inside.
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')];
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  burger.addEventListener('click', () => setMenu(menu.hidden));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!menu.hidden) {
      setMenu(false);
      (scrolled ? dockBurger : burger).focus();
    } else if (dock.classList.contains('dock--open')) {
      setDock(false);
      dockBurger.focus();
    }
  });
}
