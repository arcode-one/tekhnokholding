const roster = document.querySelector('[data-team-roster]');
const hover = window.matchMedia('(hover: hover) and (pointer: fine)');

for (const toggle of roster.querySelectorAll('.team-person__toggle')) {
  const card = toggle.closest('.team-person');
  const quote = document.getElementById(toggle.getAttribute('aria-controls'));
  let pinned = false;
  let hovered = false;

  function updateQuote() {
    const expanded = pinned || hovered;
    card.toggleAttribute('data-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    quote.setAttribute('aria-hidden', String(!expanded));
    quote.tabIndex = expanded ? 0 : -1;
  }

  card.addEventListener('pointerenter', (event) => {
    if (hover.matches && event.pointerType === 'mouse') {
      hovered = true;
      updateQuote();
    }
  });

  card.addEventListener('pointerleave', () => {
    hovered = false;
    pinned ||= quote.contains(document.activeElement);
    updateQuote();
  });

  toggle.addEventListener('click', () => {
    pinned = !(pinned || hovered);
    hovered = false;
    updateQuote();
  });

  card.addEventListener('click', (event) => {
    if ((!hover.matches || event.pointerType === 'touch') && !event.target.closest('button, blockquote')) {
      toggle.click();
    }
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (pinned || hovered)) {
      pinned = false;
      hovered = false;
      updateQuote();
      if (quote.contains(document.activeElement)) toggle.focus();
    }
  });

  hover.addEventListener('change', () => {
    hovered = false;
    updateQuote();
  });

  updateQuote();
  toggle.hidden = false;
}

roster.setAttribute('data-enhanced', '');
