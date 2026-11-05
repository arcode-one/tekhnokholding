import initAccordion from './services-accordion.js';

export default function initMissionValues(story) {
  const values = story.querySelector('.mission-values__list');
  if (values) initAccordion(values);
}
