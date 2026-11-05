export default function init(container) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const openDuration = Number(container.dataset.accordionOpenMs) || 460;
  const closeDuration = Number(container.dataset.accordionCloseMs) || openDuration;
  const animateCopy = container.dataset.accordionCopyMotion !== 'none';
  const items = [...container.querySelectorAll('details')].map((element) => ({
    element,
    summary: element.querySelector('summary'),
    body: element.querySelector('.services-accordion__body'),
    copy: element.querySelector('.services-accordion__copy'),
    expanded: element.open,
    animation: null,
    copyAnimation: null,
  }));
  let alignFrame = 0;
  function stopAlign() {
    cancelAnimationFrame(alignFrame);
    alignFrame = 0;
  }
  function align(item, animate) {
    stopAlign();
    if (!animate || reduced.matches) {
      scrollTo({ top: item.element.getBoundingClientRect().top + scrollY - (innerWidth < 768 ? 80 : 0), behavior: 'instant' });
      return;
    }
    const startY = scrollY;
    const startTime = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - startTime) / openDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      // An earlier panel may be closing at the same time, so its new height
      // must be reflected in the destination throughout this transition.
      const destination = item.element.getBoundingClientRect().top + scrollY - (innerWidth < 768 ? 80 : 0);
      scrollTo({ top: startY + (destination - startY) * eased, behavior: 'instant' });
      alignFrame = progress < 1 ? requestAnimationFrame(step) : 0;
    }
    alignFrame = requestAnimationFrame(step);
  }
  function settle(item) {
    item.animation?.cancel();
    item.copyAnimation?.cancel();
    item.animation = null;
    item.copyAnimation = null;
    item.element.open = item.expanded;
    item.element.removeAttribute('data-animating');
    item.element.removeAttribute('data-closing');
    item.element.style.removeProperty('height');
    item.element.style.removeProperty('overflow');
    item.element.style.removeProperty('--service-open-height');
  }
  function toggle(item, expanded, animate) {
    const start = item.element.getBoundingClientRect().height;
    item.animation?.cancel();
    item.copyAnimation?.cancel();
    item.expanded = expanded;
    if (!animate || reduced.matches) {
      settle(item);
      return;
    }
    item.element.open = true;
    item.element.toggleAttribute('data-closing', !expanded);
    item.element.removeAttribute('data-animating');
    const openHeight = item.summary.offsetHeight + item.body.offsetHeight;
    const end = expanded ? openHeight : item.summary.offsetHeight;
    item.element.style.setProperty('--service-open-height', `${openHeight}px`);
    item.element.setAttribute('data-animating', '');
    item.element.style.height = `${start}px`;
    item.element.style.overflow = 'hidden';
    item.animation = item.element.animate({ height: [`${start}px`, `${end}px`] }, {
      duration: expanded ? openDuration : closeDuration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    if (expanded && animateCopy) item.copyAnimation = item.copy.animate({
      opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0)'],
    }, { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    item.animation.onfinish = () => settle(item);
  }
  items.forEach((item) => item.summary.addEventListener('click', (event) => {
    event.preventDefault();
    const expanded = !item.expanded;
    const animate = event.detail !== 0;
    stopAlign();
    if (expanded) items.filter((other) => other !== item && other.expanded)
      .forEach((other) => toggle(other, false, animate));
    toggle(item, expanded, animate);
    if (expanded && container.dataset.accordionAlign !== 'none') align(item, animate);
  }));
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
    addEventListener(type, stopAlign, { passive: true });
  function resetMotion() {
    stopAlign();
    items.forEach(settle);
  }
  reduced.addEventListener('change', resetMotion);
  addEventListener('resize', resetMotion, { passive: true });
}
