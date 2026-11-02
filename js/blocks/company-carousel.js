export default function init(section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rail = section.querySelector('[data-carousel-rail]');
  if (!rail) return;
  const items = [...rail.querySelectorAll('[data-carousel-item]')];
  const previous = section.querySelector('[data-carousel-step="-1"]');
  const next = section.querySelector('[data-carousel-step="1"]');
  const count = section.querySelector('[data-carousel-count]');
  let frame = 0;
  let momentumFrame = 0;
  let drag = null;
  let suppressClick = false;
  if (!items.length) {
    if (previous) previous.disabled = true;
    if (next) next.disabled = true;
    if (count) count.textContent = '00 / 00';
    return;
  }
  const stride = () =>
    items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth;
  const limit = (left) => Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, left));

  function stopMomentum() {
    cancelAnimationFrame(momentumFrame);
    momentumFrame = 0;
  }

  function coast(velocity) {
    if (reduced.matches || Math.abs(velocity) < 0.08) return;
    const duration = 260;
    const start = rail.scrollLeft;
    const distance = (Math.max(-3, Math.min(3, velocity)) * duration) / 3;
    const started = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      const left = start + distance * (1 - (1 - progress) ** 3);
      rail.scrollLeft = limit(left);
      if (progress < 1 && left > 0 && left < rail.scrollWidth - rail.clientWidth) {
        momentumFrame = requestAnimationFrame(tick);
      } else {
        momentumFrame = 0;
      }
    }
    momentumFrame = requestAnimationFrame(tick);
  }
  function update() {
    frame = 0;
    const max = rail.scrollWidth - rail.clientWidth;
    const index = Math.min(items.length - 1, Math.round(rail.scrollLeft / stride()));
    if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (previous) previous.disabled = rail.scrollLeft < 2;
    if (next) next.disabled = rail.scrollLeft >= max - 2;
  }
  function step(direction, instant = false) {
    stopMomentum();
    const width = stride();
    const index = direction > 0
      ? Math.floor((rail.scrollLeft + 2) / width) + 1
      : Math.ceil((rail.scrollLeft - 2) / width) - 1;
    rail.scrollTo({
      left: limit(index * width),
      behavior: instant || reduced.matches ? 'instant' : 'smooth',
    });
  }
  previous?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  rail.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  rail.addEventListener('keydown', (event) => {
    if (event.target !== rail || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowLeft' ? -1 : 1, true);
  });
  // Фото и ссылки не должны запускать нативное перетаскивание вместо ленты.
  rail.addEventListener('dragstart', (event) => event.preventDefault());
  rail.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button) return;
    endDrag(null, false);
    stopMomentum();
    suppressClick = false;
    // На сенсорном экране прокрутку и инерцию выполняет сам браузер.
    if (event.pointerType === 'touch' || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollTo({ left: rail.scrollLeft, behavior: 'instant' });
    drag = {
      id: event.pointerId,
      x: event.clientX,
      left: rail.scrollLeft,
      time: event.timeStamp,
      direction: 0,
      active: false,
      samples: [{ left: rail.scrollLeft, time: event.timeStamp }],
    };
  });
  // До захвата указателя движение может выйти за границы ленты.
  window.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      endDrag(event, false);
      return;
    }
    const delta = event.clientX - drag.x;
    if (!drag.active) {
      // Мыши не нужна блокировка по оси: небольшое движение вниз не отменяет свайп.
      if (Math.abs(delta) < 3) return;
      drag.active = true;
      rail.setPointerCapture(event.pointerId);
      rail.classList.add('company-carousel__rail--dragging');
    }
    event.preventDefault();
    const direction = Math.sign(delta);
    if (direction && direction !== drag.direction) {
      drag.samples = [{ left: rail.scrollLeft, time: drag.time }];
      drag.direction = direction;
    }
    // Считаем от последней позиции, чтобы разворот у края срабатывал сразу.
    drag.left = limit(drag.left - delta);
    rail.scrollLeft = drag.left;
    drag.x = event.clientX;
    drag.time = event.timeStamp;
    drag.samples.push({ left: rail.scrollLeft, time: event.timeStamp });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[0].time > 100) {
      drag.samples.shift();
    }
  });
  function endDrag(event, withMomentum = true) {
    if (!drag || (event && drag.id !== event.pointerId)) return;
    const finished = drag;
    drag = null;
    suppressClick = finished.active;
    if (rail.hasPointerCapture(finished.id)) rail.releasePointerCapture(finished.id);
    rail.classList.remove('company-carousel__rail--dragging');
    if (!finished.active || !withMomentum) return;
    const first = finished.samples[0];
    const last = finished.samples[finished.samples.length - 1];
    const elapsed = event.timeStamp - first.time;
    if (elapsed > 0 && event.timeStamp - last.time < 80) {
      coast((rail.scrollLeft - first.left) / elapsed);
    }
  }
  window.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', (event) => endDrag(event, false));
  rail.addEventListener('lostpointercapture', (event) => endDrag(event, false));
  window.addEventListener('blur', () => {
    endDrag(null, false);
    stopMomentum();
  });
  rail.addEventListener('wheel', (event) => {
    stopMomentum();
    // Горизонтальный жест трекпада остаётся нативным и не попадает в Lenis.
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
      event.stopPropagation();
    }
  }, { passive: true });
  rail.addEventListener(
    'click',
    (event) => {
      if (suppressClick && event.detail) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    true,
  );
  reduced.addEventListener('change', stopMomentum);
  new ResizeObserver(() => {
    stopMomentum();
    update();
  }).observe(rail);
  update();
}
