// account-gate.js — shared "create an account / log in" gate used by
// apply.html (applicant accounts) and vendors-bid.html (vendor accounts).
// Mirrors the account step already built into book.html for customers:
// signup/login tabs, email + password, then the real form is revealed.
// Everything downstream (apply-form.js, vendors-form.js) already POSTs with
// fetch(), which sends cookies same-origin by default, so no changes were
// needed there — the session cookie set here is what the server checks.
window.GPC_ACCOUNT_GATE = {
  // opts: { authPrefix, gateId, formId, noun } — authPrefix is the API
  // prefix ('/api/applicant-auth' or '/api/vendor-auth'), gateId/formId are
  // element ids already in the page, noun is what to call a new account
  // ("applicant" / "vendor") in the tab label.
  mount: function (opts) {
    var gate = document.getElementById(opts.gateId);
    var form = document.getElementById(opts.formId);
    var mode = 'signup';

    function render() {
      gate.innerHTML =
        '<div class="gate-tabs">' +
          '<div class="gate-tab' + (mode !== 'login' ? ' active' : '') + '" id="gate-tab-signup">New ' + opts.noun + '</div>' +
          '<div class="gate-tab' + (mode === 'login' ? ' active' : '') + '" id="gate-tab-login">I have an account</div>' +
        '</div>' +
        '<label class="field"><span class="label">Email</span><input type="email" id="gate-email" autocomplete="email"></label>' +
        '<label class="field"><span class="label">Password</span><input type="password" id="gate-password" autocomplete="' +
          (mode === 'login' ? 'current-password' : 'new-password') + '" placeholder="' +
          (mode === 'login' ? 'Your password' : 'At least 8 characters') + '"></label>' +
        '<div class="gate-error" id="gate-err" style="display:none">' + '</div>' +
        '<button type="button" class="btn" id="gate-submit">' + (mode === 'login' ? 'Log in' : 'Create account & continue') + '</button>';
      document.getElementById('gate-tab-signup').onclick = function () { mode = 'signup'; render(); };
      document.getElementById('gate-tab-login').onclick = function () { mode = 'login'; render(); };
      document.getElementById('gate-submit').onclick = submit;
    }

    function unlock(email) {
      gate.style.display = 'none';
      form.style.display = '';
      if (opts.onUnlock) opts.onUnlock(email);
    }

    async function submit() {
      var email = document.getElementById('gate-email').value.trim();
      var password = document.getElementById('gate-password').value;
      var err = document.getElementById('gate-err');
      err.style.display = 'none';
      var btn = document.getElementById('gate-submit');
      btn.disabled = true;
      try {
        var url = opts.authPrefix + (mode === 'login' ? '/login' : '/signup');
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        unlock(data.email);
      } catch (e) {
        err.textContent = e.message;
        err.style.display = 'block';
        btn.disabled = false;
      }
    }

    // Already-signed-in visitors (an existing session cookie) skip straight
    // to the form — this only gates people who aren't authenticated yet.
    form.style.display = 'none';
    fetch(opts.authPrefix + '/me').then(function (r) { return r.json(); }).then(function (me) {
      if (me.loggedIn) unlock(me.email);
      else render();
    }).catch(render);
  },
};
