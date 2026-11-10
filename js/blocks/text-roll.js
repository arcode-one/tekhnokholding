// Prepare labels once; hover motion itself is handled entirely by CSS.
export default function init() {
  const labels = document.querySelectorAll([
    '.nav a', '.dock__nav a', '.menu__nav a',
    '.header__contacts a', '.dock__contacts a', '.menu__contacts a',
    '.site-footer__nav a', '.site-footer__privacy',
    '.projects-filters .projects-types__button',
  ].join(','));

  for (const label of labels) {
    const link = label.closest('a, button');
    if (!link) continue;
    for (const node of [...label.childNodes]) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      const viewport = document.createElement('span');
      viewport.className = 'text-roll';
      const track = document.createElement('span');
      track.className = 'text-roll__track';
      const original = document.createElement('span');
      original.className = 'text-roll__line';
      original.textContent = node.textContent.trim().replace(/\s+/g, ' ');
      const copy = original.cloneNode(true);
      copy.classList.add('text-roll__copy');
      copy.setAttribute('aria-hidden', 'true');
      track.append(original, copy);
      viewport.append(track);
      node.replaceWith(viewport);
    }
    link.classList.add('text-roll-link');
  }
}
