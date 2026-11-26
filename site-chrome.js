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
      ';text-align:center;padding:13px 20px;font-weight:700;font-size:14.5px;letter-spacing:0.02em;">✦ No contracts. Cancel anytime. ✦ ' +
      '<a href="tel:+18506775077" style="color:' + NAVY + ';text-decoration:underline;white-space:nowrap;">Call 850-677-5077</a></div>';
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
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;"><span style="margin-right:6px;">Follow us:</span>' +
      [['Facebook', 'https://www.facebook.com/profile.php?id=61596687972105', 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'],
       ['Instagram', 'https://www.instagram.com/gulfproclean/', 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z'],
       ['YouTube', 'https://www.youtube.com/@gulfproclean', 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'],
       ['TikTok', 'https://www.tiktok.com/@gulfproclean', 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'],
       ['Nextdoor', 'https://nextdoor.com/page/gulf-proclean-fort-walton-beach-fl/', 'M12 2.5 1.5 11.2h2.9V21h6v-6.2h3.2V21h6v-9.8h2.9z'],
       ['Google Reviews', 'https://g.page/r/CcS69nb8JRiqEBM/review', 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z']]
        .map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener" aria-label="' + s[0] + '" title="' + s[0] + '" style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:' + NAVY + ';"><svg width="18" height="18" viewBox="0 0 24 24" fill="' + CREAM + '" aria-hidden="true"><path d="' + s[2] + '"/></svg></a>'; })
        .join('') +
      '</div>' +
      'Gulf ProClean — a veteran-owned, family-operated business serving homes and businesses from Pensacola to Panama City Beach. ' +
      'Call <a href="tel:+18506775077" style="color:' + GOLD_DARK + ';font-weight:600;">850-677-5077</a>.' +
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
