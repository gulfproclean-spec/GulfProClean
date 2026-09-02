// admin-crew.js — the Crew and Bookings & assignments sections of admin.html.
//
// Employees are the pool functions/_lib/assignment.js auto-assigns new
// bookings from. This panel is where the office manages that pool and
// overrides any single assignment — auto-assignment only ever sets a
// starting point, never a lock. Talks to /api/employees and
// /api/bookings/:id/assign with the admin bearer token, exactly like the
// Applicants and Vendors panels in admin-hiring.js.
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
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

  // ---- Employees -------------------------------------------------------

  function employeeRowHtml(e) {
    return '' +
      '<div class="rev-item" data-id="' + esc(e.id) + '" style="padding:12px 16px">' +
        '<div class="rev-head">' +
          '<div><strong>' + esc(e.name) + '</strong> ' +
            '<span class="badge ' + (e.active ? 'approved' : 'declined') + '">' + (e.active ? 'active' : 'inactive') + '</span>' +
            '<p class="rev-meta">' + esc([e.email, e.phone].filter(Boolean).join(' · ') || 'no contact on file') + '</p>' +
          '</div>' +
          '<button class="secondary" style="background:#e3ded2" data-emp-toggle="' + esc(e.id) + '" data-active="' + e.active + '">' +
            (e.active ? 'Deactivate' : 'Reactivate') +
          '</button>' +
        '</div>' +
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
      var statusEl = document.getElementById('crew-add-status');
      t.disabled = true;
      statusEl.textContent = 'Adding…';
      statusEl.className = 'status';
      api('/api/employees', { method: 'POST', body: JSON.stringify({ name: name, email: email, phone: phone }) })
        .then(function () {
          document.getElementById('crew-new-name').value = '';
          document.getElementById('crew-new-email').value = '';
          document.getElementById('crew-new-phone').value = '';
          statusEl.textContent = 'Added.';
          statusEl.className = 'status ok';
          return loadEmployees();
        })
        .catch(function (err) { statusEl.textContent = 'Failed: ' + err.message; statusEl.className = 'status err'; })
        .finally(function () { t.disabled = false; });
    }

    else if (t.id === 'crew-bookings-refresh') loadBookings();
  });

  window.GPC_CREW = {
    init: function (adminToken) {
      token = adminToken;
      loadEmployees().then(loadBookings);
    },
  };
})();
