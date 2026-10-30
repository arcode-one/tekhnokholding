/* Схема IndexHero референса: закреплённое окно фона и движение фотографии
   на половину её высоты. Lenis уже сглаживает реальную позицию страницы.
   Поверх этого хиро «раскрывается» от скролла: блок «№ 1» уезжает к левому краю контейнера,
   «20 лет на рынке» к правому. Каждая кнопка движется вместе со своей стороной. */
(function () {
  const scene = document.querySelector('.roof-background');
  if (!scene) return;
  const image = scene.querySelector('.roof-background__image');
  const copy = scene.querySelector('.hero__content');
  const hero = scene.querySelector('.hero');
  const split = {
    left: scene.querySelector('[data-hero-split="left"]'),
    right: scene.querySelector('[data-hero-split="right"]'),
    divider: scene.querySelector('[data-hero-split="divider"]'),
    ring: scene.querySelector('[data-hero-split="ring"]'),
    buttonLeft: scene.querySelector('[data-hero-split="button-left"]'),
    buttonRight: scene.querySelector('[data-hero-split="button-right"]'),
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dividerGlow = scene.querySelector('.hero-gold__divider-glow');
  const sideArcs = split.ring?.querySelector('svg');
  const oneSpark = scene.querySelector('.hero-gold__flare--one');
  const zeroSpark = scene.querySelector('.hero-gold__flare--twenty');
  const zeroTrack = scene.querySelector('#hero-zero-spark-track');
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const sineInOut = (n) => (1 - Math.cos(Math.PI * n)) / 2;
  const SPLIT_DISTANCE = 0.6;   // доля высоты экрана, за которую композиция раскрывается полностью
  let geometry = null;
  let frame = 0;

  function update() {
    frame = 0;
    if (reducedMotion.matches || !geometry) return;
    const y = window.scrollY;
    const { top, imageHeight, viewport, leftShift, rightShift } = geometry;
    // Фото не увеличено: при скролле оно отстаёт от экрана на 30% (уходит медленнее текста).
    // Освобождающийся верх при этом уже за пределами экрана, а низ обрезает слой хиро
    const imageY = Math.min(Math.max(0, y - top), imageHeight) * 0.3;
    image.style.transform = `translate3d(0,${imageY.toFixed(2)}px,0)`;

    // Верхняя композиция уходит целиком после первой трети хиро.
    // Прямая связь с позицией скролла даёт такое же появление при возврате.
    const fade = clamp((y - geometry.fadeStart) / geometry.fadeDistance);
    copy.style.opacity = (1 - sineInOut(fade)).toFixed(3);
    copy.inert = fade === 1;

    if (!split.left) return;
    const progress = clamp((y - top) / (viewport * SPLIT_DISTANCE));
    const p = sineInOut(progress);
    if (oneSpark) oneSpark.style.transform = `translate3d(0,${(-geometry.oneSparkTravel * progress).toFixed(2)}px,0)`;
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
    split.left.style.transform = `translate3d(${(leftShift * p).toFixed(2)}px,0,0)`;
    split.right.style.transform = `translate3d(${(rightShift * p).toFixed(2)}px,0,0)`;
    split.divider.style.opacity = (1 - p).toFixed(3);
    if (dividerGlow) dividerGlow.style.transform = `translate3d(0,${(-geometry.glowTravel * progress).toFixed(2)}px,0)`;
    if (split.ring) {
      // Кольцо расходится вместе с цифрами и гаснет
      split.ring.style.transform = `scale(${(1 + p * 0.35).toFixed(3)}, ${(1 + p * 0.1).toFixed(3)})`;
      split.ring.style.opacity = (1 - p).toFixed(3);
    }
    // Дуги исчезают раньше, чем разъезжающиеся подписи доходят до них.
    // Затемнение сохраняет прежний, более медленный уход вместе с композицией.
    if (sideArcs) {
      const arcVisibility = 1 - clamp((y - top) / Math.min(64, viewport * .08));
      sideArcs.style.opacity = (arcVisibility * arcVisibility).toFixed(3);
    }
    if (split.buttonLeft) split.buttonLeft.style.transform = split.left.style.transform;
    if (split.buttonRight) split.buttonRight.style.transform = split.right.style.transform;
  }

  function scheduleUpdate() {
    if (!frame && !reducedMotion.matches) frame = requestAnimationFrame(update);
  }

  function measure() {
    image.style.removeProperty('transform');
    copy.style.removeProperty('opacity');
    copy.inert = false;
    if (dividerGlow) dividerGlow.style.removeProperty('transform');
    if (sideArcs) sideArcs.style.removeProperty('opacity');
    [oneSpark, zeroSpark].forEach((spark) => spark?.style.removeProperty('transform'));
    Object.values(split).forEach((el) => {
      if (!el) return;
      el.style.removeProperty('transform');
      el.style.removeProperty('opacity');
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
      fadeStart: hero.getBoundingClientRect().top + y + hero.offsetHeight * .35,
      fadeDistance: hero.offsetHeight * .2,
      leftShift: 0,
      rightShift: 0,
      glowTravel: split.divider ? split.divider.offsetHeight * .53 : 0,
      oneSparkTravel: Math.max(0, (oneSpark?.parentElement.offsetHeight || 0) - 3),
      zeroScale: zeroSpark ? Math.min(zeroSpark.parentElement.offsetWidth / 244, zeroSpark.parentElement.offsetHeight / 164) : 0,
      // Вычисляем SVG-траекторию только при измерении, не во время скролла.
      zeroOrbit: zeroTrack ? Array.from({ length: 181 }, (_, index) => {
        const point = zeroTrack.getPointAtLength(zeroTrackLength * index / 180);
        return { x: point.x, y: point.y };
      }) : [],
    };
    if (split.left) {
      // Края контейнера = поля хиро; целевые сдвиги считаются от исходного положения блоков
      const box = copy.getBoundingClientRect();
      const left = split.left.getBoundingClientRect();
      const right = split.right.getBoundingClientRect();
      const buttonLeft = split.buttonLeft?.getBoundingClientRect();
      const buttonRight = split.buttonRight?.getBoundingClientRect();
      const mobileInset = window.innerWidth <= 767 ? Math.min(8, box.left / 2) : 0;
      geometry.leftShift = Math.min(0, box.left - mobileInset - Math.min(left.left, buttonLeft?.left ?? left.left));
      geometry.rightShift = Math.max(0, box.right + mobileInset - Math.max(right.right, buttonRight?.right ?? right.right));
    }
    update();
  }

  measure();
  // Пока идёт появление после превью, блоки сдвинуты на 14px; пересчитываем, когда они встали на место
  const loadedObserver = new MutationObserver(() => {
    if (!document.documentElement.classList.contains('is-loaded')) return;
    loadedObserver.disconnect();
    setTimeout(measure, 1300);
  });
  if (!document.documentElement.classList.contains('is-loaded')) {
    loadedObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
  new ResizeObserver(measure).observe(scene);
  new ResizeObserver(measure).observe(copy);
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  reducedMotion.addEventListener('change', measure);
  if (document.fonts) document.fonts.ready.then(measure);
})();
