/* Общий скролл сайта. Подключать после Lenis на всех страницах. */
(function () {
  if (!window.Lenis) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scroller = null;

  // Ограничиваем очередь, а не только сглаживаем её: частое колесо не копит
  // несколько экранов прокрутки. Обратный жест сразу меняет направление.
  function limitWheel(data) {
    const { event } = data;
    if (event.type !== 'wheel' || event.ctrlKey || !data.deltaY ||
        scroller.isStopped || scroller.isLocked) return;
    if (event.composedPath().some((node) => node instanceof Element &&
        node.closest('[data-lenis-prevent], .menu'))) return;

    const current = scroller.animatedScroll;
    const target = scroller.targetScroll;
    const delta = Math.max(-90, Math.min(90, data.deltaY * 0.7));
    const lead = Math.min(360, window.innerHeight * 0.42);
    const reversing = (target - current) * delta < 0;
    const next = Math.max(current - lead, Math.min(current + lead,
      (reversing ? current : target) + delta));

    data.deltaY = next - target;
    if (Math.abs(data.deltaY) < 0.01) {
      if (event.cancelable) event.preventDefault();
      return false;
    }
  }

  function syncLock() {
    if (!scroller) return;
    if (root.classList.contains('is-locked') || document.hidden) scroller.stop();
    else scroller.start();
  }

  function configure() {
    if (scroller) scroller.destroy();
    scroller = null;
    if (reducedMotion.matches) return;

    scroller = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.035,
      syncTouch: false,
      anchors: true,
      virtualScroll: limitWheel,
      prevent: (node) => !!node.closest('[data-lenis-prevent], .menu'),
    });
    syncLock();
  }

  configure();
  new MutationObserver(syncLock).observe(root, {
    attributes: true,
    attributeFilter: ['class'],
  });
  document.addEventListener('site:scroll-lock-change', syncLock);
  document.addEventListener('visibilitychange', syncLock);
  reducedMotion.addEventListener('change', configure);
})();
