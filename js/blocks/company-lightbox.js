export default function init(dialog) {
  const matchesDialog = (button) =>
    button.dataset.lightboxTarget
      ? button.dataset.lightboxTarget === dialog.id
      : document.querySelector('[data-company-lightbox]') === dialog;
  const triggers = [...document.querySelectorAll('[data-company-image], [data-company-pages]')].filter(matchesDialog);
  let opener;
  const image = dialog.querySelector('[data-lightbox-image]');
  const title = dialog.querySelector('h2');
  const gallery = dialog.querySelector('[data-lightbox-gallery]');
  const view = dialog.querySelector('[data-lightbox-view]');
  const pages = dialog.querySelector('[data-lightbox-pages]');
  const bottom = dialog.querySelector('[data-lightbox-bottom]');
  const back = dialog.querySelector('[data-lightbox-back]');
  const steps = dialog.querySelector('[data-lightbox-steps]');
  let ownsLock = false;
  let collection = [];
  let index = 0;
  let academy = false;
  let swipe = null;
  function open() {
    if (dialog.open) return;
    if (!document.documentElement.classList.contains('site--locked')) ownsLock = true;
    document.documentElement.classList.add('site--locked');
    opener = document.activeElement;
    dialog.showModal();
  }
  function show(button) {
    swipe = null;
    const fromGallery = gallery && !gallery.hidden;
    const documentPages = button.dataset.companyPages?.split(' ').filter(Boolean);
    image.hidden = !!documentPages;
    if (pages) {
      pages.hidden = !documentPages;
      pages.replaceChildren(...(documentPages || []).map((src, pageIndex) => {
        const page = document.createElement('img');
        page.src = src;
        page.alt = `${button.dataset.imageTitle}, страница ${pageIndex + 1}`;
        page.width = 1414;
        page.height = 2000;
        return page;
      }));
    }
    if (!documentPages) {
      image.src = button.dataset.companyImage;
      image.alt = button.dataset.imageTitle;
    }
    title.textContent = button.dataset.imageTitle;
    if (gallery) gallery.hidden = true;
    if (view) view.hidden = false;
    view?.toggleAttribute('data-lightbox-swipe', collection.length > 1 && !documentPages);
    view?.classList.toggle(
      'company-lightbox__image--rotated',
      button.dataset.imageRotation === '90',
    );
    if (bottom) bottom.hidden = collection.length < 2;
    if (back) back.hidden = !academy;
    if (steps) {
      steps.hidden = collection.length < 2;
      steps.querySelector('[data-lightbox-count]').textContent =
        `${index + 1} / ${collection.length}`;
    }
    open();
    if (view) view.scrollTop = 0;
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
    button.addEventListener('click', (event) => {
      event.preventDefault();
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
  view?.addEventListener('pointerdown', (event) => {
    swipe = null;
    if (!view.hasAttribute('data-lightbox-swipe') || !event.isPrimary || event.button !== 0) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (event.pointerType !== 'touch') view.setPointerCapture(event.pointerId);
  });
  view?.addEventListener('pointerup', (event) => {
    if (swipe?.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  });
  view?.addEventListener('lostpointercapture', (event) => {
    if (swipe?.id === event.pointerId) swipe = null;
  });
  view?.addEventListener('dragstart', (event) => {
    if (view.hasAttribute('data-lightbox-swipe')) event.preventDefault();
  });
  dialog
    .querySelectorAll('[data-lightbox-step]')
    .forEach((button) =>
      button.addEventListener('click', () => step(Number(button.dataset.lightboxStep))),
    );
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button, a[href], [tabindex]')]
        .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first && ((!event.shiftKey && document.activeElement === last) ||
        (event.shiftKey && document.activeElement === first))) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
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
    swipe = null;
    if (ownsLock) document.documentElement.classList.remove('site--locked');
    ownsLock = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
}
