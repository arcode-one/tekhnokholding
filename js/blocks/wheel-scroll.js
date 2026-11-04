// Smooth only the document's wheel input; keep the real browser scroll position.
const WHEEL_SCALE = 0.4;
const DURATION_MS = 320;
const MAX_PENDING_VIEWPORTS = 0.5;

export default function init() {
  // Local A/B check: compare browser scrolling without changing the site default.
  if (['localhost', '127.0.0.1'].includes(location.hostname) &&
      new URLSearchParams(location.search).get('scroll') === 'native') return;
  const root = document.documentElement;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let current = scrollY;
  let target = current;
  let start = current;
  let elapsed = 0;
  let written = current;
  let lastTime = 0;
  let limit = 0;
  let lineHeight = 16;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const locked = () => document.hidden || root.classList.contains('site--locked') ||
    root.classList.contains('site--scrollbar-dragging');

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    current = target = start = written = scrollY;
    elapsed = 0;
  }

  function measure() {
    limit = Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
    lineHeight = parseFloat(getComputedStyle(document.body).lineHeight) || 16;
    target = clamp(target, 0, limit);
  }

  function tick(now) {
    if (locked()) {
      stop();
      return;
    }
    // Bound a slow frame so returning from a busy main thread cannot jump ahead.
    const delta = Math.min(now - lastTime, 32);
    lastTime = now;
    // A bounded ease-out avoids the old long, pixel-by-pixel exponential tail.
    elapsed = Math.min(elapsed + delta, DURATION_MS);
    const progress = elapsed / DURATION_MS;
    current = start + (target - start) * (1 - (1 - progress) ** 2);
    const ratio = devicePixelRatio || 1;
    const settled = progress === 1 || Math.abs(target - current) < 0.5 / ratio;
    if (settled) current = target;
    const top = Math.round(current * ratio) / ratio;
    if (top !== written) scrollTo({ top, behavior: 'instant' });
    written = scrollY;
    frame = settled ? 0 : requestAnimationFrame(tick);
  }

  function usesNativeScroll(event, delta) {
    for (const element of event.composedPath()) {
      if (element === document.body || element === root) break;
      if (!(element instanceof HTMLElement)) continue;
      if (element.matches('input, textarea, select') || element.isContentEditable) return true;
      if (element.scrollHeight <= element.clientHeight + 1) continue;
      const style = getComputedStyle(element);
      if (!/^(auto|scroll|overlay)$/.test(style.overflowY)) continue;
      const canMove = delta < 0
        ? element.scrollTop > 0
        : element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      if (canMove || /^(contain|none)$/.test(style.overscrollBehaviorY)) return true;
    }
    return false;
  }

  function onWheel(event) {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey ||
        event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || locked()) {
      stop();
      return;
    }
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? lineHeight
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? innerHeight : 1;
    const delta = event.deltaY * unit * WHEEL_SCALE;
    if (!delta) return;
    if (usesNativeScroll(event, delta)) {
      stop();
      return;
    }

    // A new gesture starts at the actual position, including after anchors or dragging.
    if (!frame) current = target = scrollY;
    const pending = innerHeight * MAX_PENDING_VIEWPORTS;
    const reversing = (target - current) * delta < 0;
    const next = clamp(
      clamp((reversing ? current : target) + delta, current - pending, current + pending),
      0, limit,
    );
    if (!frame && next === current) return;
    event.preventDefault();
    start = current;
    elapsed = 0;
    target = next;
    if (!frame) {
      // Cancel a browser-driven anchor animation before taking over the wheel.
      scrollTo({ top: current, behavior: 'instant' });
      written = scrollY;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function configure() {
    stop();
    removeEventListener('wheel', onWheel);
    if (desktop.matches && !reduced.matches)
      addEventListener('wheel', onWheel, { passive: false });
  }

  // Give direct interactions and other navigation back to the browser immediately.
  addEventListener('pointerdown', stop, { capture: true, passive: true });
  addEventListener('touchstart', stop, { capture: true, passive: true });
  addEventListener('click', stop, { capture: true });
  addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab', 'Escape'].includes(event.key))
      stop();
  }, { capture: true });
  addEventListener('scroll', () => {
    if (frame && Math.abs(scrollY - written) > 1) stop();
  }, { passive: true });
  addEventListener('blur', stop);
  document.addEventListener('visibilitychange', stop);
  document.addEventListener('site:scroll-lock-change', stop);
  addEventListener('resize', () => { stop(); measure(); }, { passive: true });
  new ResizeObserver(measure).observe(document.body);
  desktop.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  measure();
  configure();
}
