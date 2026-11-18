import initQuotes from './home-team-quote.js';

export default function init(people) {
  const pages = [...people.querySelectorAll('[data-home-team-page]')];
  const controls = people.querySelector('[data-home-team-controls]');
  const viewport = people.querySelector('[data-home-team-viewport]');
  const count = controls.querySelector('[data-home-team-count]');
  const previous = controls.querySelector('[data-home-team-step="-1"]');
  const next = controls.querySelector('[data-home-team-step="1"]');
  const pageEnds = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let total = 0;
  let current = -1;
  let gesture;
  let suppressClick = false;

  for (const page of pages) {
    total += page.children.length;
    pageEnds.push(total);
  }

  function updateCount() {
    const top = viewport.scrollTop;
    const maxTop = viewport.scrollHeight - viewport.clientHeight;
    const index = maxTop > 0 && top >= maxTop - 1
      ? pages.length - 1
      : Math.max(0, pages.findLastIndex((page) => page.offsetTop <= top + 1));
    if (current === index) return;
    current = index;
    previous.setAttribute('aria-disabled', index === 0);
    next.setAttribute('aria-disabled', index === pages.length - 1);
    const first = (pageEnds[index - 1] ?? 0) + 1;
    count.textContent = `${first}–${pageEnds[index]} из ${total}`;
  }

  function step(direction, instant = false) {
    const page = pages[current + direction];
    if (!page) return;
    viewport.scrollTo({ top: page.offsetTop, behavior: instant || reduced.matches ? 'instant' : 'smooth' });
  }

  viewport.addEventListener('scroll', updateCount, { passive: true });
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  controls.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    step(event.key === 'ArrowUp' ? -1 : 1, true);
  });

  // Give a new outward swipe to the page even on browsers that latch it to the list.
  viewport.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const atTop = viewport.scrollTop <= 1;
    const atBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
    if (!atTop && !atBottom) return;
    const first = event.touches[0];
    let lastY = first.clientY;
    let scrollingPage = false;
    const listeners = new AbortController();
    function move(event) {
      if (event.touches.length !== 1 || !event.cancelable) {
        listeners.abort();
        return;
      }
      const touch = event.touches[0];
      const dy = lastY - touch.clientY;
      if (!scrollingPage) {
        const dx = first.clientX - touch.clientX;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 4) return;
        if (Math.abs(dx) >= Math.abs(dy) || !(dy < 0 ? atTop : atBottom)) {
          listeners.abort();
          return;
        }
        scrollingPage = true;
      }
      event.preventDefault();
      scrollBy({ top: dy, behavior: 'instant' });
      lastY = touch.clientY;
    }
    viewport.addEventListener('touchmove', move, { passive: false, signal: listeners.signal });
    for (const type of ['touchend', 'touchcancel']) {
      viewport.addEventListener(type, () => listeners.abort(), { signal: listeners.signal });
    }
  }, { passive: true });

  viewport.addEventListener('dragstart', (event) => event.preventDefault());
  viewport.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    if (event.pointerType !== 'mouse') return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      top: viewport.scrollTop,
      dragging: false,
    };
  });

  addEventListener('pointermove', (event) => {
    if (gesture?.id !== event.pointerId) return;
    const x = event.clientX - gesture.x;
    const y = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 8) return;
      if (Math.abs(x) >= Math.abs(y)) {
        gesture = null;
        return;
      }
      gesture.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.dataset.dragging = '';
    }
    event.preventDefault();
    viewport.scrollTop = gesture.top - y;
  });

  function finishGesture(event) {
    if (!gesture || (event.pointerId !== undefined && gesture.id !== event.pointerId)) return;
    const { id, dragging } = gesture;
    gesture = null;
    if (!dragging) return;
    suppressClick = true;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    delete viewport.dataset.dragging;
  }

  addEventListener('pointerup', finishGesture);
  addEventListener('pointercancel', finishGesture);
  addEventListener('blur', finishGesture);
  viewport.addEventListener('lostpointercapture', (event) => {
    if (event.target === viewport) finishGesture(event);
  });
  viewport.addEventListener('click', (event) => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  people.dataset.enhanced = '';
  viewport.tabIndex = 0;
  new ResizeObserver(updateCount).observe(viewport);
  updateCount();
  controls.inert = false;
  initQuotes(people);
}
