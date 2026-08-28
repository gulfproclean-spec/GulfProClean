// site-chrome.js
// ---------------------------------------------------------------------------
// Nav, promo bar and footer for the plain-HTML pages (careers, vendors).
// The React marketing pages get the same chrome from gulfproclean-shared.jsx —
// keep the two in step when links change.
// ---------------------------------------------------------------------------

(function () {
  var NAVY = '#153238', GOLD = '#b68235', GOLD_DARK = '#8a6221', CREAM = '#f5f2ec', RULE = '#d8d3c8';

  var LINKS = [
    ['Residential', 'residential.html'],
    ['Commercial', 'commercial.html'],
    ['Careers', 'careers.html'],
    ['Vendors', 'vendors.html'],
    ['Contact Us', 'contact.html'],
    ['My Account', 'account.html'],
  ];

  var LOGO =
    '<svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">' +
    '<circle cx="14" cy="14" r="12.5" stroke="' + GOLD + '" stroke-width="1.3"/>' +
    '<circle cx="14" cy="7.4" r="1.7" stroke="' + GOLD + '" stroke-width="1.4"/>' +
    '<path d="M14 9.1V20.5" stroke="' + GOLD + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M9.4 11.6h9.2" stroke="' + GOLD + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M6.8 15.2c0 3.9 3.2 6.5 7.2 6.5s7.2-2.6 7.2-6.5" stroke="' + GOLD + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>';

  function navHtml(active) {
    var items = LINKS.map(function (l) {
      var on = l[1] === active;
      return '<a href="' + l[1] + '" style="color:inherit;opacity:' + (on ? '1' : '0.92') +
        ';font-weight:' + (on ? '600' : '400') + ';border-bottom:2px solid ' + (on ? GOLD : 'transparent') +
        ';padding-bottom:2px;">' + l[0] + '</a>';
    }).join('');

    return '' +
      '<nav style="position:sticky;top:0;z-index:50;background:' + CREAM + ';border-bottom:1px solid ' + RULE +
      ';display:flex;align-items:center;gap:24px;padding:14px clamp(20px,5vw,56px);color:' + NAVY +
      ';font-size:14px;flex-wrap:wrap;row-gap:8px;">' +
      '<a href="index.html" style="margin-right:auto;color:inherit;display:flex;align-items:center;gap:10px;">' + LOGO +
      '<span>' +
      '<span style="display:block;font-weight:800;font-size:21px;letter-spacing:-0.01em;">' +
      '<span style="color:' + NAVY + ';">Gulf</span><span style="color:' + GOLD + ';">ProClean</span></span>' +
      '<span style="display:block;font-size:11px;font-weight:500;letter-spacing:0.02em;color:#7a746a;margin-top:2px;">One Company. Everything Your Property Needs.</span>' +
      '<span style="display:block;font-size:9.5px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:' + GOLD_DARK + ';margin-top:2px;">★ Veteran Owned &amp; Family Operated</span>' +
      '</span></a>' + items + '</nav>' +
      '<div style="background:linear-gradient(135deg,' + GOLD + ',#d9a94a);color:' + NAVY +
      ';text-align:center;padding:13px 20px;font-weight:700;font-size:14.5px;letter-spacing:0.02em;">✦ No contracts. Cancel anytime. ✦</div>';
  }

  function footerHtml() {
    return '' +
      '<footer style="padding:48px clamp(20px,5vw,56px) 48px;max-width:1100px;margin:60px auto 0;font-size:13px;color:#7a746a;border-top:1px solid ' + RULE + ';">' +
      '<div style="display:flex;gap:22px;flex-wrap:wrap;margin-bottom:14px;">' +
      ['index.html|Home', 'residential.html|Residential', 'commercial.html|Commercial', 'careers.html|Careers',
       'vendors.html|Vendors &amp; Subcontractors', 'contact.html|Contact', 'account.html|My Account']
        .map(function (p) { var x = p.split('|'); return '<a href="' + x[0] + '" style="color:' + GOLD_DARK + ';">' + x[1] + '</a>'; })
        .join('') +
      '</div>' +
      'Gulf ProClean — a veteran-owned, family-operated business serving homes and businesses from Pensacola to Panama City Beach.' +
      '<div style="margin-top:10px;">Gulf ProClean is an equal opportunity employer. ' +
      '<a href="careers-process.html" style="color:' + GOLD_DARK + ';">Hiring process &amp; applicant notices →</a></div>' +
      '</footer>';
  }

  // Mounts chrome into <div id="site-nav"> and <div id="site-footer"> if present.
  function mountChrome(active) {
    var n = document.getElementById('site-nav');
    if (n) n.innerHTML = navHtml(active);
    var f = document.getElementById('site-footer');
    if (f) f.innerHTML = footerHtml();
  }

  window.GPC_CHROME = { navHtml: navHtml, footerHtml: footerHtml, mount: mountChrome,
                        NAVY: NAVY, GOLD: GOLD, GOLD_DARK: GOLD_DARK, CREAM: CREAM, RULE: RULE };
})();
