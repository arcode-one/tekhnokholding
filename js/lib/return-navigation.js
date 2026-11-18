const home = new URL('../../index.html', import.meta.url);
const site = new URL('.', home);
const backSelector = '[data-return-to-source], .page-back__button, .object-detail__back';
const logoSelector = '.header__logo, .dock__logo, .menu__logo, .site-footer__brand';
const sourceParam = '_from';

function localPage(href) {
  if (!href) return null;
  try {
    const url = new URL(href, location.href);
    if (url.origin === site.origin && url.pathname.startsWith(site.pathname) &&
      (url.pathname === site.pathname || url.pathname.endsWith('.html'))) return url;
  } catch {}
  return null;
}

const pageKey = (url) => url.pathname.replace(/\/index\.html$/, '/') + url.search;

function readSnapshot(value) {
  if (!value) return null;
  try {
    const { url, y } = JSON.parse(value);
    const page = localPage(url);
    if (page && Number.isFinite(y) && y >= 0) return { url: page.href, y };
  } catch {}
  return null;
}

export default function initReturnNavigation() {
  const current = new URL(location.href);
  const incoming = readSnapshot(current.searchParams.get(sourceParam));
  const referrer = localPage(document.referrer);
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  if (current.searchParams.has(sourceParam)) current.searchParams.delete(sourceParam);

  let entry = history.state?.siteReturn;
  if (!entry && referrer && pageKey(referrer) !== pageKey(current)) {
    let lastPage;
    try { lastPage = readSnapshot(sessionStorage.getItem('site:last-page')); } catch {}
    const matchesReferrer = (snapshot) => snapshot && pageKey(new URL(snapshot.url)) === pageKey(referrer);
    if (matchesReferrer(incoming)) entry = { ...incoming, separateTab: true };
    else if (navigationType === 'navigate' && !document.documentElement.dataset.returnedToSource &&
      history.length > 1 && matchesReferrer(lastPage)) entry = { ...lastPage, canGoBack: true };
  }

  if (entry || current.href !== location.href) {
    history.replaceState({ ...history.state, siteReturn: entry }, '', current);
  }

  const source = localPage(entry?.url);
  if (source) {
    document.querySelectorAll(backSelector).forEach((link) => {
      if (!link.textContent.trim()) link.setAttribute('aria-label', 'Вернуться назад');
      link.title = 'Вернуться назад';
    });
    addEventListener('hashchange', () => {
      if (history.state?.siteReturn) return;
      history.replaceState({ ...history.state, siteReturn: { ...entry, canGoBack: false } }, '');
    });
  }

  function returnToSource() {
    if (history.state?.siteReturn?.canGoBack) {
      history.back();
      return;
    }
    const reopenSource = () => {
      if (window.closed) return;
      try { sessionStorage.setItem('site:return-position', JSON.stringify({ url: source.href, y: entry.y })); } catch {}
      location.replace(source.href);
    };
    if (entry.separateTab) {
      window.close();
      setTimeout(reopenSource, 120);
    } else reopenSource();
  }

  function handleClick(event) {
    if (event.defaultPrevented) return;
    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download')) return;
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (plain && source && (link.matches(backSelector) ||
      (link.matches(logoSelector) && pageKey(source) === pageKey(home)))) {
      event.preventDefault();
      returnToSource();
      return;
    }

    // A new tab has its own session storage, so pass the source with the link.
    if (link.target !== '_blank' && event.button !== 1 && !event.metaKey && !event.ctrlKey && !event.shiftKey) return;
    const destination = localPage(link.href);
    const origin = localPage(location.href);
    if (!destination || !origin || pageKey(destination) === pageKey(origin)) return;
    const original = link.getAttribute('href');
    destination.searchParams.set(sourceParam, JSON.stringify({ url: origin.href, y: scrollY }));
    link.href = destination.href;
    setTimeout(() => {
      if (link.href === destination.href) link.setAttribute('href', original);
    }, 0);
  }

  document.addEventListener('click', handleClick);
  document.addEventListener('auxclick', (event) => {
    if (event.button === 1) handleClick(event);
  });
}
