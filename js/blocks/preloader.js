export default function initPreloader() {
  const root = document.documentElement;
  const overlay = document.querySelector('.preloader');
  if (!overlay) return;
  if (!root.classList.contains('site--preloading')) {
    overlay.remove();
    return;
  }
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const release = () => {
    overlay.remove();
    root.classList.remove('site--preloading');
    root.classList.add('site--loaded');
    clearTimeout(window.sitePreloaderTimeout);
    document.dispatchEvent(new Event('site:scroll-lock-change'));
  };
  const loaded = document.readyState === 'complete' ? Promise.resolve() :
    new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  window.addEventListener('pagehide', release, { once: true });
  Promise.all([loaded, document.fonts.ready, wait(3600)])
    .then(async () => {
      if (!overlay.isConnected) return;
      overlay.querySelector('.preloader__lockup').classList.add('preloader__lockup--out');
      await wait(350);
      overlay.classList.add('preloader--leaving');
      root.classList.add('site--loaded');
      await wait(950);
      release();
    }).catch(release);
}
