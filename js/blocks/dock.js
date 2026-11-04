export default function initDock(dock) {
  const button = dock.querySelector('.dock__burger');
  const panel = dock.querySelector('.dock__panel');
  const lines = [...button.querySelectorAll('svg path')];
  const desktop = matchMedia('(min-width: 1101px)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let target = 0;
  let progress = 0;
  let height = dock.offsetHeight;
  let frame = 0;
  let lastTime = 0;
  let restoringFocus = false;

  function paint() {
    const hidden = 1 - progress;
    dock.style.clipPath = `inset(0 0 0 calc(${hidden * 100}% - ${hidden * height}px) round ${height / 2}px)`;
    lines.forEach((line, index) => {
      line.style.transform = `translateY(${(index === 0 ? 4 : -4) * progress}px)`;
    });
  }

  function tick(now) {
    // One moving value follows the latest target. Reversing never queues or
    // restarts an animation; a slow frame cannot skip straight to the end.
    const delta = Math.min(now - lastTime, 32);
    lastTime = now;
    progress += (target - progress) * (1 - Math.exp(-delta / 90));
    if (Math.abs(target - progress) < 0.001) progress = target;
    paint();
    frame = progress === target ? 0 : requestAnimationFrame(tick);
  }

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    progress = target;
    paint();
  }

  function setOpen(open) {
    const next = Number(Boolean(open && visible && desktop.matches));
    if (target === next) return;
    target = next;
    panel.inert = !target;
    panel.setAttribute('aria-hidden', String(!target));
    button.setAttribute('aria-expanded', String(Boolean(target)));
    button.setAttribute('aria-label', target ? 'Скрыть меню' : 'Открыть меню');
    if (reduceMotion.matches || !desktop.matches) {
      settle();
    } else if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && hover.matches) setOpen(true);
  });
  dock.addEventListener('pointerleave', () => {
    if (!dock.querySelector(':focus-visible')) setOpen(false);
  });
  button.addEventListener('click', event => {
    if (!desktop.matches) return;
    setOpen(event.detail > 0 && hover.matches ? true : !target);
  });
  dock.addEventListener('focusin', () => {
    if (!restoringFocus && dock.querySelector(':focus-visible')) setOpen(true);
  });
  dock.addEventListener('focusout', event => {
    if (!dock.contains(event.relatedTarget) && !dock.matches(':hover')) setOpen(false);
  });
  document.addEventListener('click', event => {
    if (!dock.contains(event.target)) setOpen(false);
  });
  dock.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && event.target === button && desktop.matches) {
      event.preventDefault();
      setOpen(true);
      panel.querySelector('a')?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !target) return;
    restoringFocus = true;
    setOpen(false);
    button.focus({ preventScroll: true });
    restoringFocus = false;
  });
  desktop.addEventListener('change', () => {
    setOpen(false);
    settle();
  });
  reduceMotion.addEventListener('change', settle);
  new ResizeObserver(([entry]) => {
    height = entry.contentRect.height;
    paint();
  }).observe(dock);

  dock.inert = true;
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  paint();

  return {
    isDesktop: () => desktop.matches,
    setVisible(value) {
      visible = value;
      dock.inert = !visible;
      if (!visible) setOpen(false);
    },
  };
}
