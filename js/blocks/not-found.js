export default function init(section) {
  const home = section.querySelector('#home-link');
  const countdown = section.querySelector('[data-not-found-countdown]');
  const number = section.querySelector('[data-not-found-seconds]');
  if (!home || !countdown || !number) return;

  const duration = 7;
  let deadline;
  let timer;

  function stop() {
    clearInterval(timer);
  }

  function update() {
    const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    if (remaining === 0) {
      stop();
      location.replace(home.href);
      return;
    }
    number.textContent = remaining;
    countdown.setAttribute('aria-label', `Автоматический переход на главную через ${remaining} с`);
  }

  function start() {
    stop();
    deadline = performance.now() + duration * 1000;
    update();
    timer = setInterval(update, 1000);
  }

  addEventListener('pagehide', stop);
  addEventListener('pageshow', (event) => {
    if (event.persisted) start();
  });
  start();
}
