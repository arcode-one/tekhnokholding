// Якоря остаются внутри текущего варианта, несмотря на base для общих ресурсов.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.setAttribute('href', location.pathname + location.search + link.getAttribute('href'));
});

document.addEventListener('keydown', (event) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^[1-4rR]$/.test(event.key) || ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    parent.postMessage({ type: 'prototype-key', key: event.key }, location.origin);
  }
});
