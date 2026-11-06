import createScrollReveal from '../lib/scroll-reveal.js';

function initDisclosures(page) {
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let active;
  let pinned = false;
  let leaveTimer;

  function close() {
    clearTimeout(leaveTimer);
    if (active) active.open = false;
    active = null;
    pinned = false;
  }

  function positionPanel() {
    if (!active) return;
    const panel = active.querySelector('.quality-disclosure__panel');
    const anchor = active.getBoundingClientRect();
    const pad = 12;
    const overflow = anchor.left + panel.offsetWidth + pad - document.documentElement.clientWidth;
    panel.style.left = `-${Math.max(0, overflow)}px`;
    const roomAbove = anchor.top - pad;
    const roomBelow = window.innerHeight - anchor.bottom - pad;
    active.toggleAttribute('data-below', roomAbove < panel.offsetHeight + 8 && roomBelow > roomAbove);
  }

  function open(details, persist) {
    close();
    active = details;
    pinned = persist;
    details.open = true;
    positionPanel();
  }

  page.classList.add('is-enhanced');
  page.querySelectorAll('.quality-disclosure').forEach((details) => {
    const summary = details.querySelector('summary');
    details.addEventListener('pointerenter', (event) => {
      if (!hover.matches || event.pointerType !== 'mouse') return;
      if (active === details) clearTimeout(leaveTimer);
      else if (!pinned) open(details, false);
    });

    details.addEventListener('pointerleave', () => {
      if (active === details && !pinned) leaveTimer = setTimeout(close, 180);
    });

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      if (active === details && pinned) close();
      else open(details, true);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (active && !active.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  window.addEventListener('resize', positionPanel);
}

export default function init(page) {
  initDisclosures(page);
  const footer = document.querySelector('[data-quality-footer]');
  const { add, start } = createScrollReveal('quality', { rootMargin: '0px' });
  add(page, '.quality-heading', 'heading');
  add(page, '.quality-feature__goal', 'text', 70);
  add(page, '.quality-approach h2', 'text', 100);
  add(footer, '.site-footer__nav, .site-footer__right > h2', 'heading');
  add(footer, '.site-footer__contact-group, .site-footer__office', 'text');
  start();
}
