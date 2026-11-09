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
  let heroTop = 0;
  let viewportHeight = window.innerHeight;
  let heroScrollObserver;
  const touchHero = hero && document.body.classList.contains('home-page--touch');

  function measureHero() {
    if (!hero) return;
    heroHeight = hero.offsetHeight;
    heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
    heroTop = heroBottom - heroHeight;
    viewportHeight = window.innerHeight;
    if (touchHero) {
      heroScrollObserver?.disconnect();
      // Observer geometry arrives from layout without synchronous scroll reads.
      // Outside the hero the header needs no per-frame work at all.
      const steps = Math.max(1, Math.ceil(heroHeight / 12));
      heroScrollObserver = new IntersectionObserver(([entry]) => {
        updateScrollState(heroTop - entry.boundingClientRect.top);
      }, {
        rootMargin: `0px 0px ${heroHeight}px 0px`,
        threshold: Array.from({ length: steps + 1 }, (_, index) => index / steps),
      });
      heroScrollObserver.observe(hero);
    }
  }
  measureHero();
  if (hero) new ResizeObserver(measureHero).observe(hero);

  function updateWordmark(y) {
    const wasHidden = wordmarkHidden;
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
    const returningToHero = heroBottom - y >= viewportHeight * 0.25;
    if (!wordmarkHidden && direction > 0 && y > hideAfter && travel > 70) {
      wordmarkHidden = true;
    } else if (wordmarkHidden && ((direction < 0 && travel > 16 && returningToHero) || y <= 10)) {
      wordmarkHidden = false;
    }
    if (wasHidden !== wordmarkHidden)
      wordmark.classList.toggle('wordmark--flipped', wordmarkHidden);
  }

  // Буквы и шапка имеют независимые пороги. Ориентируемся на реальный
  // сглаженный скролл, а не на первый импульс колёсика.
  function updateScrollState(position) {
    if (!root.classList.contains('site--loaded')) return;
    const y = typeof position === 'number' ? position : window.scrollY;
    updateWordmark(y);
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

  if (!touchHero) window.addEventListener('scroll', updateScrollState, { passive: true });

  dockBurger.addEventListener('click', () => {
    if (!dockMenu.isDesktop()) setMenu(!menuOpen, { opener: dockBurger });
  });

  // ---------- Полноэкранное меню (планшет и телефон) ----------

  const menuLogo = new URL('../../icons/logo-dark-compact.svg', import.meta.url);
  const home = header.querySelector('.header__logo').href;
  menu.insertAdjacentHTML('afterbegin', `
    <div class="menu__header">
      <a class="menu__logo" href="${home}" aria-label="Технохолдинг, на главную">
        <img src="${menuLogo}" alt="" width="1292" height="430">
      </a>
      <div class="header__messengers">
        <button class="icon-btn menu__close" type="button" aria-label="Закрыть меню">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
    </div>
  `);
  const menuClose = menu.querySelector('.menu__close');
  header.querySelectorAll('.header__messengers > a').forEach((link) => {
    menuClose.before(link.cloneNode(true));
  });

  let menuOpener;
  let menuOpen = false;
  let closeTimer = 0;
  let restoreMenuFocus = true;
  const reduceMenuMotion = matchMedia('(prefers-reduced-motion: reduce)');
  menu.querySelectorAll('.menu__nav > a').forEach((link, index) => {
    link.style.setProperty('--menu-order', index);
  });

  function finishMenuClose() {
    if (menuOpen || menu.hidden) return;
    clearTimeout(closeTimer);
    menu.hidden = true;
    root.classList.remove('site--locked');
    document.dispatchEvent(new Event('site:scroll-lock-change'));
    if (restoreMenuFocus && menuOpener?.isConnected)
      menuOpener.focus({ preventScroll: true });
  }

  function setMenu(open, { restoreFocus = true, opener } = {}) {
    if (open === menuOpen) return;
    clearTimeout(closeTimer);
    menuOpen = open;
    restoreMenuFocus = restoreFocus;
    if (open && menu.hidden) {
      menuOpener = opener || document.activeElement;
      menu.dataset.menuState = 'closed';
      menu.hidden = false;
      menu.scrollTop = 0;
      // Establish the initial state once; subsequent interruptions reverse the
      // CSS transition from its current position rather than restarting it.
      if (!reduceMenuMotion.matches) void menu.offsetWidth;
    }
    menu.inert = !open;
    menu.dataset.menuState = open ? 'open' : 'closed';
    [burger, dockBurger].forEach((btn) => {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    if (open) {
      root.classList.add('site--locked');
      document.dispatchEvent(new Event('site:scroll-lock-change'));
      menu.querySelector('.menu__nav a')?.focus({ preventScroll: true });
    } else if (reduceMenuMotion.matches) finishMenuClose();
    else closeTimer = setTimeout(finishMenuClose, 280);
  }

  menu.addEventListener('transitionend', (event) => {
    if (event.target === menu && event.propertyName === 'opacity') finishMenuClose();
  });
  reduceMenuMotion.addEventListener('change', () => {
    if (reduceMenuMotion.matches) finishMenuClose();
  });

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

  burger.addEventListener('click', () => setMenu(!menuOpen, { opener: burger }));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a, .menu__close'))
      setMenu(false, { restoreFocus: !e.target.closest('a') });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuOpen) setMenu(false);
  });
}
