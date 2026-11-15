import initQuotes from './home-team-quote.js';

export default function init(people) {
  const pages = [...people.querySelectorAll('[data-home-team-page]')];
  const controls = people.querySelector('[data-home-team-controls]');
  const count = controls.querySelector('[data-home-team-count]');
  const previous = controls.querySelector('[data-home-team-step="-1"]');
  const next = controls.querySelector('[data-home-team-step="1"]');
  const pageEnds = [];
  let total = 0;
  let current = 0;

  for (const page of pages) {
    total += page.children.length;
    pageEnds.push(total);
  }

  function show(index) {
    current = index;
    pages.forEach((page, i) => {
      page.style.setProperty('--team-page-offset', i - index);
      page.inert = i !== index;
    });
    previous.setAttribute('aria-disabled', index === 0);
    next.setAttribute('aria-disabled', index === pages.length - 1);
    const first = (pageEnds[index - 1] ?? 0) + 1;
    count.textContent = `${first}–${pageEnds[index]} из ${total}`;
  }

  previous.addEventListener('click', () => {
    if (current > 0) show(current - 1);
  });
  next.addEventListener('click', () => {
    if (current < pages.length - 1) show(current + 1);
  });

  show(0);
  people.dataset.enhanced = '';
  controls.inert = false;
  initQuotes(people);
}
