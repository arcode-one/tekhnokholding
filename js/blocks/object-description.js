export default function init(button) {
  const label = button.querySelector('.pill__label');

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    label.textContent = expanded ? 'Свернуть' : 'Подробнее';
  });
}
