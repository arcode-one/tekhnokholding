import initDock from './dock.js';
import restoreReloadPosition from '../lib/reload-position.js';

export default function init() {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const wordmark = document.querySelector('[data-ui~=wordmark]');
  const burger = document.querySelector('[data-ui~=header__burger]');
  const menu = document.querySelector('[data-mobile-menu]');
  const dock = document.querySelector('[data-ui~=dock]');
  const dockBurger = document.querySelector('[data-ui~=dock__burger]');
  const dockMenu = initDock(dock);

  let entryAnchor = null;
  try { entryAnchor = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;

  // Let the browser restore the reading position on reload and history navigation.
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  restoreReloadPosition(root);

  root.classList.add('site--loaded');
  requestAnimationFrame(() => {
    if (entryAnchor && navigationType !== 'reload' && navigationType !== 'back_forward')
      entryAnchor.scrollIntoView({ behavior: 'instant' });
    updateScrollState();
  });

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
    header.inert = scrolled;
    dockMenu.setVisible(scrolled);
    root.classList.toggle('site--scrolled', scrolled);
  }

  window.addEventListener('scroll', updateScrollState, { passive: true });

  dockBurger.addEventListener('click', () => {
    if (!dockMenu.isDesktop()) setMenu(menu.hidden);
  });

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
    }
  });
}
