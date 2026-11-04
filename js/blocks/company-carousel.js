export default function init(section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rail = section.querySelector('[data-carousel-rail]');
  if (!rail) return;
  const vertical = section.dataset.carouselAxis === 'vertical';
  const position = vertical ? 'scrollTop' : 'scrollLeft';
  const scrollSize = vertical ? 'scrollHeight' : 'scrollWidth';
  const clientSize = vertical ? 'clientHeight' : 'clientWidth';
  const offset = vertical ? 'offsetTop' : 'offsetLeft';
  const coordinate = vertical ? 'clientY' : 'clientX';
  const scrollAxis = vertical ? 'top' : 'left';
  const backwardKey = vertical ? 'ArrowUp' : 'ArrowLeft';
  const forwardKey = vertical ? 'ArrowDown' : 'ArrowRight';
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
  const itemPosition = (item) => item[offset] - items[0][offset];
  const limit = (left) => Math.max(0, Math.min(rail[scrollSize] - rail[clientSize], left));

  function stopMomentum() {
    cancelAnimationFrame(momentumFrame);
    momentumFrame = 0;
  }

  function coast(velocity) {
    if (reduced.matches || Math.abs(velocity) < 0.08) return;
    const duration = 260;
    const start = rail[position];
    const distance = (Math.max(-3, Math.min(3, velocity)) * duration) / 3;
    const started = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      const left = start + distance * (1 - (1 - progress) ** 3);
      rail[position] = limit(left);
      if (progress < 1 && left > 0 && left < rail[scrollSize] - rail[clientSize]) {
        momentumFrame = requestAnimationFrame(tick);
      } else {
        momentumFrame = 0;
      }
    }
    momentumFrame = requestAnimationFrame(tick);
  }
  function update() {
    frame = 0;
    const max = rail[scrollSize] - rail[clientSize];
    const index = items.reduce((closest, item, candidate) =>
      Math.abs(itemPosition(item) - rail[position]) <
      Math.abs(itemPosition(items[closest]) - rail[position]) ? candidate : closest, 0);
    if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    if (previous) previous.disabled = rail[position] < 2;
    if (next) next.disabled = rail[position] >= max - 2;
  }
  function step(direction, instant = false) {
    stopMomentum();
    const target = direction > 0
      ? items.find((item) => itemPosition(item) > rail[position] + 2)
      : items.findLast((item) => itemPosition(item) < rail[position] - 2);
    rail.scrollTo({
      [scrollAxis]: target ? limit(itemPosition(target)) : direction > 0 ? limit(Infinity) : 0,
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
    if (event.target !== rail || ![backwardKey, forwardKey].includes(event.key)) return;
    event.preventDefault();
    step(event.key === backwardKey ? -1 : 1, true);
  });
  // Фото и ссылки не должны запускать нативное перетаскивание вместо ленты.
  rail.addEventListener('dragstart', (event) => event.preventDefault());
  rail.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button) return;
    endDrag(null, false);
    stopMomentum();
    suppressClick = false;
    // На сенсорном экране прокрутку и инерцию выполняет сам браузер.
    if (event.pointerType === 'touch' || rail[scrollSize] <= rail[clientSize]) return;
    rail.scrollTo({ [scrollAxis]: rail[position], behavior: 'instant' });
    drag = {
      id: event.pointerId,
      x: event[coordinate],
      left: rail[position],
      time: event.timeStamp,
      direction: 0,
      active: false,
      samples: [{ left: rail[position], time: event.timeStamp }],
    };
  });
  // До захвата указателя движение может выйти за границы ленты.
  window.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      endDrag(event, false);
      return;
    }
    const delta = event[coordinate] - drag.x;
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
      drag.samples = [{ left: rail[position], time: drag.time }];
      drag.direction = direction;
    }
    // Считаем от последней позиции, чтобы разворот у края срабатывал сразу.
    drag.left = limit(drag.left - delta);
    rail[position] = drag.left;
    drag.x = event[coordinate];
    drag.time = event.timeStamp;
    drag.samples.push({ left: rail[position], time: event.timeStamp });
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
      coast((rail[position] - first.left) / elapsed);
    }
  }
  window.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', (event) => endDrag(event, false));
  rail.addEventListener('lostpointercapture', (event) => endDrag(event, false));
  window.addEventListener('blur', () => {
    endDrag(null, false);
    stopMomentum();
  });
  rail.addEventListener('wheel', () => {
    stopMomentum();
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
