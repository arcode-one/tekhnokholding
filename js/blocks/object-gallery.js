export default function init(gallery) {
  const image = gallery.querySelector('[data-object-gallery-image]');
  const status = gallery.querySelector('[data-object-gallery-status]');
  const thumbnails = [...gallery.querySelectorAll('[data-object-gallery-photo]')];
  const arrows = gallery.querySelectorAll('[data-object-gallery-step]');
  let selected = 0;

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
