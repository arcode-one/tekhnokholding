export default function init(scene) {
  const image = scene.querySelector('[data-ui~=roof-background__image]');
  const copy = scene.querySelector('[data-ui~=hero__content]');
  const split = {
    left: scene.querySelector('[data-hero-split="left"]'),
    right: scene.querySelector('[data-hero-split="right"]'),
    divider: scene.querySelector('[data-hero-split="divider"]'),
    ring: scene.querySelector('[data-hero-split="ring"]'),
    buttonLeft: scene.querySelector('[data-hero-split="button-left"]'),
    buttonRight: scene.querySelector('[data-hero-split="button-right"]'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dividerGlow = scene.querySelector('[data-ui~=hero-gold__divider-glow]');
  const sideArcs = split.ring?.querySelector('svg');
  const oneSpark = scene.querySelector('[data-ui~=hero-gold__flare--one]');
  const zeroSpark = scene.querySelector('[data-ui~=hero-gold__flare--twenty]');
  const zeroTrack = scene.querySelector('#hero-zero-spark-track');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const sineInOut = (n) => (1 - Math.cos(Math.PI * n)) / 2;
  const SPLIT_DISTANCE = 0.6; // доля высоты экрана, за которую композиция раскрывается полностью
  let geometry = null;
  let frame = 0;
  let visible = false;

  function update() {
    frame = 0;
    if (reducedMotion.matches || !geometry) return;
    const y = window.scrollY;
    const { top, imageHeight, viewport, leftShift, rightShift } = geometry;
    // Фото не увеличено: при скролле оно отстаёт от экрана на 30% (уходит медленнее текста).
    // Освобождающийся верх при этом уже за пределами экрана, а низ обрезает слой хиро
    const imageY = Math.min(Math.max(0, y - top), imageHeight) * 0.3;
    image.style.transform = `translate3d(0,${imageY.toFixed(2)}px,0)`;

    if (!split.divider) return;
    const progress = clamp((y - top) / (viewport * SPLIT_DISTANCE));
    const p = sineInOut(progress);
    // Возвращаем прежние траектории без дробных transform на текстовых слоях.
    const left = `${Math.round(leftShift * p)}px`;
    const right = `${Math.round(rightShift * p)}px`;
    [split.left, split.buttonLeft].forEach((el) => {
      if (el) el.style.left = left;
    });
    [split.right, split.buttonRight].forEach((el) => {
      if (el) el.style.left = right;
    });
    if (oneSpark)
      oneSpark.style.transform = `translate3d(0,${(-geometry.oneSparkTravel * progress).toFixed(2)}px,0)`;
    if (zeroSpark && geometry.zeroOrbit.length) {
      // Контур начинается внизу нуля и идёт по часовой стрелке.
      const position = progress * (geometry.zeroOrbit.length - 1);
      const index = Math.floor(position);
      const a = geometry.zeroOrbit[index];
      const b = geometry.zeroOrbit[Math.min(index + 1, geometry.zeroOrbit.length - 1)];
      const fraction = position - index;
      const x = (a.x + (b.x - a.x) * fraction - 182) * geometry.zeroScale;
      const sparkY = (a.y + (b.y - a.y) * fraction - 160) * geometry.zeroScale;
      zeroSpark.style.transform = `translate3d(${x.toFixed(2)}px,${sparkY.toFixed(2)}px,0)`;
    }
    split.divider.style.opacity = (1 - p).toFixed(3);
    if (dividerGlow)
      dividerGlow.style.transform = `translate3d(0,${(-geometry.glowTravel * progress).toFixed(2)}px,0)`;
    if (split.ring) {
      // Декоративное кольцо расширяется и гаснет.
      split.ring.style.transform = `scale(${(1 + p * 0.35).toFixed(3)}, ${(1 + p * 0.1).toFixed(3)})`;
      split.ring.style.opacity = (1 - p).toFixed(3);
    }
    // Дуги исчезают в начале прокрутки.
    if (sideArcs) {
      const arcVisibility = 1 - clamp((y - top) / Math.min(64, viewport * 0.08));
      sideArcs.style.opacity = (arcVisibility * arcVisibility).toFixed(3);
    }
  }

  function scheduleUpdate() {
    if (!frame && visible && !document.hidden && !reducedMotion.matches)
      frame = requestAnimationFrame(update);
  }

  function measure() {
    image.style.removeProperty('transform');
    if (dividerGlow) dividerGlow.style.removeProperty('transform');
    if (sideArcs) sideArcs.style.removeProperty('opacity');
    [oneSpark, zeroSpark].forEach((spark) => spark?.style.removeProperty('transform'));
    Object.values(split).forEach((el) => {
      if (!el) return;
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
      el.style.removeProperty('left');
    });
    if (reducedMotion.matches) {
      geometry = null;
      return;
    }
    const y = window.scrollY;
    const zeroTrackLength = zeroTrack?.getTotalLength() || 0;
    geometry = {
      top: scene.getBoundingClientRect().top + y,
      height: scene.offsetHeight,
      imageHeight: image.offsetHeight,
      viewport: window.innerHeight,
      leftShift: 0,
      rightShift: 0,
      glowTravel: split.divider ? split.divider.offsetHeight * 0.53 : 0,
      oneSparkTravel: Math.max(0, (oneSpark?.parentElement.offsetHeight || 0) - 3),
      zeroScale: zeroSpark
        ? Math.min(
            zeroSpark.parentElement.offsetWidth / 244,
            zeroSpark.parentElement.offsetHeight / 164,
          )
        : 0,
      // Вычисляем SVG-траекторию только при измерении, не во время скролла.
      zeroOrbit: zeroTrack
        ? Array.from({ length: 181 }, (_, index) => {
            const point = zeroTrack.getPointAtLength((zeroTrackLength * index) / 180);
            return { x: point.x, y: point.y };
          })
        : [],
    };
    if (copy && split.left && split.right) {
      const box = copy.getBoundingClientRect();
      const left = split.left.getBoundingClientRect();
      const right = split.right.getBoundingClientRect();
      const buttonLeft = split.buttonLeft?.getBoundingClientRect();
      const buttonRight = split.buttonRight?.getBoundingClientRect();
      const mobileInset = window.innerWidth <= 767 ? Math.min(8, box.left / 2) : 0;
      geometry.leftShift = Math.min(
        0,
        box.left - mobileInset - Math.min(left.left, buttonLeft?.left ?? left.left),
      );
      geometry.rightShift = Math.max(
        0,
        box.right + mobileInset - Math.max(right.right, buttonRight?.right ?? right.right),
      );
    }
    update();
  }

  measure();
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) scheduleUpdate();
  }, { rootMargin: '100px' }).observe(scene);
  new ResizeObserver(measure).observe(scene);
  if (copy) new ResizeObserver(measure).observe(copy);
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  reducedMotion.addEventListener('change', measure);
  if (document.fonts) document.fonts.ready.then(measure);
}
