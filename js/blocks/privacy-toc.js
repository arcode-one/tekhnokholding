export default function init(nav) {
  const entries = [...nav.querySelectorAll('a[href^="#"]')]
    .map((link) => ({
      link,
      heading: document.getElementById(link.hash.slice(1)),
      top: 0,
    }))
    .filter(({ heading }) => heading);
  if (!entries.length) return;

  let active = -1;
  let margin = 0;
  let frame = 0;

  function render() {
    frame = 0;
    const line = scrollY + Math.max(margin, Math.min(innerHeight * 0.25, 240));
    let next = 0;
    entries.forEach((entry, index) => {
      if (entry.top <= line + 1) next = index;
    });
    if (next === active) return;
    active = next;
    entries.forEach(({ link }, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function measure() {
    entries.forEach((entry) => {
      entry.top = entry.heading.getBoundingClientRect().top + scrollY;
    });
    margin = parseFloat(getComputedStyle(entries[0].heading).scrollMarginTop) || 0;
    schedule();
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  addEventListener('hashchange', schedule);
  document.fonts?.ready.then(measure);
  const text = nav.closest('.privacy-page')?.querySelector('.privacy-page__text');
  if (text) new ResizeObserver(measure).observe(text);
  measure();
}
