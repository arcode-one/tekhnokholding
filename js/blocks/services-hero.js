export default function init(hero) {
  let visible = true;
  const sync = () => {
    hero.toggleAttribute('data-ambient-paused', !visible || document.hidden);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  document.addEventListener('visibilitychange', sync);
  sync();
}
