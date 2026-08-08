// ==========================================================================
// Gulf Coast ProClean — site interactivity
// ==========================================================================
(function () {
  'use strict';

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close menu after a link is tapped (mobile)
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      });
    });
  }

  /* ---------- Sticky header shrink shadow ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 12) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll reveal ---------- */
  var revealTargets = document.querySelectorAll(
    '.service-card, .tier-card, .pillar-card, .stat'
  );
  if ('IntersectionObserver' in window && revealTargets.length) {
    revealTargets.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Subscription estimator ---------- */
  // Base monthly price per tier
  var TIERS = {
    small: { biweekly: { name: 'Essential', price: 99 }, weekly: { name: 'Premium', price: 299 } },
    medium: { biweekly: { name: 'Professional', price: 179 }, weekly: { name: 'Premium', price: 299 } },
    large: { biweekly: { name: 'Premium', price: 299 }, weekly: { name: 'Premium', price: 299 } }
  };
  // Rough one-time-visit equivalent used for the "vs one-off" comparison
  var ONE_OFF_VISIT = { small: 90, medium: 120, large: 165 };

  var state = { size: 'medium', freq: 'biweekly' };

  var estimator = document.getElementById('estimator');
  if (estimator) {
    var pillGroups = estimator.querySelectorAll('.pill-group');
    var resultTier = document.getElementById('resultTier');
    var resultSave = document.getElementById('resultSave');
    var estimatorCta = document.getElementById('estimatorCta');

    function visitsPerYear(freq) {
      return freq === 'weekly' ? 52 : 26;
    }

    function updateResult() {
      var tierInfo = TIERS[state.size][state.freq];
      var monthly = tierInfo.price;
      var annualSub = monthly * 12;

      var visits = visitsPerYear(state.freq);
      var annualOneOff = ONE_OFF_VISIT[state.size] * visits;
      var diff = annualOneOff - annualSub;

      resultTier.textContent = tierInfo.name + ' — $' + monthly + '/mo';

      if (diff > 0) {
        resultSave.textContent =
          'Save an estimated $' + diff.toLocaleString() + '/year vs. booking ' +
          visits + ' one-off visits — and skip the rebooking.';
      } else {
        resultSave.textContent =
          'Predictable pricing at $' + monthly + '/mo, with every visit already on the calendar.';
      }

      estimatorCta.textContent = 'Get the ' + tierInfo.name + ' Plan';
    }

    pillGroups.forEach(function (group) {
      var groupKey = group.getAttribute('data-group'); // "size" or "freq"
      group.querySelectorAll('.pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          group.querySelectorAll('.pill').forEach(function (b) {
            b.classList.remove('is-active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          state[groupKey] = btn.getAttribute('data-value');
          updateResult();
        });
      });
    });

    updateResult();
  }

  /* ---------- Quote form submission (Formspree-ready, AJAX) ---------- */
  var quoteForm = document.getElementById('quoteForm');
  var formStatus = document.getElementById('formStatus');
  var quoteSubmit = document.getElementById('quoteSubmit');

  if (quoteForm) {
    quoteForm.addEventListener('submit', function (e) {
      // Honeypot check
      var honeypot = quoteForm.querySelector('.hp-field');
      if (honeypot && honeypot.value) {
        e.preventDefault();
        return;
      }

      var action = quoteForm.getAttribute('action') || '';
      var isConfigured = action.indexOf('YOUR_FORM_ID') === -1 && action.indexOf('formspree.io') !== -1;

      // If Formspree hasn't been configured yet, don't attempt a network call —
      // just tell whoever is testing the site locally what to do next.
      if (!isConfigured) {
        e.preventDefault();
        formStatus.textContent =
          'Form not yet connected. Add your Formspree endpoint in index.html (see README) to go live.';
        formStatus.classList.add('is-error');
        return;
      }

      e.preventDefault();
      formStatus.classList.remove('is-error');
      formStatus.textContent = 'Sending…';
      quoteSubmit.disabled = true;

      var data = new FormData(quoteForm);

      fetch(action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            formStatus.textContent = "Thanks — we've got it. We'll be in touch within one business day.";
            quoteForm.reset();
          } else {
            return response.json().then(function (data) {
              var msg =
                data && data.errors
                  ? data.errors.map(function (err) { return err.message; }).join(', ')
                  : 'Something went wrong. Please call or text us instead.';
              formStatus.textContent = msg;
              formStatus.classList.add('is-error');
            });
          }
        })
        .catch(function () {
          formStatus.textContent = 'Network error — please call or text (850) 555-0100 instead.';
          formStatus.classList.add('is-error');
        })
        .finally(function () {
          quoteSubmit.disabled = false;
        });
    });
  }
})();
