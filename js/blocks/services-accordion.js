export default function init(container) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const openDuration = Number(container.dataset.accordionOpenMs) || 460;
  const closeDuration = Number(container.dataset.accordionCloseMs) || openDuration;
  const easing = container.dataset.accordionEasing || 'cubic-bezier(0.22, 1, 0.36, 1)';
  const animateCopy = container.dataset.accordionCopyMotion !== 'none';
  const alignMode = container.dataset.accordionAlign;
  const overview = alignMode === 'overview' ? container.closest('.mission-overview') : null;
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
  function align(item, animate, expanded = true) {
    stopAlign();
    const anchor = expanded ? item.element : overview;
    if (!anchor) return;
    const scrollMargin = parseFloat(getComputedStyle(item.element).scrollMarginTop) || 0;
    const offset = expanded
      ? Math.max(scrollMargin, !overview && innerWidth < 768 ? 80 : 0)
      : 0;
    const destination = () => {
      const top = anchor.getBoundingClientRect().top + scrollY;
      if (!overview || !expanded) return Math.max(0, top - offset);

      const section = overview.getBoundingClientRect();
      const sectionTop = section.top + scrollY;
      // Read the natural panel height, not its partially revealed animation frame.
      const panelHeight = item.summary.offsetHeight + item.body.offsetHeight;
      const bottomGap = 24;
      const target = panelHeight <= innerHeight - offset - bottomGap
        ? top + panelHeight + bottomGap - innerHeight
        : top - offset;
      // Keep as much introduction as possible and never pull the footer into view.
      return Math.max(sectionTop, Math.min(target, section.bottom + scrollY - innerHeight));
    };
    if (!animate || reduced.matches) {
      scrollTo({ top: destination(), behavior: 'instant' });
      return;
    }
    const startY = scrollY;
    const startTime = performance.now();
    // Finish after both panels settle, including the overview's vertical centering.
    const duration = overview ? Math.max(openDuration, closeDuration) + 100 : openDuration;
    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      // An earlier panel may be closing at the same time, so its new height
      // must be reflected in the destination throughout this transition.
      let nextY = startY + (destination() - startY) * eased;
      if (overview) {
        // The panel can shrink faster than the return scroll. Keep the viewport
        // inside the current section on every frame, not just at the destination.
        const limit = Math.max(0, Math.floor(overview.getBoundingClientRect().bottom + scrollY - innerHeight));
        nextY = Math.min(nextY, limit);
      }
      scrollTo({ top: nextY, behavior: 'instant' });
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
    // Render newly opened content in its collapsed visual state before transitioning it.
    if (!item.element.open) item.element.setAttribute('data-closing', '');
    item.element.open = true;
    const openHeight = item.summary.offsetHeight + item.body.offsetHeight;
    const end = expanded ? openHeight : item.summary.offsetHeight;
    item.element.style.setProperty('--service-open-height', `${openHeight}px`);
    item.element.setAttribute('data-animating', '');
    item.element.toggleAttribute('data-closing', !expanded);
    item.element.style.height = `${start}px`;
    item.element.style.overflow = 'hidden';
    item.animation = item.element.animate({ height: [`${start}px`, `${end}px`] }, {
      duration: expanded ? openDuration : closeDuration,
      easing,
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
    if (alignMode !== 'none' && (expanded || overview)) align(item, animate, expanded);
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
