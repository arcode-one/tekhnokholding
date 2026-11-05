// Progressive enhancement: without JS the original details still expand inline.
export default function initMissionValues(story) {
  if (!('showPopover' in HTMLElement.prototype)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let active;
  let enterTimer;
  let leaveTimer;
  let restoringFocus = false;
  const clearTimers = () => { clearTimeout(enterTimer); clearTimeout(leaveTimer); };
  const position = () => {
    if (!active) return;
    const { button, panel } = active;
    const anchor = button.getBoundingClientRect();
    const gap = 10, edge = 16;
    const width = panel.offsetWidth, height = panel.offsetHeight;
    const left = hover.matches ? Math.max(edge, Math.min(innerWidth - width - edge,
      anchor.left + anchor.width / 2 - width / 2)) : (innerWidth - width) / 2;
    let top = (innerHeight - height) / 2;
    if (hover.matches) {
      top = anchor.top - height - gap;
      if (top < edge && anchor.bottom + gap + height <= innerHeight - edge)
        top = anchor.bottom + gap;
    }
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(Math.max(edge, Math.min(innerHeight - height - edge, top)))}px`;
  };
  const hide = (restore = false) => {
    clearTimers();
    if (!active) return;
    const { panel, button, animation } = active;
    active = null;
    animation?.cancel();
    panel.hidePopover();
    button.setAttribute('aria-expanded', 'false');
    if (restore) {
      restoringFocus = true;
      button.focus({ preventScroll: true });
      restoringFocus = false;
    }
  };
  const scheduleHide = () => {
    clearTimeout(enterTimer);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => {
      if (!active) return;
      const { panel, button } = active;
      if (panel.matches(':hover') || button.matches(':hover') ||
          panel.contains(document.activeElement) || button.matches(':focus-visible')) return;
      hide();
    }, 240);
  };
  story.querySelectorAll('.mission-value-item').forEach((item) => {
    const summary = item.querySelector('summary');
    const copy = item.querySelector('.mission-value__copy');
    const principle = document.createElement('section');
    principle.className = 'mission-value-dialog__principle';
    const principleTitle = copy.querySelector('h3');
    principle.append(principleTitle, principleTitle.nextElementSibling);
    copy.append(principle);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = summary.className;
    button.id = item.id;
    button.innerHTML = summary.innerHTML;
    button.querySelector('.mission-value__title').id = `${item.id}-title`;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    const panel = document.createElement('div');
    panel.className = 'mission-value-dialog mission-value-popover';
    panel.popover = 'manual';
    panel.id = `${item.id}-dialog`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', `${item.id}-title`);
    button.setAttribute('aria-controls', panel.id);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'mission-value-dialog__close';
    close.setAttribute('aria-label', 'Закрыть описание ценности');
    close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>';
    panel.append(close, copy);
    item.replaceWith(button);
    // Keep the reading panel next to its trigger in keyboard navigation order.
    button.after(panel);
    const show = (animate = true) => {
      clearTimers();
      if (active?.button === button) return;
      hide();
      active = { button, panel };
      panel.showPopover();
      panel.scrollTop = 0;
      button.setAttribute('aria-expanded', 'true');
      position();
      if (animate && !reduced.matches) active.animation = panel.animate([
        { opacity: 0, transform: 'translateY(6px) scale(.985)' },
        { opacity: 1, transform: 'none' },
      ], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    };
    button.addEventListener('pointerenter', (event) => {
      if (!hover.matches || event.pointerType === 'touch') return;
      clearTimers();
      enterTimer = setTimeout(() => show(), 160);
    });
    button.addEventListener('pointerleave', scheduleHide);
    panel.addEventListener('pointerenter', clearTimers);
    panel.addEventListener('pointerleave', scheduleHide);
    button.addEventListener('focus', () => {
      if (!restoringFocus && button.matches(':focus-visible')) show(false);
    });
    button.addEventListener('click', (event) => {
      if (active?.button === button) {
        if (!hover.matches) hide();
      } else show(event.detail !== 0);
    });
    button.addEventListener('focusout', scheduleHide);
    panel.addEventListener('focusout', scheduleHide);
    close.addEventListener('click', (event) => hide(event.detail === 0));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) { event.preventDefault(); hide(true); }
  });
  document.addEventListener('pointerdown', (event) => {
    if (active && !active.panel.contains(event.target) && !active.button.contains(event.target)) hide();
  });
  document.addEventListener('scroll', (event) => {
    // Reading a long panel is independent of the document scroll.
    if (active && !active.panel.contains(event.target)) hide();
  }, { capture: true, passive: true });
  addEventListener('resize', position, { passive: true });
  hover.addEventListener('change', () => hide());
}
