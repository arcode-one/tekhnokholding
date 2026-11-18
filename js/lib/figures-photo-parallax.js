const travelFor = (height, strength) => height * 0.16 * strength;
const transformFor = (offset, strength) => `translate3d(0, ${offset}px, 0) scale(${1 + 0.34 * strength})`;

export function setFiguresPhotoTimeline(motion, image, top, height, viewport, strength = 1) {
  const travel = travelFor(height, strength);
  return motion.set(image, { transform: [transformFor(-travel, strength), transformFor(travel, strength)] },
    top - viewport, top + height);
}

export default function setFiguresPhotoParallax(image, top, height, viewport, strength = 1) {
  const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
  const offset = (2 * progress - 1) * travelFor(height, strength);
  image.style.transform = transformFor(offset.toFixed(2), strength);
}
