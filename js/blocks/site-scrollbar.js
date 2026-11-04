export default function init() {
  if (document.querySelector('[data-site-scrollbar]')) return;
  const root = document.documentElement;
  const desktop = matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)');
  const forcedColors = matchMedia('(forced-colors:active)');
  const bar = document.createElement('div');
  const thumb = document.createElement('div');
  bar.className = 'site-scrollbar';
  bar.dataset.siteScrollbar = '';
  bar.hidden = true;
  bar.tabIndex = 0;
  bar.setAttribute('role', 'scrollbar');
  bar.setAttribute('aria-label', 'Прокрутка страницы');
  bar.setAttribute('aria-orientation', 'vertical');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  thumb.className = 'site-scrollbar__thumb';
  thumb.setAttribute('aria-hidden', 'true');
  bar.append(thumb);
  const content = document.querySelector('body > main') || document.body;
  if (!content.id) content.id = 'page-content';
  bar.setAttribute('aria-controls', content.id);
  document.body.append(bar);
  let limit = 0,
    travel = 0,
    thumbHeight = 0,
    enabled = false;
  let renderFrame = 0,
    measureFrame = 0,
    drag = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const locked = () =>
    root.classList.contains('site--locked') ||
    document.hidden;
  function render() {
    renderFrame = 0;
    if (bar.hidden) return;
    const progress = limit ? clamp(scrollY / limit, 0, 1) : 0;
    thumb.style.transform = `translate3d(0,${progress * travel}px,0)`;
    const percent = String(Math.round(progress * 100));
    bar.setAttribute('aria-valuenow', percent);
    bar.setAttribute('aria-valuetext', `${percent}%`);
  }
  function scheduleRender() {
    if (!renderFrame) renderFrame = requestAnimationFrame(render);
  }
  function finishDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    bar.classList.remove('site-scrollbar--dragging');
    root.classList.remove('site--scrollbar-dragging');
    if (bar.hasPointerCapture(id)) bar.releasePointerCapture(id);
  }
  function measure() {
    measureFrame = 0;
    enabled = desktop.matches && !forcedColors.matches;
    root.classList.toggle('site--custom-scrollbar', enabled);
    limit = Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
    bar.hidden = !enabled || limit <= 0 || locked();
    if (bar.hidden) {
      finishDrag();
      return;
    }
    const height = bar.clientHeight;
    // Keep the thumb usable on small windows.
    const minimum = Math.min(200, height / 2);
    thumbHeight = clamp(height - limit, minimum, height);
    travel = height - thumbHeight;
    thumb.style.height = `${thumbHeight}px`;
    if (drag) {
      drag.startY = drag.lastY;
      drag.startScroll = scrollY;
    }
    render();
  }
  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function moveTo(value) {
    if (!enabled || locked()) return;
    const top = clamp(value, 0, limit);
    scrollTo({ top, behavior: 'instant' });
    scheduleRender();
  }
  bar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || locked() || !enabled || !travel) return;
    event.preventDefault();
    bar.focus({ preventScroll: true });
    // Останавливаем накопленную инерцию перед захватом ползунка.
    moveTo(scrollY);
    let startScroll = scrollY;
    if (event.target !== thumb) {
      startScroll =
        clamp((event.clientY - bar.getBoundingClientRect().top - thumbHeight / 2) / travel, 0, 1) *
        limit;
      moveTo(startScroll);
    }
    drag = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, startScroll };
    bar.setPointerCapture(event.pointerId);
    bar.classList.add('site-scrollbar--dragging');
    root.classList.add('site--scrollbar-dragging');
  });
  bar.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id || !travel) return;
    if (locked()) {
      finishDrag();
      return;
    }
    event.preventDefault();
    drag.lastY = event.clientY;
    moveTo(drag.startScroll + ((event.clientY - drag.startY) * limit) / travel);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) =>
    bar.addEventListener(name, finishDrag),
  );
  addEventListener('blur', finishDrag);
  bar.addEventListener('keydown', (event) => {
    const moves = {
      ArrowUp: -60,
      ArrowDown: 60,
      PageUp: -innerHeight * 0.9,
      PageDown: innerHeight * 0.9,
    };
    let target;
    if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = limit;
    else if (Object.hasOwn(moves, event.key)) target = scrollY + moves[event.key];
    else return;
    event.preventDefault();
    moveTo(target);
  });
  addEventListener('scroll', scheduleRender, { passive: true });
  addEventListener('resize', scheduleMeasure, { passive: true });
  addEventListener('load', scheduleMeasure, { once: true });
  document.addEventListener('visibilitychange', () => {
    finishDrag();
    scheduleMeasure();
  });
  new ResizeObserver(scheduleMeasure).observe(document.body);
  new MutationObserver(() => {
    const hidden = !enabled || limit <= 0 || locked();
    const wasHidden = bar.hidden;
    bar.hidden = hidden;
    if (hidden) finishDrag();
    else if (wasHidden) scheduleMeasure();
    else scheduleRender();
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  desktop.addEventListener('change', scheduleMeasure);
  forcedColors.addEventListener('change', scheduleMeasure);
  document.fonts?.ready.then(scheduleMeasure);
  measure();
}
