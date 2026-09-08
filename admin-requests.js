// admin-requests.js — the "Money requests" section of admin.html.
//
// Refund requests and plan-change requests both compute an amount and stop.
// No code path in this application moves money out of Stripe. This screen
// exists so those requests are seen at all, and so that marking one settled
// requires pasting the id of the Stripe object that actually settled it.
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
    return isFinite(v) ? '$' + v.toFixed(2) : '—';
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

  function badge(status) {
    var color = status === 'pending' ? '#8a6221'
              : (status === 'processed' || status === 'applied') ? '#2f6b4f'
              : '#8a3d3d';
    return '<span class="badge" style="color:' + color + ';border-color:' + color + '">' + esc(status) + '</span>';
  }

  function stripeLink(pi) {
    if (!pi) return '<em style="color:#7a746a">no payment intent recorded</em>';
    return '<a href="https://dashboard.stripe.com/payments/' + esc(pi) + '" target="_blank" rel="noopener" '
         + 'style="color:#8a6221">' + esc(pi) + ' ↗</a>';
  }

  function card(kind, r) {
    var isRefund = kind === 'refund';
    var who = esc((r.first_name || '') + ' ' + (r.last_name || '')).trim() || esc(r.customer_email);
    var headline = isRefund
      ? money(r.amount) + ' refund'
      : r.old_months + '-month → ' + r.new_months + '-month'
        + (Number(r.price_difference) >= 0
            ? ' (charge ' + money(Math.abs(r.price_difference)) + ')'
            : ' (credit ' + money(Math.abs(r.price_difference)) + ')');

    var settledLabel = isRefund ? 'processed' : 'applied';
    var refLabel = isRefund ? 'Stripe refund id (re_…)' : 'Stripe payment intent or refund id';

    var detail = ''
      + '<dl>'
      + '<dt>Customer</dt><dd>' + who + ' &lt;' + esc(r.customer_email) + '&gt;</dd>'
      + '<dt>Booking</dt><dd>' + esc(r.tier) + ' ' + esc(r.page) + ' — ' + esc(r.address || '') + '</dd>'
      + '<dt>Paid originally</dt><dd>' + money(r.final_total) + '</dd>'
      + '<dt>Original payment</dt><dd>' + stripeLink(r.stripe_payment_intent_id) + '</dd>'
      + '<dt>Visits delivered / remaining</dt><dd>' + esc(r.visits_delivered) + ' / ' + esc(r.visits_remaining) + '</dd>'
      + (isRefund
          ? '<dt>Refund owed</dt><dd><strong>' + money(r.amount) + '</strong></dd>'
          : '<dt>Per-visit price</dt><dd>' + money(r.old_per_visit_price) + ' → ' + money(r.new_per_visit_price) + '</dd>')
      + '<dt>Requested</dt><dd>' + fmtDate(r.requested_at) + '</dd>'
      + (r.resolved_at ? '<dt>Resolved</dt><dd>' + fmtDate(r.resolved_at) + ' by ' + esc(r.resolved_by || '—') + '</dd>' : '')
      + ((r.stripe_refund_id || r.stripe_reference)
          ? '<dt>Settled by</dt><dd>' + esc(r.stripe_refund_id || r.stripe_reference) + '</dd>' : '')
      + (r.notes ? '<dt>Notes</dt><dd>' + esc(r.notes) + '</dd>' : '')
      + '</dl>';

    var actions = r.status !== 'pending' ? '' : ''
      + '<div class="money-warn">'
      + '<strong>This screen does not issue the refund in Stripe.</strong> '
      + 'Nothing in this application moves money. Open the original payment above in the Stripe '
      + 'dashboard, issue the ' + (isRefund ? 'refund' : 'charge or credit') + ' there, then come back and '
      + 'record it here. Marking it ' + settledLabel + ' without doing that leaves the customer unpaid '
      + 'and the record saying otherwise.'
      + '</div>'
      + '<div class="rev-actions">'
      + '<input type="text" data-ref="' + esc(r.id) + '" placeholder="' + esc(refLabel) + '" style="min-width:260px">'
      + '<input type="text" data-by="' + esc(r.id) + '" placeholder="Your name" style="min-width:130px">'
      + '<button data-settle="' + esc(r.id) + '" data-kind="' + kind + '">Record as ' + settledLabel + '</button>'
      + '<button class="secondary" data-decline="' + esc(r.id) + '" data-kind="' + kind + '" style="background:#e3ded2">Decline</button>'
      + '<span class="status" data-msg="' + esc(r.id) + '"></span>'
      + '</div>';

    return ''
      + '<div class="rev-item">'
      + '  <div class="rev-head">'
      + '    <strong>' + headline + '</strong>'
      + '    <span>' + badge(r.status) + '</span>'
      + '  </div>'
      + '  <p class="rev-meta">' + who + ' · requested ' + fmtDate(r.requested_at)
      +      (isRefund && r.canceled_at ? ' · booking canceled ' + fmtDate(r.canceled_at) : '') + '</p>'
      + '  <div class="rev-body open">' + detail + actions + '</div>'
      + '</div>';
  }

  function msg(id, text, cls) {
    var el = document.querySelector('[data-msg="' + id + '"]');
    if (el) { el.textContent = text; el.className = 'status ' + (cls || ''); }
  }

  function loadRequests() {
    var status = document.getElementById('req-filter-status').value;
    var el = document.getElementById('requests-list');
    el.textContent = 'Loading…';
    return api('/api/requests' + (status ? '?status=' + encodeURIComponent(status) : ''))
      .then(function (data) {
        var refunds = data.refunds || [];
        var plans = data.planChanges || [];
        if (!refunds.length && !plans.length) {
          el.innerHTML = '<p style="color:#7a746a">No requests.</p>';
          return;
        }
        var html = '';
        if (refunds.length) {
          html += '<h3 style="font-size:15px;margin:18px 0 10px">Refund requests (' + refunds.length + ')</h3>';
          html += refunds.map(function (r) { return card('refund', r); }).join('');
        }
        if (plans.length) {
          html += '<h3 style="font-size:15px;margin:18px 0 10px">Plan changes (' + plans.length + ')</h3>';
          html += plans.map(function (r) { return card('plan_change', r); }).join('');
        }
        el.innerHTML = html;
      })
      .catch(function (err) { el.innerHTML = '<p style="color:#8a3d3d">' + esc(err.message) + '</p>'; });
  }

  function patch(id, kind, status, ref, by) {
    return api('/api/requests/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: JSON.stringify({ kind: kind, status: status, stripeRef: ref || null, resolvedBy: by || null }),
    });
  }

  document.addEventListener('click', function (e) {
    var settle = e.target.closest && e.target.closest('[data-settle]');
    var decline = e.target.closest && e.target.closest('[data-decline]');

    if (settle) {
      var id = settle.getAttribute('data-settle');
      var kind = settle.getAttribute('data-kind');
      var ref = (document.querySelector('[data-ref="' + id + '"]') || {}).value || '';
      var by = (document.querySelector('[data-by="' + id + '"]') || {}).value || '';
      var settled = kind === 'refund' ? 'processed' : 'applied';
      if (!ref.trim()) {
        msg(id, 'Paste the Stripe id first — this screen does not move money.', 'err');
        return;
      }
      if (!window.confirm(
            'Confirm you have ALREADY issued this in the Stripe dashboard.\n\n' +
            'This records the outcome. It does not move any money. If you have not '
          + 'issued it in Stripe, the customer will not be paid.\n\nStripe id: ' + ref.trim())) return;
      patch(id, kind, settled, ref.trim(), by.trim())
        .then(function () { msg(id, 'Recorded.', 'ok'); loadRequests(); })
        .catch(function (err) { msg(id, err.message, 'err'); });
    }

    if (decline) {
      var did = decline.getAttribute('data-decline');
      var dkind = decline.getAttribute('data-kind');
      var dby = (document.querySelector('[data-by="' + did + '"]') || {}).value || '';
      if (!window.confirm('Decline this request? The customer is not notified automatically — contact them yourself.')) return;
      patch(did, dkind, 'declined', null, dby.trim())
        .then(function () { msg(did, 'Declined.', 'ok'); loadRequests(); })
        .catch(function (err) { msg(did, err.message, 'err'); });
    }
  });

  window.GPC_REQUESTS = {
    init: function (adminToken) {
      token = adminToken;
      document.getElementById('req-filter-status').addEventListener('change', loadRequests);
      document.getElementById('req-refresh').addEventListener('click', loadRequests);
      loadRequests();
    },
    loadRequests: loadRequests,
  };
})();
