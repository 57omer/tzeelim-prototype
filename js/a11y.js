/* Accessibility toolbar. Preferences live only in this browser (localStorage "tzA11y").
   It supplements, and does not replace, an accessible site (SI 5568). */
(function () {
  'use strict';
  var KEY = 'tzA11y', doc = document, root = doc.documentElement;
  var DEF = { size: 0, contrast: false, gray: false, links: false, font: false, spacing: false, still: false };
  var st = (function () { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEF); } })();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function apply() {
    var c = root.classList;
    [0, 1, 2, 3].forEach(function (i) { c.toggle('a11y-s' + i, st.size === i && i > 0); });
    c.toggle('a11y-contrast', !!st.contrast); c.toggle('a11y-gray', !!st.gray); c.toggle('a11y-links', !!st.links);
    c.toggle('a11y-font', !!st.font); c.toggle('a11y-spacing', !!st.spacing); c.toggle('a11y-still', !!st.still);
    if (st.still) { Array.prototype.forEach.call(doc.querySelectorAll('video'), function (v) { try { v.pause(); } catch (e) {} }); }
    try { window.dispatchEvent(new CustomEvent('tz:a11y', { detail: st })); } catch (e) {}
  }
  window.TZ = window.TZ || {}; window.TZ.a11y = { state: function () { return st; } };
  apply();

  var ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="4.6" r="1.8"/><path d="M5 8.6l7 1.6 7-1.6M12 10.2v4.3m0 0l-3.2 6m3.2-6l3.2 6"/></svg>';
  var ITEMS = [
    ['size+', 'הגדלת טקסט'], ['size-', 'הקטנת טקסט'], ['contrast', 'ניגודיות גבוהה'], ['gray', 'גווני אפור'],
    ['links', 'הדגשת קישורים'], ['font', 'גופן קריא'], ['spacing', 'ריווח שורות'], ['still', 'עצירת תנועה']
  ];

  function build() {
    var btn = doc.createElement('button');
    btn.type = 'button'; btn.className = 'a11y-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'תפריט נגישות'); btn.innerHTML = ICON;
    var p = doc.createElement('div'); p.className = 'a11y-panel'; p.id = 'a11y-panel'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'תפריט נגישות');
    p.innerHTML = '<div class="a11y-panel__h"><b>נגישות</b><button type="button" class="a11y-x" aria-label="סגירת תפריט הנגישות">&times;</button></div>' +
      '<div class="a11y-grid">' + ITEMS.map(function (it) { return '<button type="button" class="a11y-opt" data-k="' + it[0] + '"' + (/^size/.test(it[0]) ? '' : ' aria-pressed="false"') + '>' + it[1] + '</button>'; }).join('') + '</div>' +
      '<div class="a11y-foot"><button type="button" class="a11y-reset">איפוס הגדרות</button><a href="legal.html?doc=accessibility">הצהרת נגישות</a></div>';
    btn.setAttribute('aria-controls', 'a11y-panel');
    doc.body.appendChild(btn); doc.body.appendChild(p);

    function sync() {
      Array.prototype.forEach.call(p.querySelectorAll('[data-k]'), function (b) { var k = b.getAttribute('data-k'); if (k.indexOf('size') !== 0) b.setAttribute('aria-pressed', st[k] ? 'true' : 'false'); });
    }
    function open(v) {
      p.hidden = !v; btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v) { sync(); p.querySelector('.a11y-opt').focus(); } else btn.focus();
    }
    btn.addEventListener('click', function () { open(p.hidden); });
    p.querySelector('.a11y-x').addEventListener('click', function () { open(false); });
    p.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); open(false); } });
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-k]');
      if (b) {
        var k = b.getAttribute('data-k');
        if (k === 'size+') st.size = Math.min(3, st.size + 1); else if (k === 'size-') st.size = Math.max(0, st.size - 1); else st[k] = !st[k];
        save(); apply(); sync(); return;
      }
      if (e.target.closest && e.target.closest('.a11y-reset')) { st = Object.assign({}, DEF); save(); apply(); sync(); }
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build); else build();
})();
