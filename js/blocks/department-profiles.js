export default function init(container) {
  const hover = matchMedia('(hover: hover) and (pointer: fine)');

  for (const button of container.querySelectorAll('.department-card__toggle')) {
    const card = button.closest('.department-card');
    const setExpanded = (expanded) => button.setAttribute('aria-expanded', String(expanded));

    card.addEventListener('pointerenter', (event) => {
      if (hover.matches && event.pointerType === 'mouse') setExpanded(true);
    });
    card.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') setExpanded(false);
    });
    button.addEventListener('click', () => setExpanded(button.getAttribute('aria-expanded') === 'false'));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setExpanded(false);
    });
    button.hidden = false;
  }
}
