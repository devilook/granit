/*
 * Lead form. Front-end only for now: validates, formats the phone, shows a
 * calm confirmation. TODO (functions stage): POST to CRM / Telegram bot.
 */
export function initForm(form) {
  if (!form) return;
  const phone = form.querySelector('[name="phone"]');

  phone.addEventListener('input', () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    const p = d.slice(1);
    let out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ') ' + p.slice(3, 6);
    if (p.length >= 6) out += '-' + p.slice(6, 8);
    if (p.length >= 8) out += '-' + p.slice(8, 10);
    phone.value = out;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let ok = true;
    form.querySelectorAll('.field').forEach((f) => f.classList.remove('is-error'));
    if (!data.name?.trim()) { form.querySelector('[name="name"]').closest('.field').classList.add('is-error'); ok = false; }
    if (data.phone.replace(/\D/g, '').length < 11) { phone.closest('.field').classList.add('is-error'); ok = false; }
    if (!ok) return;

    form.classList.add('is-sending');
    // REPLACE_ME: send `data` to your backend here.
    await new Promise((r) => setTimeout(r, 900));
    form.classList.remove('is-sending');
    form.classList.add('is-sent');
  });
}
