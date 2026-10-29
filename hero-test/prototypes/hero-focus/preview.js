(function () {
  const number = Math.min(3, Math.max(1, Number(new URLSearchParams(location.search).get('v')) || 1));
  document.body.dataset.variant = String(number);
  document.querySelector('.hero__content').innerHTML = window.heroVariants[number]();
})();

