// Base указывает на общие ресурсы сайта, а якоря остаются на странице превью.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.setAttribute('href', location.pathname + link.getAttribute('href'));
});
