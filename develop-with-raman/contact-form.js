/* Public contact form: one validated insert into the existing leads table. */
(() => {
  const form = document.getElementById('f');
  if (!form) return;

  const button = document.getElementById('sd');
  const status = document.getElementById('contact-status');
  const field = id => document.getElementById(id);

  const setStatus = (message, kind = '') => {
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
    status.style.color = kind === 'error' ? '#b42318' : kind === 'success' ? '#276749' : '';
    status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const values = {
      n: field('n').value.trim(),
      e: field('e').value.trim(),
      w: field('w').value.trim(),
      t: field('t').value,
      b: field('b').value,
      d: field('d').value,
      pay: field('pay').value,
      m: field('m').value.trim()
    };
    const validators = {
      n: v => v.length > 1 || 'Please enter your name.',
      e: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Please enter a valid email.',
      m: v => v.length > 14 || 'Please add at least 15 characters of project details.',
      w: v => !v || /^[+\d][\d\s()-]{7,}$/.test(v) || 'Please enter a valid phone number.'
    };

    let valid = true;
    for (const [key, validate] of Object.entries(validators)) {
      const result = validate(values[key]);
      const error = form.querySelector('[data-f="' + key + '"]');
      if (error) error.textContent = result === true ? '' : result;
      if (result !== true) valid = false;
    }
    if (!valid) {
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }

    const supabase = window.supabaseClient;
    if (!supabase?.from) {
      setStatus('The enquiry service is temporarily unavailable. Please try again shortly.', 'error');
      return;
    }

    const originalLabel = button?.textContent || 'Submit enquiry';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    setStatus('Sending your enquiry…');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user || null;

      const payload = {
        name: values.n,
        email: values.e,
        whatsapp: values.w || null,
        project_type: values.t,
        budget_range: values.b,
        deadline: values.d || null,
        preferred_payment: values.pay,
        description: values.m,
        status: 'New',
        user_id: user?.id || null,
        client_email: user?.email || values.e
      };
      const { error } = await supabase.from('leads').insert(payload);
      if (error) throw error;

      form.reset();
      for (const key of Object.keys(validators)) {
        const error = form.querySelector('[data-f="' + key + '"]');
        if (error) error.textContent = '';
      }
      setStatus('Thanks — your enquiry has been submitted. I’ll follow up soon.', 'success');
    } catch (error) {
      console.error('[contact form]', error);
      setStatus('Your enquiry could not be submitted. Please try again in a moment.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  }, true);
})();
