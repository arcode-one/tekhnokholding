export default function init(page) {
  const lead = page.querySelector('[data-motion-lead]');
  const cover = lead.querySelector('[data-ui~=object-cover]');
  const coverImage = cover.querySelector('img');
  const gallery = page.querySelector('[data-motion-gallery]');
  const track = gallery.querySelector('[data-ui~=object-cinema__track]');
  const stage = gallery.querySelector('[data-ui~=object-cinema__stage]');
  const counter = gallery.querySelector('[data-motion-position]');
  const layoutButton = gallery.querySelector('[data-motion-layout]');
  const frames = Array.from(gallery.querySelectorAll('[data-motion-frame]'), (outer, index) => ({
    outer,
    visual: outer.querySelector('a'),
    caption: outer.querySelector('figcaption'),
    image: outer.querySelector('img'),
    index,
    start: index < 2 ? -0.18 : 0.04 + (index - 2) * 0.18,
  }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 768px)');
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const number = (n) => String(n).padStart(2, '0');
  let viewport = innerHeight,
    leadTop = 0,
    leadTravel = 1,
    galleryTop = 0,
    galleryTravel = 1;
  let raf = 0,
    enabled = false,
    grid = false,
    lastCounter = '';

  function resetFrame(frame) {
    frame.outer.style.removeProperty('transform');
    frame.outer.style.removeProperty('clip-path');
    frame.visual.style.removeProperty('transform');
    frame.visual.style.removeProperty('clip-path');
    frame.caption?.style.removeProperty('visibility');
    frame.image.style.removeProperty('transform');
    frame.outer.inert = false;
    frame.outer.removeAttribute('aria-hidden');
  }

  function update() {
    raf = 0;
    if (document.hidden || reduced.matches) return;
    const y = scrollY;
    const leadProgress = clamp((y - leadTop + viewport * 0.75) / leadTravel);
    if (enabled) {
      const inset = 12 * (1 - leadProgress);
      coverImage.style.clipPath = `inset(${(inset * 0.4).toFixed(3)}% ${inset.toFixed(3)}%)`;
      coverImage.style.transform = `translate3d(0, ${((0.5 - leadProgress) * 4).toFixed(3)}%, 0) scale(${(1.12 - leadProgress * 0.08).toFixed(4)})`;
    }
    if (grid) return;
    if (!enabled) {
      // На телефоне кадры идут обычной лентой, раскрываясь внутри своих рамок.
      frames.forEach((frame) => {
        const progress = clamp((y + viewport * 0.96 - frame.top) / (viewport * 0.4));
        frame.visual.style.clipPath = progress < 1
          ? `inset(${((1 - progress) * 12).toFixed(3)}% 0 0)`
          : '';
        frame.image.style.transform = `translate3d(0, ${((1 - progress) * 3).toFixed(3)}%, 0) scale(1.06)`;
      });
      return;
    }
    const progress = clamp((y - galleryTop) / galleryTravel);
    let left = 0,
      right = 1,
      wide = -1;
    frames.forEach((frame) => {
      const reveal = frame.index < 2 ? 1 : clamp((progress - frame.start) / 0.16);
      // Сдвиг и маска относятся к фото, а номер кадра остаётся неподвижным.
      frame.visual.style.clipPath = reveal < 1
        ? `inset(${((1 - reveal) * 100).toFixed(3)}% 0 0)`
        : '';
      frame.visual.style.transform = reveal < 1
        ? `translateY(${((1 - reveal) * 12).toFixed(3)}%)`
        : '';
      const drift = clamp((progress - frame.start) / 0.4);
      frame.image.style.transform = `translate3d(0, ${((0.5 - drift) * 8).toFixed(3)}%, 0) scale(1.12)`;
      if (reveal > 0.5) {
        if (frame.index === frames.length - 1) wide = frame.index;
        else if (frame.index % 2) right = frame.index;
        else left = frame.index;
      }
    });
    frames.forEach((frame) => {
      const visible =
        wide >= 0 ? frame.index === wide : frame.index === left || frame.index === right;
      if (frame.caption) frame.caption.style.visibility = visible ? '' : 'hidden';
      if (frame.outer.inert !== !visible) {
        frame.outer.inert = !visible;
        frame.outer.setAttribute('aria-hidden', String(!visible));
      }
    });
    const pair = [left + 2, right + 2].sort((a, b) => a - b);
    const text =
      wide >= 0
        ? `${number(wide + 2)} / ${number(frames.length + 1)}`
        : `${number(pair[0])} — ${number(pair[1])} / ${number(frames.length + 1)}`;
    if (text !== lastCounter) {
      counter.textContent = text;
      lastCounter = text;
    }
  }

  function schedule() {
    if (!raf && !reduced.matches) raf = requestAnimationFrame(update);
  }

  function measure() {
    viewport = innerHeight;
    enabled = desktop.matches && !reduced.matches;
    page.classList.toggle('object-page--motion-ready', enabled);
    layoutButton.hidden = !enabled;
    frames.forEach(resetFrame);
    cover.style.removeProperty('clip-path');
    coverImage.style.removeProperty('clip-path');
    coverImage.style.removeProperty('transform');
    leadTop = lead.getBoundingClientRect().top + scrollY;
    leadTravel =
      viewport * 0.75 + Math.max(0, lead.offsetHeight - lead.firstElementChild.offsetHeight);
    galleryTop = track.getBoundingClientRect().top + scrollY;
    galleryTravel = Math.max(1, track.offsetHeight - stage.offsetHeight);
    frames.forEach((frame) => {
      frame.top = frame.outer.getBoundingClientRect().top + scrollY;
    });
    if (!enabled) {
      counter.textContent = `${number(frames.length + 1)} фотографий`;
      lastCounter = '';
    }
    update();
  }

  layoutButton.addEventListener('click', () => {
    grid = !grid;
    gallery.classList.toggle('object-page--gallery-grid', grid);
    layoutButton.setAttribute('aria-pressed', String(grid));
    layoutButton.querySelector('[data-motion-layout-label]').textContent = grid
      ? 'Вернуть историю'
      : 'Все фотографии';
    measure();
    if (grid) counter.textContent = `${number(frames.length + 1)} фотографий`;
    gallery.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  reduced.addEventListener('change', measure);
  desktop.addEventListener('change', measure);
  document.addEventListener('visibilitychange', schedule);
  new ResizeObserver(measure).observe(page.querySelector('[data-ui~=object-opening]'));
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
}
