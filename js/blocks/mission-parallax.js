import initPhotoParallax from '../lib/photo-parallax.js';

export default function initMissionParallax(story, footer) {
  const frames = [
    ...story.querySelectorAll('.mission-hero__photo'),
    ...(footer?.querySelectorAll('.site-footer__visual') || []),
  ];
  initPhotoParallax(frames, [story, footer], 'mission-parallax', (element) => (
    element.classList.contains('mission-hero__photo') ? { travel: [0.14, 0.14] } : {}
  ));
}
