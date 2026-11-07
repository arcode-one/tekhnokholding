function getLineStarts(paragraph) {
  const starts = [];
  const words = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const lineHeight = parseFloat(getComputedStyle(paragraph).lineHeight);
  let lastTop = -Infinity;

  for (let node = words.nextNode(); node; node = words.nextNode()) {
    for (const word of node.data.matchAll(/\S+/g)) {
      range.setStart(node, word.index);
      range.setEnd(node, word.index + word[0].length);
      const { top } = range.getBoundingClientRect();
      if (top > lastTop + lineHeight / 2) {
        starts.push({ node, offset: word.index });
        lastTop = top;
      }
    }
  }
  return starts;
}

function revealLines(paragraph, delay) {
  const starts = getLineStarts(paragraph);
  if (!starts.length) return 0;
  const original = [...paragraph.childNodes];
  const originalHeight = paragraph.offsetHeight;
  const fragment = document.createDocumentFragment();
  const stagger = Math.min(105, 540 / Math.max(1, starts.length - 1));

  starts.forEach((start, index) => {
    const end = starts[index + 1];
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    if (index) range.setStart(start.node, start.offset);
    if (end) range.setEnd(end.node, end.offset);

    const line = document.createElement('span');
    const text = document.createElement('span');
    line.className = 'home-mission__line';
    text.style.setProperty('--mission-line-delay', `${delay + index * stagger}ms`);
    const contents = range.cloneContents();
    // A range entirely inside a strong element only clones its text.
    const ancestor = range.commonAncestorContainer;
    const emphasis = (ancestor.parentElement ?? paragraph).closest('strong');
    if (emphasis) {
      const strong = emphasis.cloneNode(false);
      strong.append(contents);
      text.append(strong);
    } else {
      text.append(contents);
    }
    line.append(text);
    fragment.append(line);
  });

  paragraph.replaceChildren(fragment);
  if (paragraph.offsetHeight !== originalHeight) {
    paragraph.replaceChildren(...original);
    return 0;
  }

  const animations = paragraph.getAnimations({ subtree: true });
  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
    paragraph.replaceChildren(...original);
  });
  return Math.min(320, starts.length * stagger);
}

export default function initMissionLineReveal(mission) {
  if (!mission || typeof Element.prototype.getAnimations !== 'function') return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  const observer = new IntersectionObserver((entries) => {
    let delay = 0;
    for (const { target, isIntersecting, boundingClientRect } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (!reduced.matches && boundingClientRect.top >= 0) delay += revealLines(target, delay);
      target.removeAttribute('data-mission-lines-waiting');
    }
  }, { rootMargin: '0px 0px -48px 0px' });

  mission.querySelectorAll('.home-mission__statement p').forEach((paragraph) => {
    if (paragraph.getBoundingClientRect().top < innerHeight) return;
    paragraph.setAttribute('data-mission-lines-waiting', '');
    observer.observe(paragraph);
  });
}
