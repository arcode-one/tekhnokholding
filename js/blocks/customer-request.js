const requestSubject = 'Заявка с сайта Технохолдинг';

export default function init(dialog) {
  if (typeof dialog.showModal !== 'function') return;

  const opener = document.querySelector('[data-customer-request-open]');
  const form = dialog.querySelector('form');
  const { name, phone, email, project, message, website, consent } = form.elements;
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.querySelector('.pill__label');
  const status = dialog.querySelector('[data-customer-request-status]');
  const success = dialog.querySelector('[data-customer-request-success]');
  const fallback = dialog.querySelector('[data-customer-request-fallback]');
  const mailAddress = fallback.getAttribute('href');
  const editableFields = [name, phone, email, project, message];
  const root = document.documentElement;
  let ownsLock = false;

  function setSending(sending) {
    for (const field of editableFields) field.readOnly = sending;
    consent.disabled = sending;
    submit.disabled = sending;
    submitLabel.textContent = sending ? 'Отправляем…' : 'Отправить заявку';
  }

  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', dialog.id);
  opener.addEventListener('click', (event) => {
    event.preventDefault();
    if (dialog.open) return;
    ownsLock = !root.classList.contains('site--locked');
    if (ownsLock) root.classList.add('site--locked');
    dialog.showModal();
    dialog.scrollTop = 0;
    if (!success.hidden) success.querySelector('p').focus();
  });

  dialog.querySelectorAll('[data-customer-request-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  function isBackdrop(event) {
    if (event.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
  }

  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => {
    pressedBackdrop = isBackdrop(event);
  });
  dialog.addEventListener('click', (event) => {
    if (pressedBackdrop && isBackdrop(event)) dialog.close();
    pressedBackdrop = false;
  });

  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (ownsLock) root.classList.remove('site--locked');
    ownsLock = false;
    if (!success.hidden) {
      success.hidden = true;
      form.hidden = false;
    }
    opener.focus({ preventScroll: true });
  });

  form.addEventListener('input', () => {
    for (const field of [name, phone, message]) field.setCustomValidity('');
    if (!submit.disabled) {
      status.textContent = '';
      fallback.hidden = true;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    const data = {
      name: name.value.trim(),
      phone: phone.value.trim(),
      email: email.value.trim(),
      project: project.value.trim(),
      message: message.value.trim(),
      website: website.value,
      consent: consent.checked,
    };
    name.setCustomValidity(data.name ? '' : 'Укажите ваше имя.');
    message.setCustomValidity(data.message ? '' : 'Опишите вашу задачу.');
    const digits = data.phone.replace(/\D/g, '').length;
    const validPhone = /^\+?[0-9(). -]+$/.test(data.phone) && digits >= 7 && digits <= 15;
    if (!data.phone && !data.email) phone.setCustomValidity('Укажите телефон или электронную почту.');
    else if (data.phone && !validPhone) phone.setCustomValidity('Проверьте номер телефона.');
    if (!form.reportValidity()) return;

    setSending(true);
    status.textContent = '';
    fallback.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (response.status === 422) {
        status.textContent = 'Проверьте контактные данные и заполнение обязательных полей.';
        return;
      }
      if (!response.ok || (await response.json()).ok !== true) throw new Error('Request failed');

      form.reset();
      form.hidden = true;
      success.hidden = false;
      if (dialog.open) success.querySelector('p').focus();
    } catch {
      const contact = [data.phone, data.email].filter(Boolean).join(', ');
      const details = [`Имя: ${data.name}`, `Контакт: ${contact}`];
      if (data.project) details.push(`Объект или город: ${data.project}`);
      details.push('', data.message);
      fallback.href = `${mailAddress}?subject=${encodeURIComponent(requestSubject)}&body=${encodeURIComponent(details.join('\r\n'))}`;
      status.textContent = 'Не удалось подтвердить отправку. Можно отправить заявку по почте.';
      fallback.hidden = false;
    } finally {
      clearTimeout(timeout);
      setSending(false);
    }
  });
}
