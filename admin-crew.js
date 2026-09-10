// admin-crew.js — the Crew and Bookings & assignments sections of admin.html.
//
// Employees are the pool functions/_lib/assignment.js auto-assigns new
// bookings from. This panel is where the office manages that pool, sets each
// technician's employee-app password (employees never self-register), and
// overrides any single assignment — auto-assignment only ever sets a
// starting point, never a lock. Talks to /api/employees,
// /api/bookings/:id/assign and /api/admin/supply-checks with the admin bearer
// token, exactly like the Applicants and Vendors panels in admin-hiring.js.
//
// The password input and the supply-check roll-up are injected here at init
// rather than living in admin.html, so this file owns everything Crew-related
// and admin.html's markup stays untouched.
(function () {
  var token = null;
  var employees = [];
  var bookingsCache = [];

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    try {
      return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) { return String(d); }
  }

  function api(path, options) {
    return fetch(path, Object.assign({}, options, {
      headers: Object.assign({ 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                             (options && options.headers) || {}),
    })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || res.statusText);
        return data;
      });
    });
  }

  function msg(selector, id, text, cls) {
    var el = document.querySelector('[' + selector + '="' + id + '"]');
    if (el) { el.textContent = text; el.className = 'status' + (cls ? ' ' + cls : ''); }
  }

  // ---- One-time DOM additions -------------------------------------------

  function injectControls() {
    var phone = document.getElementById('crew-new-phone');
    if (phone && !document.getElementById('crew-new-password')) {
      var pw = document.createElement('input');
      pw.type = 'text'; pw.id = 'crew-new-password'; pw.placeholder = 'App password (optional, 8+ chars)';
      pw.style.minWidth = '200px'; pw.autocomplete = 'off';
      phone.insertAdjacentElement('afterend', pw);
    }
    var roster = document.getElementById('crew-roster');
    if (roster && !document.getElementById('crew-help')) {
      var help = document.createElement('p');
      help.id = 'crew-help';
      help.style.cssText = 'font-size:13px;color:#7a746a;margin:0 0 10px';
      help.innerHTML = 'Technicians sign in to the <strong>Gulf ProClean Crew</strong> app (or <a href="employee.html" style="color:#8a6221">employee.html</a>) with the email and password you set here. "Set password" also works as a reset — it signs them out everywhere.';
      roster.insertAdjacentElement('beforebegin', help);
    }
    var bookings = document.getElementById('crew-bookings');
    if (bookings && !document.getElementById('crew-supply')) {
      var block = bookings.closest('.page-block');
      var wrap = document.createElement('div');
      wrap.className = 'page-block';
      wrap.innerHTML = '<h2>Supply checks</h2>' +
        '<p style="font-size:13px;color:#7a746a;margin-top:-8px">Start-of-shift kit checks the crew filed from the app, last 14 days. Anything marked low or out is what needs restocking.</p>' +
        '<div class="filters"><button class="secondary" id="crew-supply-refresh" style="background:#e3ded2">Refresh</button></div>' +
        '<div id="crew-supply">Loading…</div>';
      block.insertAdjacentElement('afterend', wrap);
    }
  }

  // ---- Employees -------------------------------------------------------

  function employeeRowHtml(e) {
    var login = e.has_password ? '<span class="badge approved">app login</span>'
      : (e.email ? '<span class="badge warn">no password</span>' : '<span class="badge">no email</span>');
    return '' +
      '<div class="rev-item" data-id="' + esc(e.id) + '" style="padding:12px 16px">' +
        '<div class="rev-head">' +
          '<div><strong>' + esc(e.name) + '</strong> ' +
            '<span class="badge ' + (e.active ? 'approved' : 'declined') + '">' + (e.active ? 'active' : 'inactive') + '</span> ' + login +
            '<p class="rev-meta">' + esc([e.email, e.phone].filter(Boolean).join(' · ') || 'no contact on file') + '</p>' +
          '</div>' +
          '<div class="rev-actions" style="margin-top:0">' +
            '<button class="secondary" style="background:#e3ded2" data-emp-password="' + esc(e.id) + '"' + (e.email ? '' : ' disabled title="Add an email first"') + '>' + (e.has_password ? 'Reset password' : 'Set password') + '</button>' +
            '<button class="secondary" style="background:#e3ded2" data-emp-toggle="' + esc(e.id) + '" data-active="' + e.active + '">' +
              (e.active ? 'Deactivate' : 'Reactivate') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<span class="status" data-emp-msg="' + esc(e.id) + '"></span>' +
      '</div>';
  }

  function loadEmployees() {
    var el = document.getElementById('crew-roster');
    el.textContent = 'Loading…';
    return api('/api/employees').then(function (data) {
      employees = data.employees || [];
      el.innerHTML = employees.length
        ? employees.map(employeeRowHtml).join('')
        : '<p style="color:#7a746a;font-size:14px">No technicians yet — add one below.</p>';
      renderBookings();
    }).catch(function (e) {
      el.innerHTML = '<p class="status err">Could not load crew: ' + esc(e.message) + '</p>';
    });
  }

  // ---- Bookings & assignment --------------------------------------------

  function assignSelectHtml(booking) {
    var active = employees.filter(function (e) { return e.active; });
    var options = '<option value="">Unassigned</option>' +
      active.map(function (e) {
        return '<option value="' + esc(e.id) + '"' + (e.id === booking.assigned_employee_id ? ' selected' : '') + '>' + esc(e.name) + '</option>';
      }).join('');
    return '<select data-assign-select="' + esc(booking.id) + '">' + options + '</select>';
  }

  function bookingRowHtml(b) {
    var name = ((b.first_name || '') + ' ' + (b.last_name || '')).trim();
    return '' +
      '<div class="rev-item" data-id="' + esc(b.id) + '" style="padding:12px 16px">' +
        '<div class="rev-head">' +
          '<div>' +
            '<strong>' + esc(b.address) + '</strong> ' +
            '<span class="badge">' + esc(b.page) + '</span>' +
            '<p class="rev-meta">' + esc(name || 'customer') + (b.tier ? ' · ' + esc(b.tier) : '') + ' · ' +
              esc(fmtDate(b.scheduled_date)) + (b.scheduled_time ? ' at ' + esc(b.scheduled_time) : '') +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="rev-actions" style="margin-top:10px">' +
          assignSelectHtml(b) +
          '<button data-assign-save="' + esc(b.id) + '">Save assignment</button>' +
          '<span class="status" data-assign-msg="' + esc(b.id) + '"></span>' +
        '</div>' +
      '</div>';
  }

  function renderBookings() {
    var el = document.getElementById('crew-bookings');
    if (!bookingsCache.length) {
      el.innerHTML = '<p style="color:#7a746a;font-size:14px">No upcoming paid bookings.</p>';
      return;
    }
    el.innerHTML = bookingsCache.map(bookingRowHtml).join('');
  }

  function loadBookings() {
    var el = document.getElementById('crew-bookings');
    el.textContent = 'Loading…';
    return api('/api/admin/bookings').then(function (data) {
      bookingsCache = data.bookings || [];
      renderBookings();
    }).catch(function (e) {
      el.innerHTML = '<p class="status err">Could not load bookings: ' + esc(e.message) + '</p>';
    });
  }

  // ---- Supply checks ------------------------------------------------------

  function loadSupply() {
    var el = document.getElementById('crew-supply');
    if (!el) return Promise.resolve();
    el.textContent = 'Loading…';
    return api('/api/admin/supply-checks').then(function (data) {
      var checks = data.checks || [];
      if (!checks.length) { el.innerHTML = '<p style="color:#7a746a;font-size:14px">No supply checks filed yet.</p>'; return; }
      el.innerHTML = checks.map(function (c) {
        var items = c.items || {};
        var flagged = Object.keys(items).filter(function (k) { return items[k] !== 'ok'; });
        return '<div class="rev-item" style="padding:12px 16px"><div class="rev-head"><div><strong>' + esc(c.employee_name) + '</strong> ' +
          (flagged.length ? '<span class="badge warn">' + flagged.length + ' flagged</span>' : '<span class="badge approved">all ok</span>') +
          '<p class="rev-meta">' + esc(fmtDate(c.check_date)) + '</p></div></div>' +
          (flagged.length ? '<div style="font-size:13.5px;margin-top:8px">' + flagged.map(function (k) { return '<span class="badge ' + (items[k] === 'out' ? 'declined' : 'warn') + '" style="margin:2px 4px 2px 0">' + esc(items[k]) + '</span>' + esc(k); }).join('<br>') + '</div>' : '') +
          (c.notes ? '<p class="rev-meta" style="margin-top:8px">“' + esc(c.notes) + '”</p>' : '') +
        '</div>';
      }).join('');
    }).catch(function (e) {
      el.innerHTML = '<p class="status err">Could not load supply checks: ' + esc(e.message) + '</p>';
    });
  }

  // ---- Wiring --------------------------------------------------------------

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'BUTTON') return;
    var id;

    if ((id = t.getAttribute('data-emp-toggle'))) {
      var nextActive = t.getAttribute('data-active') !== 'true';
      t.disabled = true;
      api('/api/employees/' + id, { method: 'PATCH', body: JSON.stringify({ active: nextActive }) })
        .then(function () { return loadEmployees(); })
        .catch(function (err) { window.alert('Could not update: ' + err.message); })
        .finally(function () { t.disabled = false; });
    }

    else if ((id = t.getAttribute('data-emp-password'))) {
      var pw = window.prompt('New app password for this technician (8+ characters). They will be signed out of the app everywhere and need to sign in again with it.');
      if (pw === null) return;
      if (pw.length < 8) { msg('data-emp-msg', id, 'Password must be at least 8 characters.', 'err'); return; }
      t.disabled = true;
      msg('data-emp-msg', id, 'Saving…');
      api('/api/employees/' + id, { method: 'PATCH', body: JSON.stringify({ password: pw }) })
        .then(function () { return loadEmployees(); })
        .then(function () { msg('data-emp-msg', id, 'Password set — share it with them directly.', 'ok'); })
        .catch(function (err) { msg('data-emp-msg', id, err.message, 'err'); })
        .finally(function () { t.disabled = false; });
    }

    else if ((id = t.getAttribute('data-assign-save'))) {
      var sel = document.querySelector('[data-assign-select="' + id + '"]');
      var employeeId = sel.value || null;
      msg('data-assign-msg', id, 'Saving…');
      api('/api/bookings/' + id + '/assign', { method: 'PATCH', body: JSON.stringify({ employeeId: employeeId }) })
        .then(function () {
          msg('data-assign-msg', id, 'Saved.', 'ok');
          var b = bookingsCache.filter(function (x) { return x.id === id; })[0];
          if (b) b.assigned_employee_id = employeeId;
        })
        .catch(function (err) { msg('data-assign-msg', id, err.message, 'err'); });
    }

    else if (t.id === 'crew-add-employee') {
      var name = document.getElementById('crew-new-name').value.trim();
      if (!name) return;
      var email = document.getElementById('crew-new-email').value.trim();
      var phone = document.getElementById('crew-new-phone').value.trim();
      var pwEl = document.getElementById('crew-new-password');
      var password = pwEl ? pwEl.value : '';
      var statusEl = document.getElementById('crew-add-status');
      t.disabled = true;
      statusEl.textContent = 'Adding…';
      statusEl.className = 'status';
      api('/api/employees', { method: 'POST', body: JSON.stringify({ name: name, email: email, phone: phone, password: password }) })
        .then(function () {
          document.getElementById('crew-new-name').value = '';
          document.getElementById('crew-new-email').value = '';
          document.getElementById('crew-new-phone').value = '';
          if (pwEl) pwEl.value = '';
          statusEl.textContent = 'Added.';
          statusEl.className = 'status ok';
          return loadEmployees();
        })
        .catch(function (err) { statusEl.textContent = 'Failed: ' + err.message; statusEl.className = 'status err'; })
        .finally(function () { t.disabled = false; });
    }

    else if (t.id === 'crew-bookings-refresh') loadBookings();
    else if (t.id === 'crew-supply-refresh') loadSupply();
  });

  window.GPC_CREW = {
    init: function (adminToken) {
      token = adminToken;
      injectControls();
      loadEmployees().then(loadBookings).then(loadSupply);
    },
  };
})();
