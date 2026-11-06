export default function setFiguresPhotoParallax(image, top, height, viewport, strength = 1) {
  const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
  const offset = (progress - 0.5) * height * 0.32 * strength;
  const scale = 1 + 0.34 * strength;
  image.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(${scale})`;
}
