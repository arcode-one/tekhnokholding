// Homepage wheel gestures navigate real document sections, preserving links,
// the scrollbar, and all scroll-based effects. Touch/keyboard remain native.
export default function init() {
  if (new URLSearchParams(location.search).get('scroll') === 'native') return;
  const sections = ['objects', 'map-objects', 'advantages', 'team', 'clients', 'contacts']
    .map((id) => document.getElementById(id)).filter(Boolean);
  if (sections.length < 2) return;
  const root = document.documentElement;
  const desktop = matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 1300;
  const settlePause = 650;
  const gestureGap = 220;
  let frame = 0;
  let resumeAt = 0;
  let lastWheel = -Infinity;
  let consumed = false;
  let written = scrollY;
  let bounds = [];
  let limit = 0;
  let dirty = true;

  // Use the site's existing CSS timing curve for the document animation too.
  const curve = getComputedStyle(root).getPropertyValue('--ease-in-out')
    .match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number) || [.65, 0, .25, 1];
  const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  function ease(progress) {
    let low = 0, high = 1;
    for (let i = 0; i < 16; i++) {
      const t = (low + high) / 2;
      if (bezier(t, curve[0], curve[2]) < progress) low = t;
      else high = t;
    }
    return bezier((low + high) / 2, curve[1], curve[3]);
  }
  const locked = () => document.hidden || root.classList.contains('site--locked') ||
    root.classList.contains('site--scrollbar-dragging');
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    resumeAt = 0;
    consumed = false;
    lastWheel = -Infinity;
  }
  function measure() {
    bounds = sections.map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top + scrollY, height: rect.height };
    });
    limit = Math.max(0, document.scrollingElement.scrollHeight - innerHeight);
    dirty = false;
  }
  function animateTo(destination) {
    const from = scrollY;
    const to = Math.max(0, Math.min(limit, destination));
    if (Math.abs(to - from) < 2) return;
    const started = performance.now();
    scrollTo({ top: from, behavior: 'instant' });
    written = scrollY;
    function tick(now) {
      if (locked()) { stop(); return; }
      const progress = Math.min(1, (now - started) / duration);
      scrollTo({ top: progress === 1 ? to : from + (to - from) * ease(progress), behavior: 'instant' });
      written = scrollY;
      frame = progress < 1 ? requestAnimationFrame(tick) : 0;
      if (progress === 1) resumeAt = now + settlePause;
    }
    frame = requestAnimationFrame(tick);
  }
  function nestedScroll(event, delta) {
    for (const node of event.composedPath()) {
      if (node === document.body || node === root) break;
      if (!(node instanceof HTMLElement)) continue;
      if (node.matches('input, textarea, select, [role="slider"]') || node.isContentEditable) return true;
      if (node.scrollHeight <= node.clientHeight + 1) continue;
      const style = getComputedStyle(node);
      if (!/^(auto|scroll|overlay)$/.test(style.overflowY)) continue;
      if ((delta < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1) ||
          /^(contain|none)$/.test(style.overscrollBehaviorY)) return true;
    }
    return false;
  }
  function onWheel(event) {
    if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY || locked()) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (nestedScroll(event, delta)) return;
    const now = performance.now();
    if (now - lastWheel > gestureGap && !frame) consumed = false;
    lastWheel = now;
    // Let the landed section rest; wheel input during this pause is not queued.
    if (frame || now < resumeAt || consumed) { event.preventDefault(); return; }
    if (dirty) measure();
    const y = scrollY;
    const first = bounds[0].top;
    let destination;
    if (y < first - 2) {
      // The hero and figures keep their existing free wheel scrolling.
      const approach = Math.max(64, Math.min(innerHeight * .5, Math.abs(delta) * .4));
      if (delta < 0 || y < first - approach) return;
      destination = first;
    } else {
      let index = bounds.findLastIndex((section) => section.top <= y + 2);
      index = Math.max(0, index);
      const section = bounds[index];
      // At zoomed/short windows, read the whole tall block before moving on.
      if (section.height > innerHeight + 4 &&
          (delta > 0 ? y < section.top + section.height - innerHeight - 3 : y > section.top + 3)) return;
      if (delta > 0) destination = bounds[index + 1]?.top;
      else if (y > section.top + 3) destination = section.top;
      else destination = bounds[index - 1]?.top;
    }
    if (destination === undefined) return;
    event.preventDefault();
    consumed = true;
    animateTo(destination);
  }
  function configure() {
    stop();
    removeEventListener('wheel', onWheel, true);
    if (desktop.matches && !reduced.matches)
      addEventListener('wheel', onWheel, { capture: true, passive: false });
  }
  // Capture takes precedence over the shared continuous wheel smoother.
  for (const type of ['pointerdown', 'touchstart', 'keydown', 'click'])
    addEventListener(type, stop, { capture: true, passive: true });
  addEventListener('scroll', () => {
    if (frame && Math.abs(scrollY - written) > 2) stop();
  }, { passive: true });
  addEventListener('resize', () => { stop(); dirty = true; }, { passive: true });
  addEventListener('hashchange', stop);
  addEventListener('blur', stop);
  document.addEventListener('visibilitychange', stop);
  document.addEventListener('site:scroll-lock-change', stop);
  const sizes = new ResizeObserver(() => { dirty = true; });
  sizes.observe(document.body);
  sections.forEach((section) => sizes.observe(section));
  document.fonts.ready.then(() => { dirty = true; });
  desktop.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  configure();
}
