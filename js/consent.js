/* Cookie / storage consent. The site sets no cookies and loads no analytics today.
   This banner records the visitor's choice (localStorage "tzConsent") so that any non-essential tool added later
   stays switched off until opted in. Gate such tools with: TZ.consent.when('analytics', function () { ...load tool... }); */
(function () {
  'use strict';
  var KEY = 'tzConsent', VERSION = 1, TTL = 365 * 24 * 3600 * 1000;
  var TZ = window.TZ = window.TZ || {};
  var doc = document, bar = null, listeners = [];

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && o.v === VERSION && Date.now() - o.ts < TTL) return o;
    } catch (e) {}
    return null;
  }
  function write(o) {
    o.v = VERSION; o.ts = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    listeners.forEach(function (l) { if (l.cat && o[l.cat]) { l.fn(); l.done = true; } });
    listeners = listeners.filter(function (l) { return !l.done; });
    try { window.dispatchEvent(new CustomEvent('tz:consent', { detail: o })); } catch (e) {}
  }

  TZ.consent = {
    get: function () { return read() || { analytics: false, marketing: false }; },
    when: function (cat, fn) { var c = read(); if (c && c[cat]) fn(); else listeners.push({ cat: cat, fn: fn }); },
    open: function () { show(true); }
  };

  function close(restore) {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null;
    if (restore && restore.focus) { try { restore.focus(); } catch (e) {} }
  }

  function show(custom) {
    var opener = doc.activeElement;
    if (bar) close();
    var cur = TZ.consent.get();
    bar = doc.createElement('div');
    bar.className = 'tzc';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-labelledby', 'tzc-t');
    bar.setAttribute('aria-describedby', 'tzc-d');
    bar.innerHTML =
      '<h2 class="tzc__t" id="tzc-t">פרטיות ועוגיות</h2>' +
      '<p class="tzc__d" id="tzc-d">האתר אינו משתמש כרגע בעוגיות סטטיסטיקה או שיווק, ואינו טוען שירותים חיצוניים בעת הגלישה. נשמרות במכשיר רק הגדרות חיוניות (למשל הבחירה הזו והעדפות נגישות). ' +
      '<a href="' + TZ.url('legal', 'cookies') + '">מדיניות עוגיות</a> · <a href="' + TZ.url('legal', 'privacy') + '">מדיניות פרטיות</a></p>' +
      '<div class="tzc__opts" hidden>' +
        '<label class="tzc__opt"><input type="checkbox" checked disabled> <span><b>הכרחיות</b> – תמיד פעילות. ללא זה האתר אינו עובד כראוי.</span></label>' +
        '<label class="tzc__opt"><input type="checkbox" name="analytics"' + (cur.analytics ? ' checked' : '') + '> <span><b>סטטיסטיקה</b> – מדידת שימוש באתר, ללא זיהוי אישי. לא בשימוש כרגע.</span></label>' +
        '<label class="tzc__opt"><input type="checkbox" name="marketing"' + (cur.marketing ? ' checked' : '') + '> <span><b>שיווק</b> – התאמת פרסומות ומדידתן. לא בשימוש כרגע.</span></label>' +
      '</div>' +
      '<div class="tzc__btns">' +
        '<button type="button" class="tzc__b" data-a="all">אישור הכול</button>' +
        '<button type="button" class="tzc__b" data-a="min">הכרחיות בלבד</button>' +
        '<button type="button" class="tzc__b tzc__b--ghost" data-a="custom" aria-expanded="false">התאמה אישית</button>' +
        '<button type="button" class="tzc__b" data-a="save" hidden>שמירת בחירה</button>' +
      '</div>';
    doc.body.appendChild(bar);
    var opts = bar.querySelector('.tzc__opts'), custB = bar.querySelector('[data-a=custom]'), saveB = bar.querySelector('[data-a=save]');
    function openOpts() { opts.hidden = false; saveB.hidden = false; custB.hidden = true; var f = bar.querySelector('input[name=analytics]'); if (f) f.focus(); }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'custom') { openOpts(); return; }
      var o = { analytics: false, marketing: false };
      if (a === 'all') { o.analytics = true; o.marketing = true; }
      if (a === 'save') { o.analytics = bar.querySelector('input[name=analytics]').checked; o.marketing = bar.querySelector('input[name=marketing]').checked; }
      write(o);
      close(opener && opener !== doc.body ? opener : null);
    });
    bar.addEventListener('keydown', function (e) { if (e.key === 'Escape' && read()) close(opener); });
    if (custom) { openOpts(); }
    else if (!read()) bar.classList.add('tzc--first');
  }

  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-tz-cookie-settings]');
    if (b) { e.preventDefault(); show(true); }
  });

  function init() { if (!read()) show(false); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
