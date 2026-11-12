// Prepare media while the logo plays; do not wait for scroll-effect initialization.
export default function initHeroVideo(openingReady) {
  const video = document.querySelector('.roof-background__video');
  if (!video) return;
  const hero = document.querySelector('[data-ui~=hero]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ready = !document.documentElement.classList.contains('site--preloading');
  let playingRequest = false;
  let retries = [];
  video.muted = video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  function prepare() {
    if (reduced.matches || video.hasAttribute('src')) return;
    video.preload = 'auto';
    video.src = video.dataset.src;
    video.load();
  }
  function inView() {
    const rect = hero.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight;
  }
  function sync() {
    if (!ready || document.hidden || reduced.matches || !inView()) {
      video.pause();
      return;
    }
    prepare();
    video.autoplay = true;
    if (!video.paused || playingRequest) return;
    playingRequest = true;
    video.play().catch(() => {
      // A browser policy may still require a gesture (e.g. Low Power Mode).
    }).finally(() => { playingRequest = false; });
  }
  function resume() {
    retries.forEach(clearTimeout);
    sync();
    retries = [150, 500, 1200, 2500].map((delay) => setTimeout(sync, delay));
  }
  prepare();
  video.addEventListener('playing', () => video.setAttribute('data-playing', ''));
  video.addEventListener('error', () => video.removeAttribute('data-playing'));
  video.addEventListener('canplay', sync);
  new IntersectionObserver(sync).observe(hero);
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  reduced.addEventListener('change', sync);
  document.addEventListener('touchend', sync, { passive: true });
  document.addEventListener('click', sync);
  window.addEventListener('pagehide', () => {
    retries.forEach(clearTimeout);
    video.pause();
  });
  openingReady.then(() => {
    ready = true;
    // Play after the overlay has actually left the rendered frame, not on scroll.
    requestAnimationFrame(() => requestAnimationFrame(resume));
  });
}
