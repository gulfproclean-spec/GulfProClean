// vendors-form.js — behaviour for vendors-bid.html
(function () {
  GPC_CHROME.mount('vendors.html');

  var AREAS = ['Pensacola', 'Gulf Breeze', 'Navarre', 'Fort Walton Beach', 'Destin',
               '30A / Santa Rosa Beach', 'Panama City Beach', 'Panama City', 'Inland / other'];

  // Trades come from vendors-data.js so the form can never drift from the
  // published category table on vendors.html.
  document.getElementById('trades-box').innerHTML = GPC_VENDOR_CATEGORIES.map(function (c, i) {
    var id = 'trade-' + i;
    return '<label for="' + id + '" style="display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--ink);">' +
      '<input type="checkbox" id="' + id + '" name="trades" value="' + c.slug + '" style="width:16px;height:16px;margin-top:3px;flex:none;">' +
      '<span>' + c.name + (c.licenseRequired ? ' <span style="color:var(--gold-dark);font-size:11.5px;font-weight:600;">· licensed</span>' : '') + '</span></label>';
  }).join('');

  document.getElementById('areas-box').innerHTML = AREAS.map(function (a, i) {
    var id = 'area-' + i;
    return '<label for="' + id + '" style="display:flex;gap:7px;align-items:center;font-size:14px;color:var(--ink);">' +
      '<input type="checkbox" id="' + id + '" name="areas" value="' + a + '" style="width:16px;height:16px;">' + a + '</label>';
  }).join('');

  document.getElementById('signed-date').value =
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  var form = document.getElementById('vendor-form');
  var errEl = document.getElementById('form-error');
  var btn = document.getElementById('submit-btn');

  function checkedValues(name) {
    return Array.prototype.slice
      .call(document.querySelectorAll('[name=' + name + ']:checked'))
      .map(function (i) { return i.value; });
  }
  function fail(msg, el) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    (el || errEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el) el.focus();
  }

  // A licensed trade selected with no license number is the single most common
  // incomplete submission, so it gets its own check rather than a generic one.
  var LICENSED = GPC_VENDOR_CATEGORIES
    .filter(function (c) { return c.licenseRequired; })
    .reduce(function (m, c) { m[c.slug] = c.name; return m; }, {});

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errEl.style.display = 'none';

    var fd = new FormData(form), d = {};
    fd.forEach(function (v, k) { if (!(k in d)) d[k] = v; });

    var required = [
      ['business_name', 'your legal business name'], ['contact_name', 'a contact name'],
      ['email', 'your email address'], ['phone', 'your office phone'],
      ['has_w9', 'whether you have a W-9 ready'],
      ['property_types', 'whether you serve residential, commercial or both'],
      ['license_required', 'whether your trade requires a Florida license'],
      ['gl_carrier', 'your general liability carrier'], ['gl_limit', 'your general liability limit'],
      ['workers_comp', 'your workers compensation status'],
      ['can_name_holder', 'whether you can name us as certificate holder'],
      ['tech_screening', 'whether your technicians are background screened'],
      ['hourly_rate', 'your standard hourly rate'], ['flat_rates', 'flat-rate pricing for common jobs'],
      ['response_routine', 'your routine response time'], ['payment_terms', 'your payment terms'],
      ['signature', 'your signature'],
    ];
    for (var i = 0; i < required.length; i++) {
      if (!d[required[i][0]] || !String(d[required[i][0]]).trim()) {
        return fail('Please provide ' + required[i][1] + '.', form.elements[required[i][0]]);
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      return fail('Please enter a valid email address.', form.elements.email);
    }

    var trades = checkedValues('trades'), areas = checkedValues('areas');
    if (!trades.length) return fail('Please select at least one trade you provide.');
    if (!areas.length) return fail('Please select at least one area you cover.');

    if (d.license_required === 'yes' && !String(d.license_number || '').trim()) {
      var licensed = trades.filter(function (t) { return LICENSED[t]; }).map(function (t) { return LICENSED[t]; });
      return fail('You selected ' + (licensed.length ? licensed.join(', ') : 'a licensed trade') +
        ', which Florida requires a state license for. Please enter your license number — we verify it before dispatch.',
        form.elements.license_number);
    }
    if (d.workers_comp === 'none') {
      return fail('We cannot dispatch a vendor with neither workers\' compensation coverage nor a valid Florida exemption certificate — ' +
        'an uninsured subcontractor\'s workers become the hiring contractor\'s employees for injury purposes. ' +
        'Please get one of the two in place, then come back and submit. Questions: gulfproclean@gmail.com.');
    }
    if (!d.cert_accurate || !d.cert_verify || !d.cert_notify) {
      return fail('Please read and check the three required certifications at the bottom.');
    }

    var payload = {
      business_name: d.business_name,
      contact_name: d.contact_name,
      email: d.email,
      phone: d.phone,
      trades: trades,
      areas: areas,
      license_number: d.license_number || null,
      license_authority: d.license_authority || null,
      license_expires: d.license_expires || null,
      hourly_rate: d.hourly_rate ? Number(d.hourly_rate) : null,
      details: d,
    };
    ['business_name', 'contact_name', 'email', 'phone'].forEach(function (k) { delete payload.details[k]; });

    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      var res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var out = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(out.error || 'Something went wrong. Please try again.');
      form.style.display = 'none';
      document.getElementById('success').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      fail(err.message + ' If this keeps happening, email gulfproclean@gmail.com and we will take your pricing by email.');
      btn.disabled = false; btn.textContent = 'Submit pricing';
    }
  });
})();
