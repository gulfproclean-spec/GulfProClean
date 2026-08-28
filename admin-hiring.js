// admin-hiring.js — the Applicants and Vendors sections of admin.html.
//
// Kept out of admin.html so that file stays readable. Everything here talks to
// /api/applications and /api/vendors with the admin bearer token, exactly like
// the content and pricing editors above it.
(function () {
  var token = null;

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtDate(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  // Renders a definition list, skipping empty values. A third element of
  // 'raw' means the value is already-escaped markup (a link, usually).
  function rows(pairs) {
    var out = pairs
      .filter(function (p) { return p[1] !== null && p[1] !== undefined && p[1] !== ''; })
      .map(function (p) {
        var value = p[2] === 'raw' ? p[1] : esc(p[1]);
        return '<dt>' + esc(p[0]) + '</dt><dd>' + value + '</dd>';
      }).join('');
    return out ? '<dl>' + out + '</dl>' : '';
  }

  function toggler(id) {
    return 'document.getElementById(\'' + id + '\').classList.toggle(\'open\')';
  }

  // ---- Applicants ----------------------------------------------------------

  var APP_STATUSES = ['new', 'screening', 'interview', 'working_interview', 'offer',
                      'onboarding', 'hired', 'declined', 'withdrawn'];

  // Whether a role drives decides whether the pre-hire page shows the driving
  // record authorization, so it comes from careers-data.js when available.
  function roleDrives(slug) {
    if (typeof window.GPC_JOBS === 'undefined') return true;
    var job = window.GPC_JOBS.filter(function (j) { return j.slug === slug; })[0];
    return job ? job.drives !== false : true;
  }

  function applicantHtml(a) {
    var id = 'app-' + a.id;
    var name = (a.first_name || '') + ' ' + (a.last_name || '');
    var badgeClass = ['new', 'hired', 'declined'].indexOf(a.status) >= 0 ? a.status : '';

    var employment = (a.employment || []).filter(function (e) { return e && e.company; })
      .map(function (e) {
        return '<li>' + esc(e.company) + (e.title ? ' — ' + esc(e.title) : '') +
          (e.from || e.to ? ' <span style="color:#7a746a">(' + esc(e.from || '?') + ' – ' + esc(e.to || '?') + ')</span>' : '') +
          (e.supervisor ? '<br><span style="color:#7a746a">Supervisor: ' + esc(e.supervisor) + '</span>' : '') +
          (e.reason ? '<br><span style="color:#7a746a">Left because: ' + esc(e.reason) + '</span>' : '') +
          (e.do_not_contact ? '<br><span style="color:#b3261e">Do not contact — still employed</span>' : '') +
          '</li>';
      }).join('');

    var refs = (a.reference_contacts || []).filter(function (r) { return r && r.name; })
      .map(function (r) {
        return '<li>' + esc(r.name) + (r.relationship ? ' — ' + esc(r.relationship) : '') +
               (r.phone ? ' — ' + esc(r.phone) : '') + '</li>';
      }).join('');

    var ans = a.answers || {};

    var conviction = a.convicted === true
      ? '<div style="border-left:3px solid #b68235;padding:10px 14px;background:#faf8f4;margin:12px 0;">' +
        '<strong>Answered yes to the criminal history question.</strong><br>' +
        esc(a.conviction_explanation || '(no explanation given)') +
        '<br><span style="color:#7a746a">Assess individually — the offense, how long ago, and whether it relates to this role. ' +
        'Not an automatic disqualification.</span></div>'
      : '';

    var prehire = a.prehire_token
      ? '<p style="margin:10px 0 0;font-size:13px;">Pre-hire link issued' +
        (a.prehire_completed_at ? ' — <strong>signed ' + esc(fmtDate(a.prehire_completed_at)) + '</strong>' : ' — <strong>not signed yet</strong>') +
        '<br><span style="color:#7a746a;word-break:break-all">onboarding.html?token=' + esc(a.prehire_token) + '</span></p>'
      : '';

    return '' +
      '<div class="rev-item" data-id="' + esc(a.id) + '">' +
        '<div class="rev-head">' +
          '<div>' +
            '<strong>' + esc(name.trim()) + '</strong> ' +
            '<span class="badge ' + badgeClass + '">' + esc(a.status) + '</span>' +
            '<p class="rev-meta">' + esc(a.role_title) + ' · ' + esc(a.city || '—') + ' · applied ' + esc(fmtDate(a.created_at)) + '</p>' +
          '</div>' +
          '<button class="secondary" style="background:#e3ded2" onclick="' + toggler(id) + '">Details</button>' +
        '</div>' +
        '<div class="rev-body" id="' + id + '">' +
          rows([
            ['Email', '<a href="mailto:' + esc(a.email) + '">' + esc(a.email) + '</a>', 'raw'],
            ['Phone', a.phone],
            ['Location', [a.city, a.zip].filter(Boolean).join(' ')],
            ['Travel radius', ans.travel_radius],
            ['Employment type', ans.employment_type],
            ['Earliest start', ans.start_date],
            ['Days available', (a.days || []).join(', ')],
            ['Shifts available', (a.shifts || []).join(', ')],
            ['Experience', ans.years_experience],
            ['Driver license', ans.has_license === 'yes' ? 'Yes' + (ans.license_state ? ' (' + ans.license_state + ')' : '') : 'No'],
            ['Reliable transport', ans.reliable_transport],
            ['Auto insurance', ans.auto_insurance],
            ['Driving record consent', ans.dl_consent ? 'Given' : 'Not given'],
            ['Authorized to work in US', a.work_authorized === true ? 'Yes' : a.work_authorized === false ? 'No' : ''],
            ['Needs sponsorship', a.needs_sponsorship === true ? 'Yes' : a.needs_sponsorship === false ? 'No' : ''],
            ['Résumé', ans.resume_url ? '<a href="' + esc(ans.resume_url) + '" target="_blank" rel="noopener">' + esc(ans.resume_url) + '</a>' : '', 'raw'],
            ['Heard about us', ans.source],
            ['Signed', ans.signature ? esc(ans.signature) + ' on ' + esc(ans.signed_date || '') : ''],
          ]) +
          conviction +
          (employment ? '<h4 style="margin:14px 0 6px">Employment history</h4><ul style="padding-left:18px;margin:0">' + employment + '</ul>' : '') +
          (refs ? '<h4 style="margin:14px 0 6px">References</h4><ul style="padding-left:18px;margin:0">' + refs + '</ul>' : '') +
          (ans.notes ? '<h4 style="margin:14px 0 6px">Notes from the applicant</h4><p style="white-space:pre-wrap;margin:0">' + esc(ans.notes) + '</p>' : '') +
          prehire +
          '<div class="rev-actions">' +
            '<select data-app-status="' + esc(a.id) + '">' +
              APP_STATUSES.map(function (st) {
                return '<option value="' + st + '"' + (st === a.status ? ' selected' : '') + '>' + st.replace(/_/g, ' ') + '</option>';
              }).join('') +
            '</select>' +
            '<button data-app-save="' + esc(a.id) + '">Save status</button>' +
            (a.prehire_token ? '' :
              '<button class="secondary" style="background:#e3ded2" data-app-prehire="' + esc(a.id) + '" data-drives="' + roleDrives(a.role_slug) + '">Send pre-hire link</button>') +
            '<span class="status" data-app-msg="' + esc(a.id) + '"></span>' +
          '</div>' +
          '<div class="rev-actions" style="margin-top:8px">' +
            '<input type="text" data-app-note="' + esc(a.id) + '" placeholder="Internal note" value="' + esc(a.notes_internal || '') + '" style="flex:1;min-width:240px">' +
            '<button class="secondary" style="background:#e3ded2" data-app-note-save="' + esc(a.id) + '">Save note</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function loadApplicants() {
    var el = document.getElementById('applicants-list');
    var status = document.getElementById('app-filter-status').value;
    var role = document.getElementById('app-filter-role').value;
    var qs = [];
    if (status) qs.push('status=' + encodeURIComponent(status));
    if (role) qs.push('role=' + encodeURIComponent(role));
    el.textContent = 'Loading…';

    return api('/api/applications' + (qs.length ? '?' + qs.join('&') : ''))
      .then(function (data) {
        var list = data.rows || [];
        if (!list.length) { el.innerHTML = '<p style="color:#7a746a;font-size:14px">No applications match this filter.</p>'; return; }
        el.innerHTML = '<p style="color:#7a746a;font-size:13px;margin:0 0 12px">' + list.length + ' application' + (list.length === 1 ? '' : 's') + '</p>' +
                       list.map(applicantHtml).join('');
      })
      .catch(function (e) {
        el.innerHTML = '<p class="status err">Could not load applications: ' + esc(e.message) + '</p>';
      });
  }

  // ---- Vendors -------------------------------------------------------------

  var VENDOR_STATUSES = ['new', 'verifying', 'approved', 'rejected', 'inactive'];

  function vendorHtml(v) {
    var id = 'vendor-' + v.id;
    var d = v.details || {};
    var badgeClass = ['new', 'approved', 'rejected'].indexOf(v.status) >= 0 ? v.status : '';

    // Everything that must be true before this vendor can be dispatched.
    var blockers = [];
    if (d.license_required === 'yes' && !v.license_verified_at) blockers.push('licence not verified');
    if (!v.coi_received) blockers.push('no certificate of insurance');
    if (!v.workers_comp_verified) blockers.push("workers' comp not verified");
    var blockerNote = blockers.length && v.status !== 'approved'
      ? '<p style="margin:10px 0 0;font-size:13px;color:#8a6221"><strong>Before approving:</strong> ' + esc(blockers.join(' · ')) + '</p>'
      : '';

    var expiring = '';
    if (v.license_expires) {
      var days = Math.round((new Date(v.license_expires) - new Date()) / 86400000);
      if (days < 0) expiring = '<span class="badge declined">Licence expired</span>';
      else if (days < 45) expiring = '<span class="badge warn">Licence expires in ' + days + ' days</span>';
    }

    return '' +
      '<div class="rev-item" data-id="' + esc(v.id) + '">' +
        '<div class="rev-head">' +
          '<div>' +
            '<strong>' + esc(v.business_name) + '</strong> ' +
            '<span class="badge ' + badgeClass + '">' + esc(v.status) + '</span> ' + expiring +
            '<p class="rev-meta">' + esc((v.trades || []).join(', ')) + ' · submitted ' + esc(fmtDate(v.created_at)) + '</p>' +
          '</div>' +
          '<button class="secondary" style="background:#e3ded2" onclick="' + toggler(id) + '">Details</button>' +
        '</div>' +
        '<div class="rev-body" id="' + id + '">' +
          rows([
            ['Contact', v.contact_name + (d.contact_title ? ' (' + d.contact_title + ')' : '')],
            ['Email', '<a href="mailto:' + esc(v.email) + '">' + esc(v.email) + '</a>', 'raw'],
            ['Phone', v.phone],
            ['After hours', d.emergency_phone],
            ['Website', d.website ? '<a href="' + esc(d.website) + '" target="_blank" rel="noopener">' + esc(d.website) + '</a>' : '', 'raw'],
            ['Areas covered', (v.areas || []).join(', ')],
            ['Property types', d.property_types],
            ['Storm coverage', d.storm_coverage],
            ['Years in business', d.years_in_business],
            ['Technicians', d.crew_size],
            ['Entity', d.entity_type],
            ['Licence required', d.license_required === 'yes' ? 'Yes' : 'No statewide licence'],
            ['Licence number', v.license_number],
            ['Licence holder', d.license_holder],
            ['Issuing authority', v.license_authority],
            ['Licence expires', v.license_expires],
            ['Certifications', d.certifications],
            ['GL carrier', d.gl_carrier],
            ['GL limit', d.gl_limit],
            ['GL expires', d.gl_expires],
            ["Workers' comp", d.workers_comp === 'covered' ? 'Carries coverage'
                : d.workers_comp === 'exempt' ? 'Holds Florida exemption' : d.workers_comp],
            ['Commercial auto', d.auto_insurance],
            ['Can name us as holder', d.can_name_holder],
            ['Tech screening', d.tech_screening],
            ['Hourly rate', v.hourly_rate !== null && v.hourly_rate !== undefined ? '$' + v.hourly_rate : ''],
            ['After-hours rate', d.afterhours_rate ? '$' + d.afterhours_rate : ''],
            ['Emergency rate', d.emergency_rate ? '$' + d.emergency_rate : ''],
            ['Trip fee', d.trip_fee ? '$' + d.trip_fee : ''],
            ['Minimum charge', d.minimum_charge ? '$' + d.minimum_charge : ''],
            ['Materials markup', d.materials_markup ? d.materials_markup + '%' : ''],
            ['Response — routine', d.response_routine],
            ['Response — emergency', d.response_emergency],
            ['Payment terms', d.payment_terms],
            ['Warranty', d.warranty],
            ['Volume discount', d.volume_discount],
            ['Prices hold for', d.price_validity],
            ['Licence verified', v.license_verified_at ? fmtDate(v.license_verified_at) + (v.license_verified_by ? ' by ' + v.license_verified_by : '') : 'Not verified'],
          ]) +
          (d.flat_rates ? '<h4 style="margin:14px 0 6px">Flat-rate pricing</h4><p style="white-space:pre-wrap;margin:0">' + esc(d.flat_rates) + '</p>' : '') +
          (d.notes ? '<h4 style="margin:14px 0 6px">Notes</h4><p style="white-space:pre-wrap;margin:0">' + esc(d.notes) + '</p>' : '') +
          blockerNote +
          '<div class="checklist">' +
            '<label><input type="checkbox" data-vendor-flag="coi_received" data-id="' + esc(v.id) + '"' + (v.coi_received ? ' checked' : '') + '> Certificate of insurance received</label>' +
            '<label><input type="checkbox" data-vendor-flag="workers_comp_verified" data-id="' + esc(v.id) + '"' + (v.workers_comp_verified ? ' checked' : '') + "> Workers' comp verified</label>" +
            '<label><input type="checkbox" data-vendor-flag="w9_received" data-id="' + esc(v.id) + '"' + (v.w9_received ? ' checked' : '') + '> W-9 received</label>' +
          '</div>' +
          '<div class="rev-actions">' +
            (v.license_verified_at ? '' : '<button class="secondary" style="background:#e3ded2" data-vendor-verify="' + esc(v.id) + '">Mark licence verified</button>') +
            '<select data-vendor-status="' + esc(v.id) + '">' +
              VENDOR_STATUSES.map(function (st) {
                return '<option value="' + st + '"' + (st === v.status ? ' selected' : '') + '>' + st + '</option>';
              }).join('') +
            '</select>' +
            '<button data-vendor-save="' + esc(v.id) + '">Save status</button>' +
            '<span class="status" data-vendor-msg="' + esc(v.id) + '"></span>' +
          '</div>' +
          '<div class="rev-actions" style="margin-top:8px">' +
            '<input type="text" data-vendor-note="' + esc(v.id) + '" placeholder="Internal note" value="' + esc(v.notes_internal || '') + '" style="flex:1;min-width:240px">' +
            '<button class="secondary" style="background:#e3ded2" data-vendor-note-save="' + esc(v.id) + '">Save note</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function loadVendors() {
    var el = document.getElementById('vendors-list');
    var status = document.getElementById('vendor-filter-status').value;
    el.textContent = 'Loading…';
    return api('/api/vendors' + (status ? '?status=' + encodeURIComponent(status) : ''))
      .then(function (data) {
        var list = data.rows || [];
        if (!list.length) { el.innerHTML = '<p style="color:#7a746a;font-size:14px">No vendor submissions match this filter.</p>'; return; }
        el.innerHTML = '<p style="color:#7a746a;font-size:13px;margin:0 0 12px">' + list.length + ' submission' + (list.length === 1 ? '' : 's') + '</p>' +
                       list.map(vendorHtml).join('');
      })
      .catch(function (e) {
        el.innerHTML = '<p class="status err">Could not load vendors: ' + esc(e.message) + '</p>';
      });
  }

  // ---- Wiring --------------------------------------------------------------
  // One delegated listener each, so re-rendering a list never leaves stale
  // handlers behind.

  function msg(selector, id, text, cls) {
    var el = document.querySelector('[' + selector + '="' + id + '"]');
    if (el) { el.textContent = text; el.className = 'status' + (cls ? ' ' + cls : ''); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'BUTTON') return;

    var id;

    if ((id = t.getAttribute('data-app-save'))) {
      var status = document.querySelector('[data-app-status="' + id + '"]').value;
      msg('data-app-msg', id, 'Saving…');
      api('/api/applications/' + id, { method: 'PATCH', body: JSON.stringify({ status: status }) })
        .then(function () { msg('data-app-msg', id, 'Saved.', 'ok'); })
        .catch(function (err) { msg('data-app-msg', id, err.message, 'err'); });
    }

    else if ((id = t.getAttribute('data-app-note-save'))) {
      var note = document.querySelector('[data-app-note="' + id + '"]').value;
      msg('data-app-msg', id, 'Saving note…');
      api('/api/applications/' + id, { method: 'PATCH', body: JSON.stringify({ notes_internal: note }) })
        .then(function () { msg('data-app-msg', id, 'Note saved.', 'ok'); })
        .catch(function (err) { msg('data-app-msg', id, err.message, 'err'); });
    }

    else if ((id = t.getAttribute('data-app-prehire'))) {
      // This is what starts the background check, so it asks first.
      if (!window.confirm('Send the pre-hire authorization link?\n\nOnly do this after you have made a written conditional offer — ' +
                          'this is the page where the candidate authorizes a background check.')) return;
      var drives = t.getAttribute('data-drives') !== 'false';
      msg('data-app-msg', id, 'Sending…');
      api('/api/applications/' + id, { method: 'PATCH', body: JSON.stringify({ issue_prehire: { drives: drives } }) })
        .then(function () { msg('data-app-msg', id, 'Link sent.', 'ok'); return loadApplicants(); })
        .catch(function (err) { msg('data-app-msg', id, err.message, 'err'); });
    }

    else if ((id = t.getAttribute('data-vendor-save'))) {
      var vstatus = document.querySelector('[data-vendor-status="' + id + '"]').value;
      msg('data-vendor-msg', id, 'Saving…');
      api('/api/vendors/' + id, { method: 'PATCH', body: JSON.stringify({ status: vstatus }) })
        .then(function () { msg('data-vendor-msg', id, 'Saved.', 'ok'); return loadVendors(); })
        .catch(function (err) { msg('data-vendor-msg', id, err.message, 'err'); });
    }

    else if ((id = t.getAttribute('data-vendor-note-save'))) {
      var vnote = document.querySelector('[data-vendor-note="' + id + '"]').value;
      msg('data-vendor-msg', id, 'Saving note…');
      api('/api/vendors/' + id, { method: 'PATCH', body: JSON.stringify({ notes_internal: vnote }) })
        .then(function () { msg('data-vendor-msg', id, 'Note saved.', 'ok'); })
        .catch(function (err) { msg('data-vendor-msg', id, err.message, 'err'); });
    }

    else if ((id = t.getAttribute('data-vendor-verify'))) {
      if (!window.confirm('Confirm you have checked this licence directly with the issuing authority ' +
                          '(DBPR, FDACS, DOH or the State Fire Marshal) — not just looked at a photo of the card.')) return;
      msg('data-vendor-msg', id, 'Recording…');
      api('/api/vendors/' + id, { method: 'PATCH', body: JSON.stringify({ license_verified: { by: 'admin' } }) })
        .then(function () { msg('data-vendor-msg', id, 'Licence marked verified.', 'ok'); return loadVendors(); })
        .catch(function (err) { msg('data-vendor-msg', id, err.message, 'err'); });
    }

    else if (t.id === 'app-refresh') loadApplicants();
    else if (t.id === 'vendor-refresh') loadVendors();
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    var flag = t && t.getAttribute && t.getAttribute('data-vendor-flag');
    if (!flag) return;
    var id = t.getAttribute('data-id');
    var payload = {};
    payload[flag] = t.checked;
    msg('data-vendor-msg', id, 'Saving…');
    api('/api/vendors/' + id, { method: 'PATCH', body: JSON.stringify(payload) })
      .then(function () { msg('data-vendor-msg', id, 'Saved.', 'ok'); })
      .catch(function (err) { msg('data-vendor-msg', id, err.message, 'err'); t.checked = !t.checked; });
  });

  window.GPC_HIRING = {
    init: function (adminToken) {
      token = adminToken;

      var roleSelect = document.getElementById('app-filter-role');
      if (roleSelect && roleSelect.options.length <= 1 && typeof window.GPC_JOBS !== 'undefined') {
        window.GPC_JOBS.forEach(function (j) {
          var o = document.createElement('option');
          o.value = j.slug; o.textContent = j.title;
          roleSelect.appendChild(o);
        });
      }
      document.getElementById('app-filter-status').addEventListener('change', loadApplicants);
      if (roleSelect) roleSelect.addEventListener('change', loadApplicants);
      document.getElementById('vendor-filter-status').addEventListener('change', loadVendors);

      loadApplicants();
      loadVendors();
    },
    loadApplicants: loadApplicants,
    loadVendors: loadVendors,
  };
})();
