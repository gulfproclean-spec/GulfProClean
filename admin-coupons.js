// admin-coupons.js — the Coupons section of admin.html.
//
// Issue a code, see who has redeemed it and what it has cost, and switch it
// off. Deactivating never deletes: the redemption history is what tells you
// whether a promotion was worth running.
(function () {
  var token = null;

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function money(n) {
    var v = Number(n);
    return isFinite(v) ? '$' + v.toFixed(2) : '$0.00';
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

  function statusOf(c) {
    if (!c.active) return { label: 'off', color: '#8a3d3d' };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: 'expired', color: '#8a3d3d' };
    if (c.max_redemptions != null && Number(c.times_redeemed) >= Number(c.max_redemptions)) {
      return { label: 'used up', color: '#7a746a' };
    }
    return { label: 'live', color: '#2f6b4f' };
  }

  function row(c) {
    var st = statusOf(c);
    var limit = c.max_redemptions == null ? 'unlimited' : c.max_redemptions;
    var scope = c.customer_id
      ? 'locked to ' + esc(c.customer_email || 'one customer')
      : (c.page ? esc(c.page) + ' only' : 'anyone');

    return ''
      + '<div class="rev-item">'
      + '  <div class="rev-head">'
      + '    <strong style="font-family:ui-monospace,monospace;letter-spacing:0.04em">' + esc(c.code) + '</strong>'
      + '    <span><span class="badge" style="color:' + st.color + ';border-color:' + st.color + '">' + st.label + '</span></span>'
      + '  </div>'
      + '  <p class="rev-meta">'
      +      Number(c.percent_off) + '% off &middot; ' + scope + ' &middot; '
      +      esc(c.times_redeemed) + ' of ' + esc(limit) + ' used'
      +      (Number(c.total_discounted) > 0 ? ' &middot; ' + money(c.total_discounted) + ' given away' : '')
      +      (c.expires_at ? ' &middot; expires ' + fmtDate(c.expires_at) : '')
      +    '</p>'
      +    (c.description ? '<p class="rev-meta">' + esc(c.description) + '</p>' : '')
      + '  <div class="rev-actions">'
      + '    <button class="secondary" data-coupon-toggle="' + esc(c.code) + '" data-active="' + (c.active ? '1' : '0') + '" style="background:#e3ded2">'
      +        (c.active ? 'Turn off' : 'Turn back on') + '</button>'
      + '    <span class="status" data-coupon-msg="' + esc(c.code) + '"></span>'
      + '  </div>'
      + '</div>';
  }

  function loadCoupons() {
    var el = document.getElementById('coupons-list');
    el.textContent = 'Loading…';
    return api('/api/coupons')
      .then(function (data) {
        var rows = data.rows || [];
        if (!rows.length) { el.innerHTML = '<p style="color:#7a746a">No coupons yet.</p>'; return; }
        el.innerHTML = rows.map(row).join('');
      })
      .catch(function (err) { el.innerHTML = '<p style="color:#8a3d3d">' + esc(err.message) + '</p>'; });
  }

  function createCoupon() {
    var get = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var msg = document.getElementById('coupon-create-msg');
    var body = {
      code: get('new-coupon-code'),
      percentOff: Number(get('new-coupon-pct')),
      description: get('new-coupon-desc') || null,
      customerEmail: get('new-coupon-email') || null,
      maxRedemptions: get('new-coupon-max') || null,
      expiresAt: get('new-coupon-expires') || null,
      page: get('new-coupon-page') || null,
    };
    msg.textContent = 'Creating…'; msg.className = 'status';
    api('/api/coupons', { method: 'POST', body: JSON.stringify(body) })
      .then(function () {
        msg.textContent = 'Created.'; msg.className = 'status ok';
        ['new-coupon-code', 'new-coupon-desc', 'new-coupon-email', 'new-coupon-max', 'new-coupon-expires']
          .forEach(function (id) { var e = document.getElementById(id); if (e) e.value = ''; });
        loadCoupons();
      })
      .catch(function (err) { msg.textContent = err.message; msg.className = 'status err'; });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-coupon-toggle]');
    if (!t) return;
    var code = t.getAttribute('data-coupon-toggle');
    var turningOff = t.getAttribute('data-active') === '1';
    if (turningOff && !window.confirm('Turn off ' + code + '?\n\nAnyone holding this code will no longer be able to use it. Redemptions already made are kept.')) return;
    var msg = document.querySelector('[data-coupon-msg="' + code + '"]');
    api('/api/coupons/' + encodeURIComponent(code), {
      method: 'PATCH', body: JSON.stringify({ active: !turningOff }),
    })
      .then(function () { loadCoupons(); })
      .catch(function (err) { if (msg) { msg.textContent = err.message; msg.className = 'status err'; } });
  });

  window.GPC_COUPONS = {
    init: function (adminToken) {
      token = adminToken;
      var btn = document.getElementById('coupon-create');
      if (btn) btn.addEventListener('click', createCoupon);
      var refresh = document.getElementById('coupon-refresh');
      if (refresh) refresh.addEventListener('click', loadCoupons);
      loadCoupons();
    },
    loadCoupons: loadCoupons,
  };
})();
