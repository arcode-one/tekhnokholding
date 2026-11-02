export default function init(figure) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Раскрываем только фотографии. Текст карточки остаётся в обычном слое.
  const images = Array.from(figure.querySelectorAll('img'));
  if (!images.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      images.forEach((image) => {
        image.classList.add('company-reveal--visible');
        image.classList.remove('company-reveal--pending');
      });
      observer.disconnect();
    },
    { rootMargin: '0px 0px 12% 0px', threshold: 0 },
  );
  observer.observe(figure);
  images.forEach((image) => image.classList.add('company-reveal--pending'));
}
