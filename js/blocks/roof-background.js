import { createScrollMotion, readMotionViewport, sampleMotion } from '../lib/scroll-motion.js';

export default function init(scene) {
  const motion = createScrollMotion();
  const hero = scene.querySelector('[data-ui~=hero]') ?? scene;
  const visual = scene.querySelector('.roof-background__visual');
  const video = visual.querySelector('video');
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
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)');
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
  let measureFrame = 0;
  let visible = false;
  let lastSplitProgress;
  let zeroOrbit;

  // Set the properties as well as attributes before assigning a media source.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('webkit-playsinline', '');

  function syncVideo() {
    if (!visible || document.hidden || reducedMotion.matches) {
      video.pause();
      return;
    }
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    video.play().catch(() => {});
  }

  video.addEventListener('playing', () => video.setAttribute('data-playing', ''));
  video.addEventListener('error', () => video.removeAttribute('data-playing'));
  video.addEventListener('canplay', syncVideo);
  window.addEventListener('pageshow', syncVideo);
  // iOS power-saving/autoplay policies may require an actual user gesture.
  const retryVideo = () => { if (video.paused) syncVideo(); };
  document.addEventListener('touchend', retryVideo, { passive: true });
  document.addEventListener('click', retryVideo);

  function update(timestamp) {
    frame = 0;
    if (reducedMotion.matches || !geometry || motion.enabled) return;
    const { y } = readMotionViewport(timestamp);
    const { top, imageHeight, viewport, leftShift, rightShift, useTransform } = geometry;
    // Фото не увеличено: при скролле оно отстаёт от экрана на 30% (уходит медленнее текста).
    // Освобождающийся верх при этом уже за пределами экрана, а низ обрезает слой хиро
    const imageY = Math.min(Math.max(0, y - top), imageHeight) * 0.3;
    visual.style.transform = `translate3d(0,${imageY.toFixed(2)}px,0)`;

    if (!split.divider) return;
    const progress = clamp((y - top) / (viewport * SPLIT_DISTANCE));
    if (progress === lastSplitProgress) return;
    lastSplitProgress = progress;
    const p = sineInOut(progress);
    // Keep whole-pixel positions. On touch screens, avoid laying out the text on each frame.
    const left = `${Math.round(leftShift * p)}px`;
    const right = `${Math.round(rightShift * p)}px`;
    const property = useTransform ? 'transform' : 'left';
    [split.left, split.buttonLeft].forEach((el) => {
      if (el) el.style[property] = useTransform ? `translate3d(${left},0,0)` : left;
    });
    [split.right, split.buttonRight].forEach((el) => {
      if (el) el.style[property] = useTransform ? `translate3d(${right},0,0)` : right;
    });
    if (oneSpark)
      oneSpark.style.transform = `translate3d(0,${(-geometry.oneSparkTravel * progress).toFixed(2)}px,0)`;
    if (zeroSpark && zeroOrbit.length) {
      // Контур начинается внизу нуля и идёт по часовой стрелке.
      const position = progress * (zeroOrbit.length - 1);
      const index = Math.floor(position);
      const a = zeroOrbit[index];
      const b = zeroOrbit[Math.min(index + 1, zeroOrbit.length - 1)];
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
    if (!motion.enabled && !frame && visible && !document.hidden && !reducedMotion.matches)
      frame = requestAnimationFrame(update);
  }

  function measure() {
    measureFrame = 0;
    motion.clear();
    lastSplitProgress = undefined;
    visual.style.removeProperty('transform');
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
    if (!zeroOrbit) {
      const length = zeroTrack?.getTotalLength() || 0;
      // The SVG path is fixed in viewBox coordinates, including after resizing.
      zeroOrbit = zeroTrack ? Array.from({ length: 181 }, (_, index) => {
        const { x, y } = zeroTrack.getPointAtLength((length * index) / 180);
        return { x, y };
      }) : [];
    }
    geometry = {
      top: scene.getBoundingClientRect().top + y,
      imageHeight: visual.offsetHeight,
      viewport: touch.matches ? hero.offsetHeight : window.innerHeight,
      useTransform: touch.matches,
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
    if (motion.enabled) {
      const { top, viewport, imageHeight, leftShift, rightShift } = geometry;
      const end = top + viewport * SPLIT_DISTANCE;
      motion.set(visual, { transform: ['translate3d(0,0,0)', `translate3d(0,${imageHeight * .3}px,0)`] }, top, top + imageHeight);
      [split.left, split.buttonLeft].forEach((el) => motion.set(el,
        sampleMotion((p) => ({ transform: `translate3d(${leftShift * sineInOut(p)}px,0,0)` })), top, end));
      [split.right, split.buttonRight].forEach((el) => motion.set(el,
        sampleMotion((p) => ({ transform: `translate3d(${rightShift * sineInOut(p)}px,0,0)` })), top, end));
      motion.set(split.divider, sampleMotion((p) => ({ opacity: 1 - sineInOut(p) })), top, end);
      motion.set(split.ring, sampleMotion((p) => ({
        transform: `scale(${1 + sineInOut(p) * .35},${1 + sineInOut(p) * .1})`,
        opacity: 1 - sineInOut(p),
      })), top, end);
      motion.set(sideArcs, sampleMotion((p) => ({ opacity: (1 - p) ** 2 })), top, top + Math.min(64, viewport * .08));
      motion.set(oneSpark, { transform: ['translate3d(0,0,0)', `translate3d(0,${-geometry.oneSparkTravel}px,0)`] }, top, end);
      motion.set(dividerGlow, { transform: ['translate3d(0,0,0)', `translate3d(0,${-geometry.glowTravel}px,0)`] }, top, end);
      if (zeroOrbit.length) motion.set(zeroSpark, zeroOrbit.map(({ x, y }) => ({
        transform: `translate3d(${(x - 182) * geometry.zeroScale}px,${(y - 160) * geometry.zeroScale}px,0)`,
      })), top, end);
    }
    update();
  }

  function scheduleMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }

  measure();
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) scheduleUpdate();
    syncVideo();
  }, { rootMargin: '100px' }).observe(hero);
  const sizes = new ResizeObserver(scheduleMeasure);
  sizes.observe(hero);
  if (copy) sizes.observe(copy);
  window.addEventListener('resize', () => {
    if (!touch.matches) scheduleMeasure();
  }, { passive: true });
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  reducedMotion.addEventListener('change', scheduleMeasure);
  reducedMotion.addEventListener('change', syncVideo);
  document.addEventListener('visibilitychange', syncVideo);
  touch.addEventListener('change', scheduleMeasure);
  document.fonts?.ready.then(scheduleMeasure);
}
