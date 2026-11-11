export default function init(button) {
  const copy = document.getElementById(button.getAttribute('aria-controls'));
  const label = button.querySelector('.pill__label');

  function setExpanded(expanded) {
    button.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? 'Свернуть' : 'Подробнее';
  }

  function updateButton() {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    if (expanded) button.setAttribute('aria-expanded', 'false');

    const hasMore = copy.scrollHeight > copy.clientHeight + 1;
    button.hidden = !hasMore;
    if (expanded) setExpanded(hasMore);
  }

  button.addEventListener('click', () => {
    setExpanded(button.getAttribute('aria-expanded') !== 'true');
  });

  updateButton();
  let width = copy.getBoundingClientRect().width;
  const observer = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === width) return;
    width = entry.contentRect.width;
    requestAnimationFrame(updateButton);
  });
  observer.observe(copy);
  document.fonts.ready.then(updateButton);
}
