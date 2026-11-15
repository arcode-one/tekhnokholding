let quotes;

function loadQuotes() {
  quotes ??= fetch(new URL('../../team.html', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error('Could not load team page');
      return response.text();
    })
    .then((html) => {
      const source = document.createElement('template');
      source.innerHTML = html;
      return new Map([...source.content.querySelectorAll('.team-person__reveal[id]')].map((quote) => {
        const photo = quote.closest('.team-person').querySelector('.team-person__portrait');
        const paragraphs = [...quote.querySelectorAll('blockquote p')].map((paragraph) => paragraph.textContent.trim());
        return [quote.id, { photo, paragraphs }];
      }));
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
  const body = dialog.querySelector('.company-team__quote-body');
  const title = dialog.querySelector('[data-team-quote-name]');
  const role = dialog.querySelector('[data-team-quote-role]');
  const quote = dialog.querySelector('[data-team-quote-text]');
  const status = dialog.querySelector('[data-team-quote-status]');
  const fallback = dialog.querySelector('[data-team-quote-fallback]');
  let opener;
  let ownsLock = false;
  let request = 0;

  async function open(card, button) {
    if (dialog.open) return;
    const current = ++request;
    opener = button;
    portrait.replaceChildren();
    portrait.hidden = false;
    title.textContent = card.querySelector('h3').textContent;
    role.replaceChildren(...card.querySelector('p').cloneNode(true).childNodes);
    quote.hidden = true;
    fallback.hidden = true;
    status.textContent = 'Загружаем цитату…';
    dialog.showModal();
    body.scrollTop = 0;
    if (!document.documentElement.classList.contains('site--locked')) {
      document.documentElement.classList.add('site--locked');
      ownsLock = true;
    }

    try {
      const entry = (await loadQuotes()).get(card.dataset.teamQuote);
      if (!dialog.open || current !== request) return;
      if (!entry?.paragraphs.length) throw new Error('Quote is missing');
      const photo = entry.photo.cloneNode();
      photo.loading = 'eager';
      photo.alt = '';
      photo.sizes = '(max-width: 451px) calc(100vw - 32px), 420px';
      portrait.replaceChildren(photo);
      quote.replaceChildren(...entry.paragraphs.map((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      quote.hidden = false;
      status.textContent = '';
    } catch {
      if (!dialog.open || current !== request) return;
      portrait.hidden = true;
      status.textContent = 'Не удалось загрузить цитату';
      fallback.hidden = false;
    }
  }

  for (const card of people.querySelectorAll('[data-team-quote]')) {
    const button = document.createElement('button');
    button.className = 'company-team__quote-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Читать цитату: ${card.querySelector('h3').textContent}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    button.addEventListener('click', () => open(card, button));
    card.append(button);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      loadQuotes().catch(() => {});
    }, { rootMargin: '240px 0px' });
    observer.observe(people);
  }

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
