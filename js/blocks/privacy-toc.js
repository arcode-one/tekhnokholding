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
    const { scrollHeight, clientHeight } = document.scrollingElement;
    const maxScroll = scrollHeight - clientHeight;
    const y = scrollY;
    let next = 0;
    if (maxScroll > 0 && y >= maxScroll - 1) {
      next = entries.length - 1;
    } else {
      const offset = Math.max(margin, Math.min(innerHeight * 0.25, 240));
      const lastOffset = entries[entries.length - 1].top - maxScroll;
      // Let the reading line reach headings that cannot scroll to the top.
      const endRange = Math.min(clientHeight, maxScroll);
      const endProgress = endRange > 0 ? Math.max(0, 1 - (maxScroll - y) / endRange) : 0;
      const line = y + offset + Math.max(0, lastOffset - offset) * endProgress;
      entries.forEach((entry, index) => {
        if (entry.top <= line + 1) next = index;
      });
    }
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
