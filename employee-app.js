// employee-app.js — the Gulf ProClean Crew app (employee.html, and the
// iOS/Android app shells under apps/crew/). Signed-in technicians see the
// bookings assigned to them (functions/api/employee/jobs.js), work the
// residential or commercial checklist phase by phase, clock in/out, get a
// sign-off, and file a start-of-shift supply check. Property type comes
// from the booking (bookings.page) — never chosen here.
(function () {
  'use strict';

  /* ============================== CHECKLIST DATA ============================== */
  var DATA = {
    residential: {
      arrival: [
        { key:"prep", title:"Pre-Arrival & Safety", items:[
          "Review job ticket: access code / lockbox / alarm code / pets",
          "Confirm scope: recurring subscription visit vs. one-time deep clean",
          "Vehicle stocked: chemicals labeled, cloths, vacuum, mop, PPE, gloves",
          "Non-slip shoes and gloves worn; chemicals stored upright, not mixed",
          "Arrive within scheduled window — text ETA if running behind"
        ]},
        { key:"walk", title:"Arrival & Walkthrough", items:[
          "Photo: exterior / entry, before starting",
          "Check in with client or leave arrival notice per instructions",
          "Walk the home; note any pre-existing damage before touching anything",
          "Confirm today's rooms and any client add-on requests",
          "Set up equipment; test vacuum and tools"
        ]}
      ],
      clean: [
        { key:"kitchen", title:"Kitchen", items:[
          "Counters, backsplash and island wiped down",
          "Sink, faucet and fixtures scrubbed and shined",
          "Stovetop and exterior of appliances cleaned",
          "Microwave interior and exterior",
          "Cabinet fronts spot-cleaned",
          "Floor swept and mopped"
        ]},
        { key:"bath", title:"Bathrooms", items:[
          "Toilet bowl, seat and base sanitized",
          "Tub / shower, glass and grout scrubbed",
          "Mirror streak-free",
          "Sink, counter and fixtures cleaned",
          "Floor mopped and baseboards wiped",
          "Trash emptied, liner replaced"
        ]},
        { key:"living", title:"Bedrooms & Living Areas", items:[
          "Surfaces and furniture dusted (including tops of frames, shelves)",
          "Beds made / linens changed if in scope",
          "Vacuum carpets and rugs, including edges",
          "Trash emptied throughout",
          "Light switches, doorknobs and handrails wiped (high-touch)"
        ]},
        { key:"floors", title:"Floors & Glass", items:[
          "All hard floors mopped, corners and edges included",
          "Interior windows and glass doors within reach",
          "Entry mats shaken out or vacuumed"
        ]}
      ],
      finish: [
        { key:"qc", title:"Quality Control & Wrap-Up", items:[
          "Final walkthrough against this checklist, room by room",
          "Supplies restocked in kit; chemicals capped and secured",
          "Home locked per instructions; alarm reactivated if applicable",
          "Any damage, maintenance issue or follow-up logged in notes",
          "Time out and mileage logged"
        ]}
      ]
    },
    commercial: {
      arrival: [
        { key:"prep", title:"Pre-Arrival & Safety", items:[
          "Review site ticket: access badge, gate code, after-hours instructions",
          "Confirm scope: nightly / weekly contract vs. one-time job",
          "Vehicle stocked: labeled chemicals, PPE, floor equipment, caution signage",
          "Non-slip shoes and gloves worn; wet-floor signs available",
          "Arrive within scheduled window — notify site contact if delayed"
        ]},
        { key:"walk", title:"Arrival & Sign-In", items:[
          "Photo: entrance / lobby, before starting",
          "Sign in with site contact, security desk, or badge log",
          "Walk the site; note existing damage or hazards before starting",
          "Confirm zones in scope for tonight and any special requests",
          "Set up equipment and place wet-floor signage"
        ]}
      ],
      clean: [
        { key:"lobby", title:"Entry & Lobby", items:[
          "Glass doors and entry glass cleaned, streak-free",
          "Mats vacuumed or shaken out",
          "Trash and recycling emptied, liners replaced",
          "Floor vacuumed or mopped per surface type"
        ]},
        { key:"restrooms", title:"Restrooms", items:[
          "Toilets and urinals fully sanitized",
          "Sinks, counters and mirrors cleaned",
          "Paper towels, toilet paper and soap restocked",
          "Floor mopped, trash emptied",
          "Wet-floor sign placed and removed once dry"
        ]},
        { key:"common", title:"Break & Common Areas", items:[
          "Counters and tables wiped down",
          "Sink and exterior of shared appliances cleaned",
          "Trash and recycling emptied, liners replaced",
          "Floor vacuumed or mopped"
        ]},
        { key:"offices", title:"Offices & Workstations", items:[
          "Desk surfaces cleaned in unoccupied / cleared areas only",
          "Trash emptied at each station",
          "Vacuum carpets; mop hard-floor zones",
          "Nothing on desks moved, filed, or thrown away without instruction"
        ]},
        { key:"touch", title:"High-Touch Points", items:[
          "Door handles and push plates",
          "Light switches and elevator buttons",
          "Handrails and stair rails",
          "Shared equipment (copier, phones) exterior only"
        ]}
      ],
      finish: [
        { key:"qc", title:"Quality Control & Wrap-Up", items:[
          "Final walkthrough against this checklist, zone by zone",
          "Wet-floor signage removed once floors are dry",
          "Supplies restocked in kit; chemicals capped and secured",
          "Site locked and alarm set per instructions",
          "Any damage, maintenance issue or follow-up logged in notes",
          "Time out logged and site sign-out completed"
        ]}
      ]
    }
  };
  var PHASES = ["arrival","clean","finish"];
  var PHASE_LABEL = { arrival: 'Arrival & Safety', clean: 'Clean', finish: 'Finish & QC' };
  var SUPPLY_ITEMS = [
    'All-purpose cleaner', 'Glass cleaner', 'Disinfectant spray', 'Toilet bowl cleaner & brush',
    'Microfiber cloths', 'Mop, bucket & wringer', 'Vacuum — working & bag/canister emptied',
    'Trash bags (kitchen + can liners)', 'Gloves', 'Wet-floor signs'
  ];

  /* ============================== STATE ============================== */
  var state = {
    me: null, jobs: [], supply: null,
    view: 'home', filter: 'today', activeJobId: null, activePhase: 'arrival',
    openCat: {}, allCollapsed: false, busy: false, error: '',
  };
  var root = document.getElementById('app');

  /* ============================== HELPERS ============================== */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function todayStr() {
    var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(d) {
    if (!d) return 'Unscheduled';
    var s = String(d).slice(0, 10);
    try { return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return s; }
  }
  function fmtTime(ts) { return ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''; }
  function api(path, options) {
    return fetch(path, Object.assign({ credentials: 'include' }, options, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {}),
    })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) { state.me = null; render(); throw new Error(data.error || 'signed out'); }
        if (!res.ok) throw new Error(data.error || res.statusText);
        return data;
      });
    });
  }
  function jobType(job) { return job.property_type === 'commercial' ? 'commercial' : 'residential'; }
  function jobDate(job) { return job.scheduled_date ? String(job.scheduled_date).slice(0, 10) : ''; }
  function checks(job) { return job.checks || {}; }
  function totalItems(job) {
    var n = 0, def = DATA[jobType(job)];
    PHASES.forEach(function (p) { def[p].forEach(function (c) { n += c.items.length; }); });
    return n;
  }
  function doneItems(job) {
    var c = checks(job), n = 0;
    Object.keys(c).forEach(function (k) { if (c[k]) n++; });
    return n;
  }
  function pct(job) { var t = totalItems(job); return t ? Math.round(doneItems(job) / t * 100) : 0; }
  function phaseStats(job, phase) {
    var def = DATA[jobType(job)][phase], c = checks(job), done = 0, total = 0;
    def.forEach(function (cat) { cat.items.forEach(function (_, i) { total++; if (c[phase + '::' + cat.key + '::' + i]) done++; }); });
    return { done: done, total: total };
  }
  function jobStatus(job) {
    var so = job.signoff || {};
    if (pct(job) === 100 && so.confirmed) return 'complete';
    if (job.clock_in) return 'in_progress';
    return 'scheduled';
  }
  function statusLabel(s) { return { scheduled: 'Scheduled', in_progress: 'In progress', complete: 'Complete' }[s]; }
  function planLabel(job) {
    var bt = job.booking_type || '';
    if (/one/i.test(bt)) return 'One-time';
    return (job.frequency ? job.frequency + ' · ' : '') + (bt || 'Plan');
  }

  /* ============================== DATA LOADING ============================== */
  function loadAll() {
    return Promise.all([api('/api/employee/jobs'), api('/api/employee/supply-check')]).then(function (r) {
      state.jobs = r[0].jobs || [];
      state.supply = r[1].check || null;
      state.error = '';
    }).catch(function (e) { state.error = e.message; });
  }
  function patchJob(id, body) {
    return api('/api/employee/jobs/' + id, { method: 'PATCH', body: JSON.stringify(body) }).then(function (d) {
      var job = state.jobs.filter(function (j) { return j.id === id; })[0];
      if (job && d.progress) {
        job.checks = d.progress.checks; job.notes = d.progress.notes; job.signoff = d.progress.signoff;
        job.clock_in = d.progress.clock_in; job.clock_out = d.progress.clock_out;
      }
    });
  }

  /* ============================== RENDER ============================== */
  function render() {
    if (!state.me) { root.innerHTML = renderLogin(); return; }
    var html = renderTopbar();
    if (state.error) html += '<div class="banner err">' + esc(state.error) + '</div>';
    if (state.view === 'job') html += renderJob();
    else if (state.view === 'supply') html += renderSupply();
    else if (state.view === 'account') html += renderAccount();
    else html += renderHome();
    root.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function renderLogin() {
    return '' +
      '<div class="login">' +
        '<div class="login-card">' +
          '<div class="brand">GULF PROCLEAN</div>' +
          '<h1>Crew sign in</h1>' +
          '<p class="muted">Use the email and password the office set up for you.</p>' +
          '<form id="login-form">' +
            '<label>Email<input type="email" id="login-email" autocomplete="username" required></label>' +
            '<label>Password<input type="password" id="login-password" autocomplete="current-password" required></label>' +
            '<div class="status err" id="login-status"></div>' +
            '<button type="submit" class="primary wide">Sign in</button>' +
          '</form>' +
          '<p class="muted small">Forgot your password? Ask the office to reset it from the Crew panel.</p>' +
        '</div>' +
      '</div>';
  }

  function renderTopbar() {
    var back = state.view !== 'home';
    return '' +
      '<header class="topbar">' +
        (back ? '<button class="icon" data-nav="home" aria-label="Back">‹</button>' : '<span class="brand">GULF PROCLEAN</span>') +
        '<span class="topbar-title">' + (state.view === 'job' ? 'Job' : state.view === 'supply' ? 'Supply check' : state.view === 'account' ? 'Account' : 'My jobs') + '</span>' +
        '<button class="icon" data-nav="account" aria-label="Account">' + esc((state.me.name || state.me.email || '?').charAt(0).toUpperCase()) + '</button>' +
      '</header>';
  }

  function renderHome() {
    var t = todayStr();
    var supplyDone = !!state.supply;
    var flagged = supplyDone ? Object.keys(state.supply.items || {}).filter(function (k) { return state.supply.items[k] !== 'ok'; }).length : 0;
    var html = '<section class="pad">';
    html += '<div class="supply-banner ' + (supplyDone ? 'done' : '') + '" data-nav="supply">' +
      '<div><strong>' + (supplyDone ? 'Supply check done' : 'Start-of-shift supply check') + '</strong>' +
      '<div class="muted small">' + (supplyDone ? (flagged ? flagged + ' item' + (flagged > 1 ? 's' : '') + ' flagged' : 'All kit items OK') : 'Check your kit before the first job') + '</div></div>' +
      '<span class="chev">›</span></div>';

    var filters = [['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Completed'], ['all', 'All']];
    html += '<div class="chips">' + filters.map(function (f) {
      return '<button class="chip ' + (state.filter === f[0] ? 'on' : '') + '" data-filter="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div>';

    var list = state.jobs.filter(function (j) {
      var d = jobDate(j), s = jobStatus(j);
      if (state.filter === 'today') return d === t && s !== 'complete';
      if (state.filter === 'upcoming') return d > t && s !== 'complete';
      if (state.filter === 'done') return s === 'complete';
      return true;
    });
    if (!list.length) html += '<p class="empty">No jobs here right now.</p>';
    html += list.map(function (j) {
      var s = jobStatus(j), p = pct(j);
      return '<div class="card job" data-open="' + esc(j.id) + '">' +
        '<div class="card-head"><span class="badge ' + jobType(j) + '">' + jobType(j) + '</span><span class="badge st-' + s + '">' + statusLabel(s) + '</span></div>' +
        '<div class="addr">' + esc(j.address) + '</div>' +
        '<div class="muted small">' + esc(fmtDate(j.scheduled_date)) + (j.scheduled_time ? ' · ' + esc(j.scheduled_time) : '') + ' · ' + esc(planLabel(j)) + (j.tier ? ' · ' + esc(j.tier) : '') + '</div>' +
        '<div class="bar"><span style="width:' + p + '%"></span></div>' +
        '<div class="muted small">' + p + '% of checklist</div>' +
      '</div>';
    }).join('');
    html += '</section>';
    return html;
  }

  function renderJob() {
    var job = state.jobs.filter(function (j) { return j.id === state.activeJobId; })[0];
    if (!job) { state.view = 'home'; return renderHome(); }
    var s = jobStatus(job), type = jobType(job);
    var customer = ((job.first_name || '') + ' ' + (job.last_name || '')).trim();
    var html = '<section class="pad">';
    html += '<div class="card">' +
      '<div class="card-head"><span class="badge ' + type + '">' + type + '</span><span class="badge st-' + s + '">' + statusLabel(s) + '</span></div>' +
      '<div class="addr">' + esc(job.address) + '</div>' +
      '<div class="muted small">' + esc(fmtDate(job.scheduled_date)) + (job.scheduled_time ? ' · ' + esc(job.scheduled_time) : '') + ' · ' + esc(planLabel(job)) + (job.tier ? ' · ' + esc(job.tier) : '') + '</div>' +
      (customer ? '<div class="small" style="margin-top:6px">' + esc(customer) + (job.phone ? ' · <a href="tel:' + esc(job.phone) + '">' + esc(job.phone) + '</a>' : '') + '</div>' : '') +
      (job.customer_notes ? '<div class="note-box"><strong>Customer notes:</strong> ' + esc(job.customer_notes) + '</div>' : '') +
      (Array.isArray(job.addons_applied) && job.addons_applied.length ? '<div class="note-box"><strong>Add-ons this visit:</strong> ' + esc(job.addons_applied.join(', ')) + '</div>' : '') +
      '<div class="row" style="margin-top:12px">' +
        (job.clock_in ? '<span class="small">In ' + esc(fmtTime(job.clock_in)) + (job.clock_out ? ' · Out ' + esc(fmtTime(job.clock_out)) : '') + '</span>' : '') +
        (!job.clock_in ? '<button class="primary" data-clock="in">Clock in</button>' : (!job.clock_out ? '<button class="secondary" data-clock="out">Clock out</button>' : '')) +
      '</div>' +
    '</div>';

    html += '<div class="phases">' + PHASES.map(function (p) {
      var st = phaseStats(job, p);
      return '<button class="phase ' + (state.activePhase === p ? 'on' : '') + '" data-phase="' + p + '">' + PHASE_LABEL[p] + '<span>' + st.done + '/' + st.total + '</span></button>';
    }).join('') + '</div>';

    html += '<div class="row between"><span class="muted small">Tap a heading to open or close it.</span>' +
      '<button class="link" data-collapse="' + (state.allCollapsed ? 'show' : 'hide') + '">' + (state.allCollapsed ? 'Show details' : 'Hide details') + '</button></div>';

    var c = checks(job);
    html += DATA[type][state.activePhase].map(function (cat) {
      var ck = state.activePhase + '::' + cat.key;
      var isOpen = state.openCat[ck] !== undefined ? state.openCat[ck] : !state.allCollapsed;
      var done = cat.items.filter(function (_, i) { return c[ck + '::' + i]; }).length;
      return '<div class="cat">' +
        '<button class="cat-head" data-cat="' + ck + '"><span>' + esc(cat.title) + '</span><span class="muted small">' + done + '/' + cat.items.length + ' ' + (isOpen ? '▾' : '▸') + '</span></button>' +
        (isOpen ? '<div class="items">' + cat.items.map(function (item, i) {
          var key = ck + '::' + i;
          return '<label class="item ' + (c[key] ? 'on' : '') + '"><input type="checkbox" data-check="' + key + '" ' + (c[key] ? 'checked' : '') + '><span>' + esc(item) + '</span></label>';
        }).join('') + '</div>' : '') +
      '</div>';
    }).join('');

    var notes = job.notes || {};
    html += '<div class="card"><label class="lbl">Notes — ' + PHASE_LABEL[state.activePhase] + '</label>' +
      '<textarea id="phase-note" rows="3" placeholder="Damage found, access issues, client requests…">' + esc(notes[state.activePhase] || '') + '</textarea>' +
      '<div class="row"><button class="secondary" id="save-note">Save note</button><span class="status" id="note-status"></span></div></div>';

    if (state.activePhase === 'finish') {
      var so = job.signoff || {};
      html += '<div class="card"><label class="lbl">' + (type === 'commercial' ? 'Site contact sign-off' : 'Client sign-off') + '</label>' +
        '<input type="text" id="signoff-name" placeholder="Name of person signing off" value="' + esc(so.name || '') + '">' +
        '<label class="item" style="margin-top:8px"><input type="checkbox" id="signoff-confirmed" ' + (so.confirmed ? 'checked' : '') + '><span>Walkthrough completed and work accepted</span></label>' +
        '<div class="row"><button class="primary" id="save-signoff">Save sign-off</button><span class="status" id="signoff-status"></span></div>' +
        (pct(job) < 100 ? '<p class="muted small">Job shows as complete once every item is checked and sign-off is confirmed.</p>' : '') +
      '</div>';
    }
    html += '</section>';
    return html;
  }

  function renderSupply() {
    var existing = state.supply, items = (existing && existing.items) || {};
    var html = '<section class="pad"><p class="muted">Check every item before your first job. Flag anything running low or missing so the office can restock.</p>';
    html += SUPPLY_ITEMS.map(function (name) {
      var v = items[name] || 'ok';
      return '<div class="supply-row"><span>' + esc(name) + '</span><div class="tri">' +
        ['ok', 'low', 'out'].map(function (s) { return '<button class="tri-btn ' + s + (v === s ? ' on' : '') + '" data-supply="' + esc(name) + '" data-state="' + s + '">' + s.toUpperCase() + '</button>'; }).join('') +
      '</div></div>';
    }).join('');
    html += '<div class="card"><label class="lbl">Note to the office</label><textarea id="supply-notes" rows="2">' + esc((existing && existing.notes) || '') + '</textarea>' +
      '<div class="row"><button class="primary" id="save-supply">' + (existing ? 'Update today\'s check' : 'Submit supply check') + '</button><span class="status" id="supply-status"></span></div></div>';
    html += '</section>';
    return html;
  }

  function renderAccount() {
    return '<section class="pad">' +
      '<div class="card"><div class="addr">' + esc(state.me.name || '') + '</div><div class="muted small">' + esc(state.me.email || '') + '</div></div>' +
      '<div class="card"><label class="lbl">Change password</label>' +
        '<input type="password" id="pw-current" placeholder="Current password" autocomplete="current-password">' +
        '<input type="password" id="pw-new" placeholder="New password (8+ characters)" autocomplete="new-password">' +
        '<div class="row"><button class="secondary" id="save-pw">Update password</button><span class="status" id="pw-status"></span></div></div>' +
      '<button class="link danger" id="logout">Sign out</button>' +
      '<p class="muted small" style="margin-top:24px">Gulf ProClean Crew · v1.0</p>' +
    '</section>';
  }

  /* ============================== EVENTS ============================== */
  function setStatus(id, text, cls) { var el = document.getElementById(id); if (el) { el.textContent = text; el.className = 'status ' + (cls || ''); } }
  var draftSupply = null;

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'login-form') return;
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    setStatus('login-status', 'Signing in…');
    api('/api/employee-auth/login', { method: 'POST', body: JSON.stringify({ email: email, password: password }) })
      .then(function (d) { state.me = { email: d.email, name: d.name }; return loadAll(); })
      .then(render)
      .catch(function (err) { setStatus('login-status', err.message, 'err'); });
  });

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav],[data-filter],[data-open],[data-phase],[data-cat],[data-collapse],[data-clock],[data-supply],button');
    if (!t) return;
    var v;
    if ((v = t.getAttribute('data-nav'))) { state.view = v; state.error = ''; if (v === 'home') loadAll().then(render); else render(); }
    else if ((v = t.getAttribute('data-filter'))) { state.filter = v; render(); }
    else if ((v = t.getAttribute('data-open'))) { state.activeJobId = v; state.view = 'job'; state.activePhase = 'arrival'; state.openCat = {}; state.allCollapsed = false; render(); }
    else if ((v = t.getAttribute('data-phase'))) { state.activePhase = v; state.openCat = {}; render(); }
    else if ((v = t.getAttribute('data-cat'))) {
      var cur = state.openCat[v] !== undefined ? state.openCat[v] : !state.allCollapsed;
      state.openCat[v] = !cur; render();
    }
    else if ((v = t.getAttribute('data-collapse'))) { state.allCollapsed = v === 'hide'; state.openCat = {}; render(); }
    else if ((v = t.getAttribute('data-clock'))) {
      t.disabled = true;
      patchJob(state.activeJobId, v === 'in' ? { clockIn: true } : { clockOut: true }).then(render).catch(function (err) { state.error = err.message; render(); });
    }
    else if ((v = t.getAttribute('data-supply'))) {
      if (!draftSupply) { draftSupply = {}; SUPPLY_ITEMS.forEach(function (n) { draftSupply[n] = (state.supply && state.supply.items && state.supply.items[n]) || 'ok'; }); }
      draftSupply[v] = t.getAttribute('data-state');
      state.supply = Object.assign({}, state.supply || {}, { items: draftSupply, notes: (document.getElementById('supply-notes') || {}).value || '' , _draft: true });
      render();
    }
    else if (t.id === 'save-supply') {
      var items = {}; SUPPLY_ITEMS.forEach(function (n) { items[n] = (state.supply && state.supply.items && state.supply.items[n]) || 'ok'; });
      var notes = document.getElementById('supply-notes').value;
      setStatus('supply-status', 'Saving…');
      api('/api/employee/supply-check', { method: 'POST', body: JSON.stringify({ items: items, notes: notes }) })
        .then(function (d) { state.supply = d.check; draftSupply = null; state.view = 'home'; render(); })
        .catch(function (err) { setStatus('supply-status', err.message, 'err'); });
    }
    else if (t.id === 'save-note') {
      var text = document.getElementById('phase-note').value;
      setStatus('note-status', 'Saving…');
      patchJob(state.activeJobId, { note: { phase: state.activePhase, text: text } })
        .then(function () { setStatus('note-status', 'Saved.', 'ok'); })
        .catch(function (err) { setStatus('note-status', err.message, 'err'); });
    }
    else if (t.id === 'save-signoff') {
      var so = { name: document.getElementById('signoff-name').value, confirmed: document.getElementById('signoff-confirmed').checked };
      setStatus('signoff-status', 'Saving…');
      patchJob(state.activeJobId, so.confirmed ? { signoff: so, clockOut: true } : { signoff: so })
        .then(render)
        .catch(function (err) { setStatus('signoff-status', err.message, 'err'); });
    }
    else if (t.id === 'save-pw') {
      setStatus('pw-status', 'Saving…');
      api('/api/employee-auth/password', { method: 'POST', body: JSON.stringify({ currentPassword: document.getElementById('pw-current').value, newPassword: document.getElementById('pw-new').value }) })
        .then(function () { setStatus('pw-status', 'Password updated.', 'ok'); document.getElementById('pw-current').value = ''; document.getElementById('pw-new').value = ''; })
        .catch(function (err) { setStatus('pw-status', err.message, 'err'); });
    }
    else if (t.id === 'logout') {
      api('/api/employee-auth/logout', { method: 'POST' }).catch(function () {}).then(function () { state.me = null; state.jobs = []; state.view = 'home'; render(); });
    }
  });

  root.addEventListener('change', function (e) {
    var key = e.target.getAttribute && e.target.getAttribute('data-check');
    if (!key) return;
    var job = state.jobs.filter(function (j) { return j.id === state.activeJobId; })[0];
    if (!job) return;
    job.checks = Object.assign({}, job.checks || {}); job.checks[key] = e.target.checked;
    var body = { checks: {} }; body.checks[key] = e.target.checked;
    if (!job.clock_in) body.clockIn = true; // first tick starts the clock
    patchJob(state.activeJobId, body).then(function () { render(); }).catch(function (err) { state.error = err.message; render(); });
  });

  /* ============================== BOOT ============================== */
  api('/api/employee-auth/me').then(function (d) {
    if (d.loggedIn) { state.me = { id: d.id, email: d.email, name: d.name }; return loadAll(); }
  }).catch(function () {}).then(render);
})();
