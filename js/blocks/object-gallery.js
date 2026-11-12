export default function init(gallery) {
  const image = gallery.querySelector('[data-object-gallery-image]');
  const status = gallery.querySelector('[data-object-gallery-status]');
  const thumbnails = [...gallery.querySelectorAll('[data-object-gallery-photo]')];
  const arrows = gallery.querySelectorAll('[data-object-gallery-step]');
  let selected = 0;
  const surface = image.parentElement;
  let swipe = null;
  surface.style.touchAction = 'pan-y pinch-zoom';
  surface.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || !event.isPrimary || event.target.closest('button, a')) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    surface.setPointerCapture(event.pointerId);
  });
  surface.addEventListener('pointerup', (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (thumbnails.length > 1 && Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3)
      show(selected + (dx < 0 ? 1 : -1));
  });
  surface.addEventListener('pointercancel', () => { swipe = null; });
  surface.addEventListener('lostpointercapture', () => { swipe = null; });

  function show(index) {
    const next = (index + thumbnails.length) % thumbnails.length;
    if (next === selected) return;

    thumbnails[selected].removeAttribute('aria-current');
    selected = next;
    const thumbnail = thumbnails[selected];
    const preview = thumbnail.querySelector('img');
    thumbnail.setAttribute('aria-current', 'true');

    delete image.dataset.fallbackApplied;
    image.srcset = preview.srcset;
    image.src = thumbnail.href;
    image.alt = thumbnail.dataset.objectGalleryPhoto;
    status.textContent = `Фото ${selected + 1} из ${thumbnails.length}`;
  }

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      show(index);
    });
  });

  arrows.forEach((arrow) => {
    arrow.hidden = thumbnails.length < 2;
    arrow.addEventListener('click', () => show(selected + Number(arrow.dataset.objectGalleryStep)));
  });

  gallery.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(selected + (event.key === 'ArrowLeft' ? -1 : 1));
  });
}
