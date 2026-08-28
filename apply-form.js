// apply-form.js — behaviour for apply.html
// Builds the repeating employer blocks, adapts the form to the selected role,
// validates, and POSTs to /api/applications.
(function () {
  GPC_CHROME.mount('careers.html');

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SHIFTS = ['Early morning', 'Daytime', 'Evening', 'Overnight', 'Weekends only'];

  function box(id, name, values) {
    document.getElementById(id).innerHTML = values.map(function (v, i) {
      var eid = name + '-' + i;
      return '<label for="' + eid + '" style="display:flex;gap:7px;align-items:center;font-size:14px;color:var(--ink);">' +
        '<input type="checkbox" id="' + eid + '" name="' + name + '" value="' + v + '" style="width:16px;height:16px;">' + v + '</label>';
    }).join('');
  }
  box('days-box', 'days', DAYS);
  box('shifts-box', 'shifts', SHIFTS);

  // ---- role -----------------------------------------------------------------
  var slug = new URLSearchParams(location.search).get('role') || 'general';
  var job = GPC_JOBS.filter(function (j) { return j.slug === slug; })[0];
  var roleTitle = job ? job.title : 'General application — any open role';

  document.getElementById('role-line').innerHTML = job
    ? 'Applying for: <strong>' + job.title + '</strong> — $' + job.payMin + '–$' + job.payMax + ' / ' + job.payUnit +
      '. <a href="careers-job.html?role=' + encodeURIComponent(job.slug) + '" style="color:var(--gold-dark)">Read the full description →</a>'
    : 'General application. Tell us what you are good at and we will match you to an opening. ' +
      '<a href="careers.html" style="color:var(--gold-dark)">See current openings →</a>';
  document.title = roleTitle + ' — apply — Gulf ProClean';

  // The driving-record authorization is only meaningful for roles that drive.
  if (job && job.drives === false) {
    var dl = document.getElementById('dl_consent');
    dl.parentNode.style.display = 'none';
  }

  // ---- employer history -----------------------------------------------------
  var employers = document.getElementById('employers');
  var employerCount = 0;
  function addEmployer() {
    employerCount++;
    var n = employerCount;
    var d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid var(--rule);padding-top:18px;margin-top:18px;';
    d.innerHTML =
      '<p style="font-size:12.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--gold-dark);margin:0 0 12px;">Employer ' + n + (n === 1 ? ' (most recent)' : '') + '</p>' +
      '<div class="row">' +
        '<label class="field"><span class="label">Company</span><input type="text" name="emp' + n + '_company"></label>' +
        '<label class="field"><span class="label">Your job title</span><input type="text" name="emp' + n + '_title"></label>' +
      '</div>' +
      '<div class="row">' +
        '<label class="field"><span class="label">From (month/year)</span><input type="text" name="emp' + n + '_from" placeholder="03/2023"></label>' +
        '<label class="field"><span class="label">To (month/year)</span><input type="text" name="emp' + n + '_to" placeholder="Present"></label>' +
        '<label class="field"><span class="label">Supervisor name &amp; phone</span><input type="text" name="emp' + n + '_supervisor"></label>' +
      '</div>' +
      '<label class="field"><span class="label">Reason for leaving</span><input type="text" name="emp' + n + '_reason"></label>' +
      '<div class="check"><input type="checkbox" name="emp' + n + '_nocontact" id="emp' + n + '_nocontact">' +
        '<label for="emp' + n + '_nocontact">Please do not contact this employer while I am still working there</label></div>';
    employers.appendChild(d);
  }
  addEmployer(); addEmployer();
  document.getElementById('add-employer').addEventListener('click', function () {
    if (employerCount < 6) addEmployer();
  });

  // ---- conviction detail toggle --------------------------------------------
  var convicted = document.querySelector('[name=convicted]');
  var detail = document.getElementById('conviction-detail');
  convicted.addEventListener('change', function () {
    detail.style.display = convicted.value === 'yes' ? 'block' : 'none';
  });

  // ---- signature date -------------------------------------------------------
  document.getElementById('signed-date').value =
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // ---- submit ---------------------------------------------------------------
  var form = document.getElementById('application-form');
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
    if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errEl.style.display = 'none';

    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (v, k) { if (!(k in data)) data[k] = v; });

    var requiredFields = [
      ['first_name', 'your first name'], ['last_name', 'your last name'],
      ['email', 'your email address'], ['phone', 'your phone number'],
      ['city', 'the city you live in'], ['is_adult', 'whether you are 18 or older'],
      ['work_authorized', 'whether you are authorized to work in the US'],
      ['needs_sponsorship', 'whether you need visa sponsorship'],
      ['employment_type', 'the employment type you want'],
      ['has_license', 'whether you have a driver license'],
      ['reliable_transport', 'whether you have reliable transportation'],
      ['years_experience', 'your years of experience'],
      ['convicted', 'the criminal history question'],
      ['signature', 'your signature'],
    ];
    for (var i = 0; i < requiredFields.length; i++) {
      var f = requiredFields[i];
      if (!data[f[0]] || !String(data[f[0]]).trim()) {
        return fail('Please answer ' + f[1] + '.', form.elements[f[0]]);
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return fail('Please enter a valid email address.', form.elements.email);
    }
    if (data.is_adult === 'no') {
      return fail('We are sorry — every posted role requires you to be 18 or older.', null);
    }
    var days = checkedValues('days'), shifts = checkedValues('shifts');
    if (!days.length) return fail('Please pick at least one day you can work.', null);
    if (!shifts.length) return fail('Please pick at least one shift you can work.', null);
    if (!data.ack_truth || !data.ack_contingent || !data.ack_atwill) {
      return fail('Please read and check the three required acknowledgements at the bottom.', null);
    }
    if (data.convicted === 'yes' && !String(data.conviction_explanation || '').trim()) {
      return fail('Please add a short explanation for the criminal history question.', form.elements.conviction_explanation);
    }

    // Collect the repeating employer blocks into a tidy array.
    var employment = [];
    for (var n = 1; n <= employerCount; n++) {
      var company = (data['emp' + n + '_company'] || '').trim();
      if (company) {
        employment.push({
          company: company,
          title: data['emp' + n + '_title'] || '',
          from: data['emp' + n + '_from'] || '',
          to: data['emp' + n + '_to'] || '',
          supervisor: data['emp' + n + '_supervisor'] || '',
          reason: data['emp' + n + '_reason'] || '',
          do_not_contact: !!data['emp' + n + '_nocontact'],
        });
      }
      ['company', 'title', 'from', 'to', 'supervisor', 'reason', 'nocontact'].forEach(function (k) {
        delete data['emp' + n + '_' + k];
      });
    }

    var refs = [
      { name: data.ref1_name || '', relationship: data.ref1_relationship || '', phone: data.ref1_phone || '' },
      { name: data.ref2_name || '', relationship: data.ref2_relationship || '', phone: data.ref2_phone || '' },
    ].filter(function (r) { return r.name.trim(); });
    ['ref1_name', 'ref1_relationship', 'ref1_phone', 'ref2_name', 'ref2_relationship', 'ref2_phone']
      .forEach(function (k) { delete data[k]; });

    var payload = {
      role_slug: slug,
      role_title: roleTitle,
      days: days,
      shifts: shifts,
      employment: employment,
      reference_contacts: refs,
      answers: data,
    };

    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      var res = await fetch('/api/applications', {
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
      fail(err.message + ' If this keeps happening, email gulfproclean@gmail.com and we will take your application by phone.', null);
      btn.disabled = false;
      btn.textContent = 'Submit application';
    }
  });
})();
