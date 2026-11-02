export default function init(outer) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = [outer].map((outer) => ({
    outer,
    image: outer.querySelector('img'),
    visible: false,
  }));
  if (!frames.length) return;
  let frame = 0;
  function render() {
    frame = 0;
    frames.forEach((item) => {
      if (!item.visible || !item.image) return;
      if (reduced.matches) {
        item.image.style.transform = '';
        return;
      }
      const rect = item.outer.getBoundingClientRect();
      const progress = Math.max(
        -1,
        Math.min(
          1,
          (rect.top + rect.height / 2 - innerHeight / 2) / (innerHeight / 2 + rect.height / 2),
        ),
      );
      item.image.style.transform = `translate3d(0,${progress * 2.4}%,0) scale(1.055)`;
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  const byOuter = new Map(frames.map((item) => [item.outer, item]));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        byOuter.get(entry.target).visible = entry.isIntersecting;
      });
      schedule();
    },
    { rootMargin: '80px' },
  );
  frames.forEach((item) => observer.observe(item.outer));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  reduced.addEventListener('change', () => {
    frames.forEach((item) => {
      if (item.image) item.image.style.transform = '';
    });
    schedule();
  });
}
