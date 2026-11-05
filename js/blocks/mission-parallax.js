import initPhotoParallax from '../lib/photo-parallax.js';

export default function initMissionParallax(story, footer) {
  const frames = [...story.querySelectorAll('.mission-project__photo'), ...(footer?.querySelectorAll('.site-footer__visual') || [])];
  initPhotoParallax(frames, [story, footer], 'mission-parallax', (frame) =>
    frame.classList.contains('mission-project__photo') ? { travel: [.1, .1] } : {});
  const syncVisibility = () => story.style.setProperty('--mission-photo-play', document.hidden ? 'paused' : 'running');
  syncVisibility();
  document.addEventListener('visibilitychange', syncVisibility);
}
