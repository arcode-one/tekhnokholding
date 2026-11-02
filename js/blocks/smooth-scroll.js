import Lenis from '../vendor/lenis-1.3.27.js';

export default function init() {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const nativeArea = '[data-lenis-prevent],[data-ui~=menu],select';
  let scroller = null;

  // Запас инерции ограничен половиной экрана; обратный жест сразу
  // меняет направление. Карта, горизонтальные ленты и меню работают сами.
  function limitWheel(data) {
    const { event, deltaX, deltaY } = data;
    if (event.type !== 'wheel') return;
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.shiftKey ||
      Math.abs(deltaX) > Math.abs(deltaY)
    )
      return false;
    if (!deltaY || !scroller || scroller.isStopped || scroller.isLocked) return;
    if (event.composedPath().some((node) => node instanceof Element && node.closest(nativeArea)))
      return false;

    const current = scroller.animatedScroll;
    const target = scroller.targetScroll;
    const maxPendingScroll = innerHeight * 0.5;
    const reversing = (target - current) * deltaY < 0;
    const next = Math.max(
      current - maxPendingScroll,
      Math.min(current + maxPendingScroll, (reversing ? current : target) + deltaY),
    );
    data.deltaY = next - target;
    if (Math.abs(data.deltaY) < 0.01) {
      if (event.cancelable) event.preventDefault();
      return false;
    }
  }

  function syncLock() {
    if (!scroller) return;
    if (
      root.classList.contains('site--locked') ||
      root.classList.contains('site--preloading') ||
      document.hidden
    )
      scroller.stop();
    else scroller.start();
  }

  function configure() {
    scroller?.destroy();
    scroller = null;
    if (reducedMotion.matches) return;

    scroller = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      wheelMultiplier: 0.4,
      // Заметная плавная инерция с конечной длительностью вместо длинного хвоста lerp.
      duration: 1.2,
      lerp: 0,
      syncTouch: false,
      anchors: true,
      stopInertiaOnNavigate: true,
      virtualScroll: limitWheel,
      prevent: (node) => !!node.closest(nativeArea),
    });
    syncLock();
  }

  function cancelMomentum() {
    if (scroller?.isScrolling === 'smooth')
      scroller.scrollTo(scrollY, { immediate: true, force: true });
  }

  configure();
  new MutationObserver(syncLock).observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('site:scroll-lock-change', syncLock);
  document.addEventListener('visibilitychange', syncLock);
  reducedMotion.addEventListener('change', configure);
  addEventListener('pointerdown', cancelMomentum, { passive: true });
  addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key))
      cancelMomentum();
  });
  document.addEventListener('site:scrollbar-move', (event) => {
    if (!Number.isFinite(event.detail)) return;
    if (
      root.classList.contains('site--locked') ||
      root.classList.contains('site--preloading') ||
      document.hidden
    ) {
      event.preventDefault();
      return;
    }
    if (!scroller) return;
    event.preventDefault();
    scroller.scrollTo(event.detail, { immediate: true, force: true });
  });
}
