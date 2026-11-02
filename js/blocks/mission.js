export default function init(story) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:767px)');
  const corners = [...story.querySelectorAll('[data-ui~=mission-corner]')];
  const bridge = story.querySelector('[data-mission-bridge]');
  const frames = [
    ...story.querySelectorAll(
      '[data-mission-parallax],[data-ui~=mission-purpose__detail],[data-ui~=mission-bridge]',
    ),
  ];
  const clamp = (v) => Math.max(0, Math.min(1, v));
  // Layout coordinates exclude animated transforms, so motion has no feedback loop.
  function metric(el) {
    let top = 0;
    for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
    return { top, height: el.offsetHeight };
  }
  const reveals = createMissionReveals(story, reduced, mobile);
  let geometry;
  let frame = 0;
  function measure() {
    geometry = {
      frames: frames.map(metric),
      corners: corners.map((el) => ({
        top: metric(el.parentElement).top,
        height: el.offsetHeight,
      })),
      bridgeTop: bridge ? metric(bridge.parentElement).top : undefined,
    };
    reveals.measure();
  }
  function render() {
    frame = 0;
    const y = scrollY;
    const vh = innerHeight;
    reveals.render(y, vh);
    if (reduced.matches) {
      [...corners, bridge, ...frames.map((el) => el.querySelector('img'))]
        .filter(Boolean)
        .forEach((el) => (el.style.transform = ''));
      return;
    }
    corners.forEach((el, i) => {
      const corner = geometry.corners[i];
      const p = clamp((vh - (corner.top - y)) / vh);
      const lift = corner.height * p;
      el.style.transform = `translate3d(0,${-lift}px,0)${i === 1 ? ' scaleX(' + (0.5 + p * 0.5) + ')' : ''}`;
    });
    frames.forEach((el, i) => {
      const rect = geometry.frames[i];
      const p = clamp((vh - (rect.top - y)) / (vh + rect.height));
      // The photograph lags behind its frame; the 14% overscan covers both ends.
      const offset = (p * 2 - 1) * rect.height * (mobile.matches ? 0.06 : 0.1);
      el.querySelector('img').style.transform =
        `translate3d(0,${offset.toFixed(2)}px,0)`;
    });
    if (geometry.bridgeTop !== undefined) {
      const p = clamp((vh - (geometry.bridgeTop - y)) / vh);
      bridge.style.transform = `translate3d(0,${(p - 0.5) * (mobile.matches ? 24 : 64)}px,0)`;
    }
  }

  /* У каждого фото своя механика. Текст остаётся в обычном слое без масок и сдвигов. */
  function createMissionReveals(root, reduced, mobile) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const entries = [...root.querySelectorAll('[data-mission-scene]')].map((scene) => {
      const kind = scene.dataset.layout;
      const frame = scene.querySelector('[data-ui~=mission-scene__frame]');
      const visual = scene.querySelector('[data-ui~=mission-scene__visual]');
      const panels = [];
      if (kind === 'trust' || kind === 'craft') {
        const count = kind === 'trust' ? 2 : 6;
        for (let i = 0; i < count; i++) {
          const panel = document.createElement('span');
          panel.className = kind === 'trust' ? 'mission-reveal-door' : 'mission-reveal-slat';
          panel.setAttribute('aria-hidden', 'true');
          panel.style.left = (i * 100) / count + '%';
          panel.style.width = 100 / count + 0.15 + '%';
          frame.append(panel);
          panels.push(panel);
        }
      }
      return { kind, frame, visual, panels, progress: 0 };
    });
    const detail = root.querySelector('[data-ui~=mission-purpose__detail]');
    let detailProgress = 0;
    let detailMetric;
    function measure() {
      entries.forEach((e) => {
        e.metrics = metric(e.frame);
      });
      detailMetric = metric(detail);
    }
    const inset = (t = 0, r = 0, b = 0, l = 0) =>
      'inset(' + [t, r, b, l].map((v) => v.toFixed(3) + '%').join(' ') + ')';
    function progress(m, y, vh) {
      const distance = Math.min(vh * 0.48, Math.max(160, m.height * 0.65));
      return clamp((vh * 0.96 - (m.top - y)) / distance);
    }
    function reset(el) {
      if (!el) return;
      el.style.removeProperty('clip-path');
      el.style.removeProperty('transform');
    }
    function complete(entry) {
      entry.progress = 1;
      [entry.frame, entry.visual].forEach(reset);
      entry.panels.forEach((panel) => (panel.hidden = true));
    }
    let wasReduced = false;
    function render(y, vh) {
      if (reduced.matches) {
        if (!wasReduced) {
          entries.forEach(complete);
          detailProgress = 1;
          reset(detail);
          wasReduced = true;
        }
        return;
      }
      wasReduced = false;
      const shift = mobile.matches ? 16 : 36;
      entries.forEach((e) => {
        const current = progress(e.metrics, y, vh);
        // Position follows scroll in both directions, even after the mask is open.
        e.visual.style.transform = e.kind === 'result' && current < 1
          ? `translate3d(0,${-(1 - current) * shift}px,0)`
          : '';
        if (e.progress === 1) return;
        const p = Math.max(e.progress, current),
          r = 1 - p;
        e.progress = p;
        if (p === 1) {
          complete(e);
          return;
        }
        // При возврате к блоку фото остаётся открытым до достигнутой позиции.
        switch (e.kind) {
          case 'expertise':
            e.frame.style.clipPath = inset(r * 49, 0, r * 49, 0);
            break;
          case 'result':
            e.frame.style.clipPath = inset(r * 100, 0, 0, 0);
            break;
          case 'initiative': {
            // Четыре уступа напоминают конструктивный разрез, в финале край ровный.
            const edge = [0, 0.12, 0.23, 0.34].map(
              (delay) => clamp((p - delay) / (1 - delay)) * 100,
            );
            e.frame.style.clipPath =
              p >= 0.999
                ? 'inset(0)'
                : 'polygon(0 0,' +
                  edge[0] +
                  '% 0,' +
                  edge[0] +
                  '% 25%,' +
                  edge[1] +
                  '% 25%,' +
                  edge[1] +
                  '% 50%,' +
                  edge[2] +
                  '% 50%,' +
                  edge[2] +
                  '% 75%,' +
                  edge[3] +
                  '% 75%,' +
                  edge[3] +
                  '% 100%,0 100%)';
            break;
          }
          case 'belief':
            e.frame.style.clipPath =
              p >= 0.999
                ? 'inset(0)'
                : 'polygon(0 0,' +
                  clamp(p * 1.6) * 100 +
                  '% 0,' +
                  clamp((p - 0.24) / 0.76) * 100 +
                  '% 100%,0 100%)';
            break;
          case 'trust':
            e.frame.style.clipPath = '';
            e.panels[0].style.transform = 'translate3d(' + -p * 101 + '%,0,0)';
            e.panels[1].style.transform = 'translate3d(' + p * 101 + '%,0,0)';
            break;
          case 'reputation':
            e.frame.style.clipPath =
              p >= 0.999 ? 'inset(0)' : 'ellipse(' + p * 150 + '% ' + p * 130 + '% at 75% 25%)';
            break;
          case 'craft':
            e.frame.style.clipPath = '';
            e.panels.forEach((panel, i) => {
              const part = clamp((p - i * 0.065) / (1 - i * 0.065));
              panel.style.transform = 'translate3d(0,' + (i % 2 ? 1 : -1) * part * 101 + '%,0)';
            });
            break;
        }
      });
      detailProgress = Math.max(detailProgress, progress(detailMetric, y, vh));
      const r = 1 - detailProgress;
      detail.style.clipPath = r ? inset(r * 50, r * 20, r * 50, r * 20) : '';
    }
    measure();
    return { measure, render };
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener(
    'resize',
    () => {
      measure();
      schedule();
    },
    { passive: true },
  );
  addEventListener('pageshow', schedule);
  reduced.addEventListener('change', schedule);
  mobile.addEventListener('change', () => {
    measure();
    schedule();
  });
  document.fonts?.ready.then(() => {
    measure();
    schedule();
  });
  new ResizeObserver(() => {
    measure();
    schedule();
  }).observe(story);
  measure();
  render();
}
