export default function init(dialog) {
  const matchesDialog = (button) =>
    button.dataset.lightboxTarget
      ? button.dataset.lightboxTarget === dialog.id
      : document.querySelector('[data-company-lightbox]') === dialog;
  const triggers = [...document.querySelectorAll('[data-company-image]')].filter(matchesDialog);
  let opener;
  const image = dialog.querySelector('[data-lightbox-image]');
  const title = dialog.querySelector('h2');
  const original = dialog.querySelector('[data-lightbox-original]');
  const gallery = dialog.querySelector('[data-lightbox-gallery]');
  const view = dialog.querySelector('[data-lightbox-view]');
  const bottom = dialog.querySelector('[data-lightbox-bottom]');
  const back = dialog.querySelector('[data-lightbox-back]');
  const steps = dialog.querySelector('[data-lightbox-steps]');
  let ownsLock = false;
  let collection = [];
  let index = 0;
  let academy = false;
  dialog.setAttribute('data-lenis-prevent', '');
  function open() {
    if (dialog.open) return;
    if (!document.documentElement.classList.contains('site--locked')) ownsLock = true;
    document.documentElement.classList.add('site--locked');
    opener = document.activeElement;
    dialog.showModal();
  }
  function show(button) {
    const fromGallery = gallery && !gallery.hidden;
    image.src = button.dataset.companyImage;
    image.alt = button.dataset.imageTitle;
    title.textContent = button.dataset.imageTitle;
    if (original) original.href = button.dataset.imageOriginal || button.dataset.companyImage;
    if (gallery) gallery.hidden = true;
    if (view) view.hidden = false;
    view?.classList.toggle(
      'company-lightbox__image--rotated',
      button.dataset.imageRotation === '90',
    );
    if (bottom) bottom.hidden = false;
    if (back) back.hidden = !academy;
    if (steps) {
      steps.hidden = collection.length < 2;
      steps.querySelector('[data-lightbox-count]').textContent =
        `${index + 1} / ${collection.length}`;
    }
    open();
    if (academy && fromGallery) back.focus({ preventScroll: true });
  }
  function showAcademy() {
    academy = true;
    title.textContent = 'Сертификаты специалистов';
    gallery.hidden = false;
    view.hidden = true;
    bottom.hidden = true;
    back.hidden = true;
    open();
  }
  triggers.forEach((button) =>
    button.addEventListener('click', () => {
      const group = button.dataset.imageGroup;
      collection = group ? triggers.filter((item) => item.dataset.imageGroup === group) : [button];
      index = collection.indexOf(button);
      academy = group === 'academy';
      show(button);
    }),
  );
  [...document.querySelectorAll('[data-company-gallery="academy"]')]
    .filter(matchesDialog)
    .forEach((button) => button.addEventListener('click', showAcademy));
  back?.addEventListener('click', () => {
    showAcademy();
    collection[index]?.focus({ preventScroll: true });
  });
  function step(direction) {
    if (collection.length < 2 || (gallery && !gallery.hidden)) return;
    index = (index + direction + collection.length) % collection.length;
    show(collection[index]);
  }
  dialog
    .querySelectorAll('[data-lightbox-step]')
    .forEach((button) =>
      button.addEventListener('click', () => step(Number(button.dataset.lightboxStep))),
    );
  dialog.addEventListener('keydown', (event) => {
    if (
      ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
      collection.length > 1 &&
      (!gallery || gallery.hidden)
    ) {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    // Событие close приходит асинхронно. Старое закрытие не снимает блокировку
    // у уже открытого следующего документа и не теряет владение блокировкой.
    if (dialog.open) return;
    if (ownsLock) document.documentElement.classList.remove('site--locked');
    ownsLock = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
}
