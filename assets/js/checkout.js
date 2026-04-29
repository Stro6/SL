(function () {
  'use strict';

  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };

  const SUPABASE_URL = window.STROMATIC_CONFIG && window.STROMATIC_CONFIG.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.STROMATIC_CONFIG && window.STROMATIC_CONFIG.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      'Stromatic: missing Supabase config. Set SUPABASE_URL and SUPABASE_ANON_KEY in the STROMATIC_CONFIG script before checkout.js.'
    );
  }

  function clean(value, max) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '').trim().slice(0, max || 2000);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
  }

  function isValidUrl(v) {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  function showError(form, msg) {
    let box = form.querySelector('.form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-error';
      box.setAttribute('role', 'alert');
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.parentNode.insertBefore(box, btn);
      else form.appendChild(box);
    }
    box.textContent = msg;
    box.style.display = 'block';
  }

  function clearError(form) {
    const box = form.querySelector('.form-error');
    if (box) box.style.display = 'none';
  }

  function setLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.dataset.label = button.textContent;
      button.textContent = 'Connecting to checkout…';
      button.disabled = true;
    } else {
      if (button.dataset.label) button.textContent = button.dataset.label;
      button.disabled = false;
    }
  }

  async function startCheckout(form) {
    const serviceId = form.dataset.serviceId;
    if (!serviceId) {
      showError(form, 'Configuration error — service ID missing.');
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      showError(
        form,
        'Checkout is not configured yet. Add your Supabase URL and anon key to this page’s STROMATIC_CONFIG script.'
      );
      return;
    }

    const formData = new FormData(form);
    const email = clean(formData.get('email') || '', 254).toLowerCase();

    if (!isValidEmail(email)) {
      showError(form, 'Please enter a valid email address.');
      return;
    }

    const brief = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'email' || key === 'serviceId') continue;
      brief[key] = clean(value, 2000);
    }

    const urlFields = form.querySelectorAll('input[type="url"]');
    for (let i = 0; i < urlFields.length; i++) {
      const urlField = urlFields[i];
      if (urlField.value.trim() && !isValidUrl(urlField.value.trim())) {
        const lab = urlField.closest('.form-field');
        const labelText = lab ? lab.querySelector('label') : null;
        const prefix = labelText ? labelText.textContent.replace(/\*$/, '').trim() : 'URL';
        showError(form, prefix + ' must start with http:// or https://');
        return;
      }
    }

    clearError(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true);

    try {
      const res = await fetch(SUPABASE_URL + '/functions/v1/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          serviceId: serviceId,
          customerEmail: email,
          brief: brief,
          returnUrl: window.location.origin + '/checkout/success.html',
        }),
      });

      const data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || 'Checkout failed (' + res.status + ')');
      if (!data.checkoutUrl) throw new Error('No checkout URL returned');

      if (typeof window.plausible === 'function') {
        window.plausible('Checkout Started', { props: { service: serviceId } });
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      showError(form, (err && err.message) || 'Could not start checkout. Please try again.');
      setLoading(submitBtn, false);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form.checkout-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        startCheckout(form);
      });
    });
  });
})();
