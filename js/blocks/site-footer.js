import { onMotionResize } from '../lib/scroll-motion.js';

function initContactsAnchor(footer, reduced) {
  const root = document.documentElement;
  let active;
  let scheduleAlignment;

  function followAnchor() {
    active?.abort();
    const controller = new AbortController();
    active = controller;
    const { signal } = controller;
    let timer;
    let landed = false;

    function align() {
      if (location.hash !== '#contacts' || root.classList.contains('site--locked')) return;
      const scroller = document.scrollingElement;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const top = Math.max(0, Math.min(max, scrollY + footer.getBoundingClientRect().top));
      if (Math.abs(scrollY - top) <= 1) {
        landed = true;
        return;
      }
      scrollTo({ top, behavior: landed || reduced.matches ? 'instant' : 'smooth' });
    }

    // Allow the native smooth scroll to finish before correcting layout shifts.
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(align, 120);
    }

    scheduleAlignment = schedule;
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      scheduleAlignment = undefined;
    }, { once: true });
    addEventListener('scroll', () => {
      if (!landed) schedule();
    }, { passive: true, signal });
    addEventListener('hashchange', () => {
      if (location.hash !== '#contacts') controller.abort();
    }, { signal });
    for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'pagehide']) {
      addEventListener(event, () => controller.abort(), { passive: true, signal });
    }
    document.addEventListener('site:scroll-lock-change', schedule, { signal });
    schedule();
  }

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (link && link.hash === '#contacts' && link.origin === location.origin &&
        link.pathname === location.pathname && link.search === location.search &&
        (!link.target || link.target === '_self')) followAnchor();
  });

  const navigation = performance.getEntriesByType('navigation')[0]?.type;
  if (location.hash === '#contacts' && navigation === 'navigate' && !root.dataset.returnedToSource) {
    followAnchor();
  }
  return () => scheduleAlignment?.();
}

export default function init(footer) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const alignContacts = initContactsAnchor(footer, reduced);
  const image = footer.querySelector('.site-footer__visual img');
  const layout = footer.querySelector('.site-footer__layout');
  if (!image || !layout) return;
  // Contacts scroll with the document. Only the photograph has parallax.
  layout.style.removeProperty('top');
  const desktop = matchMedia('(min-width:768px)');
  let visible = false;
  let frame = 0;
  let distance = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function render() {
    frame = 0;
    if (!desktop.matches || reduced.matches) {
      image.style.transform = '';
      return;
    }
    // Earlier sections can change height after an anchor jump. Read the current
    // position, and never move the photo beyond the visible bottom of the footer.
    const bounds = footer.getBoundingClientRect();
    const progress = clamp((innerHeight - bounds.top) / innerHeight);
    const offset = Math.min(
      Math.round((1 - progress) * distance),
      Math.max(0, bounds.bottom - innerHeight),
    );
    image.style.transform = `translateY(${-offset}px)`;
  }
  function measure() {
    distance = image.offsetHeight * 0.5;
    render();
  }
  function schedule() {
    if (visible && desktop.matches && !reduced.matches && !document.hidden && !frame)
      frame = requestAnimationFrame(render);
  }
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) measure();
    },
    { rootMargin: '100px' },
  ).observe(footer);
  addEventListener('scroll', schedule, { passive: true });
  onMotionResize(measure);
  reduced.addEventListener('change', measure);
  desktop.addEventListener('change', measure);
  const resizeObserver = new ResizeObserver(() => {
    measure();
    alignContacts();
  });
  resizeObserver.observe(footer);
  resizeObserver.observe(document.body);
  document.fonts?.ready.then(measure);
}
