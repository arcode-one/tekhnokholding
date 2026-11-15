let quotes;
const HOVER_DELAY = 450;

function loadQuotes() {
  quotes ??= fetch(new URL('../../team.html', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error('Could not load team page');
      return response.text();
    })
    .then((html) => {
      const source = document.createElement('template');
      source.innerHTML = html;
      return new Map([...source.content.querySelectorAll('.team-person__reveal[id]')].map((quote) => [
        quote.id,
        [...quote.querySelectorAll('blockquote p')].map((paragraph) => paragraph.textContent.trim()),
      ]));
    })
    .catch((error) => {
      quotes = undefined;
      throw error;
    });
  return quotes;
}

export default function initQuotes(people) {
  const dialog = document.querySelector('[data-home-team-quote]');
  if (typeof dialog?.showModal !== 'function') return;

  const portrait = dialog.querySelector('[data-team-quote-portrait]');
  const title = dialog.querySelector('[data-team-quote-name]');
  const role = dialog.querySelector('[data-team-quote-role]');
  const quote = dialog.querySelector('[data-team-quote-text]');
  const status = dialog.querySelector('[data-team-quote-status]');
  const fallback = dialog.querySelector('[data-team-quote-fallback]');
  const mouseHover = matchMedia('(hover: hover) and (pointer: fine)');
  let opener;
  let ownsLock = false;
  let request = 0;
  let hoverTimer = 0;
  let blockedHover;

  function cancelHover() {
    clearTimeout(hoverTimer);
    hoverTimer = 0;
  }

  async function open(card, button) {
    if (dialog.open) return;
    cancelHover();
    const current = ++request;
    opener = button;
    blockedHover = card.hasAttribute('data-team-quote-hover') ? button : undefined;
    const photo = card.querySelector('img').cloneNode();
    photo.loading = 'eager';
    portrait.replaceChildren(photo);
    title.textContent = card.querySelector('h3').textContent;
    role.replaceChildren(...card.querySelector('p').cloneNode(true).childNodes);
    quote.hidden = true;
    fallback.hidden = true;
    status.textContent = 'Загружаем цитату…';
    dialog.showModal();
    quote.parentElement.scrollTop = 0;
    if (!document.documentElement.classList.contains('site--locked')) {
      document.documentElement.classList.add('site--locked');
      ownsLock = true;
    }

    try {
      const paragraphs = (await loadQuotes()).get(card.dataset.teamQuote);
      if (!dialog.open || current !== request) return;
      if (!paragraphs?.length) throw new Error('Quote is missing');
      quote.replaceChildren(...paragraphs.map((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      quote.hidden = false;
      status.textContent = '';
    } catch {
      if (!dialog.open || current !== request) return;
      status.textContent = 'Не удалось загрузить цитату';
      fallback.hidden = false;
    }
  }

  for (const card of people.querySelectorAll('[data-team-quote]')) {
    const heading = card.querySelector('h3');
    const button = document.createElement('button');
    button.className = 'company-team__quote-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Читать цитату: ${heading.textContent}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.addEventListener('click', () => open(card, button));
    if (card.hasAttribute('data-team-quote-hover')) {
      button.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse' || !mouseHover.matches || dialog.open || hoverTimer || blockedHover === button) return;
        hoverTimer = setTimeout(() => {
          hoverTimer = 0;
          if (button.matches(':hover') && !card.closest('[inert]')) open(card, button);
        }, HOVER_DELAY);
      });
      button.addEventListener('pointerleave', cancelHover);
    }
    card.append(button);
    heading.insertAdjacentHTML('beforeend', '<svg class="company-team__quote-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="icons/sprite.svg#arrow-up" /></svg>');
  }

  // Wait for the mouse to leave the opener after dismissal, even if the dialog sat over it.
  document.addEventListener('pointermove', (event) => {
    if (!blockedHover || dialog.open || event.pointerType !== 'mouse') return;
    const { left, right, top, bottom } = blockedHover.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      blockedHover = undefined;
    }
  });
  window.addEventListener('scroll', cancelHover, { passive: true });
  mouseHover.addEventListener('change', cancelHover);

  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (ownsLock) document.documentElement.classList.remove('site--locked');
    ownsLock = false;
    opener?.focus({ preventScroll: true });
  });
}
