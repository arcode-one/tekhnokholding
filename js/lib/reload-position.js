// Runs in the head so a reload cannot paint the top before restoring the scroll.
(() => {
  const root = document.documentElement;
  const scrollKey = () => `site:scroll:${location.pathname}${location.search}${location.hash}`;
  const key = scrollKey();
  let pending = false;
  let saved;
  addEventListener('pagehide', () => {
    const currentKey = scrollKey();
    if (pending && currentKey === key) return;
    try { sessionStorage.setItem(currentKey, String(scrollY)); } catch {}
  });

  if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;
  try { saved = Number(sessionStorage.getItem(key)); } catch { return; }
  if (!Number.isFinite(saved) || saved <= 0) return;

  pending = true;
  root.classList.add('site--restoring-scroll');
  const controller = new AbortController();
  const observer = new MutationObserver(() => {
    if (root.dataset.blocksReady !== 'true') return;
    observer.disconnect();
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!pending) return;
      scrollTo({ top: saved, behavior: 'instant' });
      requestAnimationFrame(finish);
    });
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-blocks-ready'] });

  // A slow or failed enhancement must not keep the page hidden.
  const timeout = setTimeout(() => {
    scrollTo({ top: saved, behavior: 'instant' });
    finish();
  }, 1800);

  function finish() {
    pending = false;
    clearTimeout(timeout);
    observer.disconnect();
    controller.abort();
    root.classList.remove('site--restoring-scroll');
  }

  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'pagehide'])
    addEventListener(event, finish, { passive: true, signal: controller.signal });
})();
