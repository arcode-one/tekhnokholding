// Native restoration handles history; settle reloads after fonts and blocks are ready.
export default function restoreReloadPosition(root) {
  const key = `site:scroll:${location.pathname}${location.search}${location.hash}`;
  addEventListener('pagehide', () => {
    try { sessionStorage.setItem(key, String(scrollY)); } catch {}
  });
  if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;
  let saved;
  try { saved = sessionStorage.getItem(key); } catch { return; }
  if (saved === null || !Number.isFinite(Number(saved))) return;
  let interrupted = false;
  const controller = new AbortController();
  const cancel = () => { interrupted = true; controller.abort(); };
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
    addEventListener(event, cancel, { passive: true, signal: controller.signal });
  const ready = new Promise((resolve) => {
    if (root.dataset.blocksReady === 'true') { resolve(); return; }
    const observer = new MutationObserver(() => {
      if (root.dataset.blocksReady !== 'true') return;
      observer.disconnect();
      resolve();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-blocks-ready'] });
  });
  const loaded = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else addEventListener('load', resolve, { once: true });
  });
  Promise.all([ready, loaded, document.fonts.ready]).then(() => requestAnimationFrame(() => {
    if (!interrupted) scrollTo({ top: Number(saved), behavior: 'instant' });
    controller.abort();
  }));
}
