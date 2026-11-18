// Restore the saved position before the page becomes visible.
(() => {
  const root = document.documentElement;
  const scrollKey = () => `site:scroll:${location.pathname}${location.search}${location.hash}`;
  const key = scrollKey();
  const isPosition = (y) => Number.isFinite(y) && y >= 0;
  let pending = false;
  let saved;
  addEventListener('pagehide', () => {
    const currentKey = scrollKey();
    if (pending && currentKey === key) return;
    const y = scrollY;
    try {
      sessionStorage.setItem(currentKey, String(y));
      sessionStorage.setItem('site:last-page', JSON.stringify({ url: location.href, y }));
    } catch {}
    try { history.replaceState({ ...history.state, siteScrollY: y }, ''); } catch {}
  });

  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  const restoringHistory = navigationType === 'reload' || navigationType === 'back_forward';
  try {
    const requested = JSON.parse(sessionStorage.getItem('site:return-position'));
    if (requested) {
      sessionStorage.removeItem('site:return-position');
      if (requested.url === location.href && isPosition(requested.y)) {
        saved = requested.y;
        root.dataset.returnedToSource = 'true';
      }
    }
  } catch {}
  if (saved === undefined && restoringHistory) {
    const historyPosition = history.state?.siteScrollY;
    // A reload can retain the old history state even after pagehide saves
    // the current position. Back/forward still needs the entry-specific one.
    if (navigationType === 'reload' || !isPosition(historyPosition)) {
      try {
        const value = sessionStorage.getItem(key);
        const position = value === null ? undefined : Number(value);
        if (isPosition(position)) saved = position;
      } catch {}
    }
    saved ??= historyPosition;
  }
  if (!isPosition(saved)) return;

  // Zero is a saved position too. Otherwise Safari can restore an older,
  // nonzero history position behind the preloader after reloading at the top.
  history.scrollRestoration = 'manual';

  pending = true;
  root.classList.add('site--restoring-scroll');
  const controller = new AbortController();
  let pageShown = document.readyState === 'complete';
  let settling = false;
  const observer = new MutationObserver(settle);
  observer.observe(root, { attributes: true, attributeFilter: ['data-blocks-ready'] });
  addEventListener('pageshow', () => {
    pageShown = true;
    settle();
  }, { once: true, signal: controller.signal });

  function settle() {
    if (!pending || settling || !pageShown || root.dataset.blocksReady !== 'true') return;
    settling = true;
    observer.disconnect();
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      requestAnimationFrame(() => {
        if (!pending) return;
        restore();
        requestAnimationFrame(finish);
      });
    });
  }

  // Show a usable position while scripts load. Reapply it once the browser
  // has handled the URL fragment and the final layout is ready.
  const reveal = setTimeout(() => {
    restore();
    root.classList.remove('site--restoring-scroll');
  }, 1800);

  function restore() {
    scrollTo({ top: saved, behavior: 'instant' });
    document.dispatchEvent(new Event('site:scroll-restored'));
  }

  function finish(event) {
    if (!pending) return;
    pending = false;
    clearTimeout(reveal);
    observer.disconnect();
    controller.abort();
    root.classList.remove('site--restoring-scroll');
    if (event?.type === 'pagehide') {
      history.scrollRestoration = 'auto';
      return;
    }

    // WebKit can reapply its reload position after we restore ours if native
    // restoration is re-enabled before the viewport settles.
    const resume = setTimeout(resumeNativeRestoration, 600);
    addEventListener('pagehide', resumeNativeRestoration, { once: true });

    function resumeNativeRestoration() {
      clearTimeout(resume);
      removeEventListener('pagehide', resumeNativeRestoration);
      history.scrollRestoration = 'auto';
    }
  }

  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'pagehide'])
    addEventListener(event, finish, { passive: true, signal: controller.signal });
})();
