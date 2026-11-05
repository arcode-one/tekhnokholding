// Shared one-shot lifecycle; each page defines its own sequence and CSS motion.
export default function createScrollReveal(prefix, options = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = new Set();
  const pending = new Set();
  const enterKey = `${prefix}Enter`;
  const stateKey = `${prefix}State`;
  const delayProperty = `--${prefix}-delay`;
  let lastScrollY = scrollY;

  function add(scope, selector, kind, delay = 0) {
    scope?.querySelectorAll(selector).forEach((element, index) => {
      element.dataset[enterKey] = kind;
      element.dataset[stateKey] = 'waiting';
      const stagger = typeof delay === 'function' ? delay(index) : delay;
      if (stagger) element.style.setProperty(delayProperty, `${stagger}ms`);
      targets.add(element);
      pending.add(element);
    });
  }

  function finish(element) {
    if (!pending.delete(element)) return;
    element.dataset[stateKey] = 'done';
    element.style.removeProperty(delayProperty);
    observer.unobserve(element);
    if (!pending.size) cleanup();
  }

  function reveal(element, animate) {
    observer.unobserve(element);
    if (!animate || reduced.matches) {
      finish(element);
      return;
    }
    const enteredAt = scrollY;
    const begin = () => {
      if (!pending.has(element)) return;
      // A late-loading image must not replay after the reader has passed it.
      const rect = element.getBoundingClientRect();
      if (reduced.matches || scrollY < enteredAt || rect.bottom <= 0 || rect.top >= innerHeight)
        finish(element);
      else element.dataset[stateKey] = 'running';
    };
    const image = ['photo', 'cover'].includes(element.dataset[enterKey])
      ? element.querySelector('img') : null;
    if (image) image.decode().catch(() => {}).then(begin);
    else begin();
  }

  const observer = new IntersectionObserver((entries) => {
    const movingBack = scrollY < lastScrollY;
    lastScrollY = scrollY;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target, !movingBack && entry.boundingClientRect.top >= 0);
    }
  }, { rootMargin: options.rootMargin ?? '0px 0px -64px 0px', threshold: 0 });

  function onAnimationEnd(event) {
    if (targets.has(event.target) && event.animationName.startsWith(`${prefix}-once-`))
      finish(event.target);
  }

  function onInteraction(event) {
    // Reveal a control and its contents immediately when it is focused or pressed.
    if (!(event.target instanceof Element)) return;
    for (const element of [...pending])
      if (element.contains(event.target) || event.target.contains(element)) finish(element);
  }

  function finishAll() {
    for (const element of [...pending]) finish(element);
  }

  function onReducedChange() {
    if (reduced.matches) finishAll();
  }

  function cleanup() {
    observer.disconnect();
    document.removeEventListener('animationend', onAnimationEnd);
    document.removeEventListener('focusin', onInteraction);
    document.removeEventListener('pointerdown', onInteraction);
    removeEventListener('beforeprint', finishAll);
    reduced.removeEventListener('change', onReducedChange);
  }

  function start() {
    document.addEventListener('animationend', onAnimationEnd);
    document.addEventListener('focusin', onInteraction);
    document.addEventListener('pointerdown', onInteraction, { passive: true });
    addEventListener('beforeprint', finishAll);
    reduced.addEventListener('change', onReducedChange);
    if (reduced.matches) finishAll();
    else targets.forEach((element) => observer.observe(element));
  }

  return { add, start };
}
