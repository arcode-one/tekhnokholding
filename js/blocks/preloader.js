export default function initPreloader() {
  const root = document.documentElement;
  const overlay = document.querySelector('.preloader');
  if (!overlay) return;
  if (!root.classList.contains('site--preloading')) {
    overlay.remove();
    return;
  }
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const release = () => {
    overlay.remove();
    root.classList.remove('site--preloading');
    root.classList.add('site--loaded');
    clearTimeout(window.sitePreloaderTimeout);
    document.dispatchEvent(new Event('site:scroll-lock-change'));
    resolveReady();
  };
  const fallback = setTimeout(release, 6000);
  ready.then(() => clearTimeout(fallback));
  window.addEventListener('pagehide', release, { once: true });
  const logo = overlay.querySelector('.preloader__logo');
  Promise.race([logo.decode().catch(() => {}), wait(250)])
    .then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    .then(() => {
      if (!overlay.isConnected) return;
      overlay.classList.add('preloader--drawing');
      return wait(3600);
    })
    .then(async () => {
      if (!overlay.isConnected) return;
      overlay.querySelector('.preloader__lockup').classList.add('preloader__lockup--out');
      await wait(350);
      overlay.classList.add('preloader--leaving');
      root.classList.add('site--loaded');
      await wait(950);
      release();
    }).catch(release);
  return ready;
}
