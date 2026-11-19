/* Tzeelim admin – property manager. Static page: edits data/projects.js in the browser,
   keeps a draft (IndexedDB), previews with the real site, exports a ZIP or publishes to GitHub. */
(function () {
  'use strict';
  var BASE = '../';
  var STATUS = { marketing: 'בשיווק', construction: 'בבנייה', occupied: 'מאוכלס' };
  var ACC = { exact: 'מדויק', street: 'ברמת הרחוב', approx: 'משוער' };
  var KINDS = { render: 'הדמיה', plan: 'תוכנית', photo: 'צילום', placeholder: 'מקום שמור' };
  var BOX = [32.806, 35.044, 32.844, 35.099]; // map bounds of the 2D/3D site map
  var EXTRA = [['units', 'מספר דירות'], ['floors', 'קומות'], ['aptTypes', 'סוגי דירות'], ['occupancy', 'מועד אכלוס'], ['price', 'מחיר']];
  var REPO = { owner: '57omer', repo: 'tzeelim-prototype', branch: 'main' };
  var NOCACHE = Date.now();
  var S = { head: '', tail: '', orig: [], items: [], files: {}, content: null, contentOrig: null, cHead: '', cTail: '', tours: {}, view: 'list', filter: 'all', cur: -1, tab: 'details', iconHave: {}, cities: {}, ready: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg, ms) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 3200); }
  var HE = { 'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'p', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't' };
  function slugify(s) { var o = ''; String(s).split('').forEach(function (c) { o += HE[c] != null ? HE[c] : c; }); return o.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  /* ---------- derived fields (kept in sync on save) ---------- */
  function street(p) { return String(p.address || '').replace(/,\s*[^,]*$/, ''); }
  function cityHe(p) { return S.cities[p.city] || p.cityHe || ''; }
  function finalize(p) {
    var q = clone(p);
    q.statusHe = STATUS[q.status] || q.statusHe;
    q.cityHe = cityHe(q);
    q.address = (street(q) ? street(q) : q.name) + ', ' + q.cityHe;
    EXTRA.forEach(function (e) { if (q[e[0]] === '' || q[e[0]] == null) delete q[e[0]]; });
    if (q.published !== false) delete q.published;
    return q;
  }
  function finalItems() { return S.items.map(finalize); }

  /* ---------- file URLs (new uploads live in memory as blobs) ---------- */
  function src(path) { if (!path) return ''; var f = S.files[path]; return f ? f.url : BASE + path + '?x=' + NOCACHE; }

  /* ---------- draft persistence (IndexedDB) ---------- */
  var idb = null;
  function idbOpen() { return new Promise(function (res) { try { var r = indexedDB.open('tzAdmin', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { idb = r.result; res(); }; r.onerror = function () { res(); }; } catch (e) { res(); } }); }
  function idbGet(k) { return new Promise(function (res) { if (!idb) return res(null); var q = idb.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }
  function idbSet(k, v) { return new Promise(function (res) { if (!idb) return res(); var t = idb.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); }
  function idbDel(k) { return new Promise(function (res) { if (!idb) return res(); var t = idb.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = res; t.onerror = res; }); }
  var saveT;
  function persist() { clearTimeout(saveT); saveT = setTimeout(function () { var files = {}; Object.keys(S.files).forEach(function (k) { files[k] = S.files[k].blob; }); idbSet('draft', { items: S.items, content: S.content, tours: toursCur(), files: files }); }, 500); updateDirty(); }
  function toursCur() { var o = {}; Object.keys(S.tours).forEach(function (k) { o[k] = S.tours[k].cur; }); return o; }

  /* ---------- change tracking ---------- */
  function usedPaths() { var u = {}; S.items.forEach(function (p) { if (p.cover) u[p.cover] = 1; (p.images || []).forEach(function (i) { u[i.src] = 1; }); if (p.card) u[p.card] = 1; }); return u; }
  var CMOD = { company: 'עמוד הבית ואודות', values: 'עמוד הבית ואודות', sections: 'עמוד הבית ואודות', home: 'עמוד הבית ואודות', promo: 'עמוד הבית ואודות', partnersHeading: 'עמוד הבית ואודות', partners: 'עמוד הבית ואודות', articlesIntro: 'עמוד הבית ואודות', news: 'עמוד הבית ואודות', newsHeading: 'עמוד הבית ואודות', articles: 'מאמרים', legal: 'דפים משפטיים', contact: 'פרטי חברה וקשר' };
  function contentMods() {
    var set = {}, a = S.contentOrig || {}, b = S.content || {}, keys = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) set[CMOD[k] || 'תוכן'] = 1; });
    return Object.keys(set);
  }
  function toursChanged() { return Object.keys(S.tours).filter(function (k) { return JSON.stringify(S.tours[k].orig) !== JSON.stringify(S.tours[k].cur); }); }
  function referencedFiles() {
    var str = JSON.stringify([finalItems(), S.content, toursCur()]), out = [];
    Object.keys(S.files).forEach(function (k) { if (str.indexOf(k) >= 0 || k.indexOf('img/fig/') === 0) out.push(k); });
    return out;
  }
  function changes() {
    var o = {}; S.orig.forEach(function (p) { o[p.slug] = JSON.stringify(finalize(p)); });
    var cur = {}; S.items.forEach(function (p) { cur[p.slug] = JSON.stringify(finalize(p)); });
    var added = [], removed = [], changed = [];
    S.items.forEach(function (p) { if (!(p.slug in o)) added.push(p.name); else if (o[p.slug] !== cur[p.slug]) changed.push(p.name); });
    S.orig.forEach(function (p) { if (!(p.slug in cur)) removed.push(p.name); });
    var oo = S.orig.map(function (p) { return p.slug; }).filter(function (s) { return s in cur; }).join(','), cc = S.items.map(function (p) { return p.slug; }).filter(function (s) { return s in o; }).join(',');
    var reordered = oo !== cc;
    var files = referencedFiles(), icons = files.filter(function (k) { return k.indexOf('img/fig/') === 0; }).length, imgs = files.length - icons;
    var mods = contentMods(), tours = toursChanged();
    return { added: added, removed: removed, changed: changed, reordered: reordered, imgs: imgs, icons: icons, mods: mods, tours: tours, projects: !!(added.length || removed.length || changed.length || reordered), content: !!mods.length,
      total: added.length + removed.length + changed.length + (reordered ? 1 : 0) + imgs + icons + mods.length + tours.length };
  }
  function updateDirty() {
    if (!S.ready) return;
    var c = changes(), d = $('#dirty');
    d.hidden = !c.total; d.textContent = 'יש שינויים שלא פורסמו';
    $('#btn-export').disabled = !c.total; $('#btn-publish').disabled = !c.total;
  }

  /* ---------- build output ---------- */
  function usedFiles() { return referencedFiles().map(function (k) { return { path: k, blob: S.files[k].blob }; }); }
  function buildJs() { return S.head + JSON.stringify(finalItems(), null, 2) + S.tail; }
  function outputs() {
    var c = changes(), out = [];
    if (c.projects) out.push({ path: 'data/projects.js', text: buildJs() });
    if (c.content) out.push({ path: 'data/content.js', text: S.cHead + JSON.stringify(S.content, null, 2) + S.cTail });
    c.tours.forEach(function (k) { var t = S.tours[k]; out.push({ path: t.file, text: t.head + JSON.stringify(t.cur) + t.tail }); });
    return out;
  }
  function markPublished() {
    S.orig = clone(finalItems()); S.contentOrig = clone(S.content);
    Object.keys(S.tours).forEach(function (k) { S.tours[k].orig = clone(S.tours[k].cur); });
    S.files = {};
  }

  /* ---------- load ---------- */
  function fetchText(path) { return fetch(BASE + path, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('לא נמצא ' + path); return r.text(); }); }
  function parseTour(key, text) {
    var m = text.match(/^([\s\S]*?window\.TZ_TOURS\['([^']+)'\]\s*=\s*)(\{[\s\S]*\})(;\s*)$/);
    if (!m) throw new Error('פורמט סיור לא מוכר: ' + key);
    var o = JSON.parse(m[3]); return { file: 'data/tour-' + key + '.js', head: m[1], tail: m[4], orig: o, cur: clone(o) };
  }
  function load() {
    var draft;
    return fetchText('data/projects.js').then(function (text) {
      var eq = text.indexOf('=', text.indexOf('window.PROJECTS')), end = text.indexOf('\n];', eq);
      if (eq < 0 || end < 0) throw new Error('פורמט הקובץ לא מוכר');
      S.head = text.slice(0, eq + 1) + ' '; S.tail = text.slice(end + 2);
      S.orig = JSON.parse(text.slice(eq + 1, end + 2));
      S.orig.forEach(function (p) { S.cities[p.city] = p.cityHe; });
      return fetchText('data/content.js');
    }).then(function (text) {
      var eq = text.indexOf('=', text.indexOf('window.CONTENT')), end = text.indexOf('\n};', eq);
      S.cHead = text.slice(0, eq + 1) + ' '; S.cTail = text.slice(end + 2);
      S.contentOrig = JSON.parse(text.slice(eq + 1, end + 2));
      var keys = []; S.orig.forEach(function (p) { (p.tours || []).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
      return Promise.all(keys.map(function (k) { return fetchText('data/tour-' + k + '.js').then(function (t) { S.tours[k] = parseTour(k, t); }).catch(function () {}); }));
    }).then(function () { return idbGet('draft'); }).then(function (d) {
      draft = d;
      if (d && d.items) {
        S.items = d.items; S.content = d.content || clone(S.contentOrig);
        Object.keys(d.tours || {}).forEach(function (k) { if (S.tours[k]) S.tours[k].cur = d.tours[k]; });
        Object.keys(d.files || {}).forEach(function (k) { var b = d.files[k]; S.files[k] = { blob: b, url: URL.createObjectURL(b) }; });
        S.restored = true;
      } else { S.items = clone(S.orig); S.content = clone(S.contentOrig); }
      S.items.forEach(function (p) { S.cities[p.city] = S.cities[p.city] || p.cityHe; });
      S.ready = true; probeIcons(); render(); updateDirty();
      if (S.restored) toast('שוחזרה טיוטה שלא פורסמה');
    }).catch(function (e) { app.innerHTML = '<p class="center err">לא הצלחנו לטעון את הנתונים: ' + esc(e.message) + '</p>'; });
  }
  function probeIcons() {
    S.items.forEach(function (p) {
      if (S.iconHave[p.slug] != null) return;
      var im = new Image(); im.onload = function () { S.iconHave[p.slug] = true; iconBadge(); }; im.onerror = function () { S.iconHave[p.slug] = false; iconBadge(); }; im.src = BASE + 'img/fig/' + p.slug + '.png?x=' + NOCACHE;
    });
  }
  function missingIcons() { return S.items.filter(function (p) { return p.published !== false && p.status !== 'occupied' ? !S.iconHave[p.slug] && !S.files['img/fig/' + p.slug + '.png'] : false; }); }
  function iconBadge() { var n = missingIcons().length, b = $('#icons-count'); if (b) { b.hidden = !n; b.textContent = n; } if (S.view === 'icons') render(); }

  /* ---------- rendering ---------- */
  var NAV = [['list', 'נכסים', ['list', 'edit']], ['home', 'עמוד הבית', ['home']], ['articles', 'מאמרים', ['articles', 'article']], ['company', 'חברה וקשר', ['company']], ['legal', 'משפטי', ['legal']], ['icons', 'אייקונים חסרים', ['icons']]];
  function renderNav() {
    $('.top__nav').innerHTML = NAV.map(function (n) { return '<button class="tab' + (n[2].indexOf(S.view) >= 0 ? ' is-on' : '') + '" data-view="' + n[0] + '">' + n[1] + (n[0] === 'icons' ? ' <span class="count" id="icons-count" hidden></span>' : '') + '</button>'; }).join('');
    var m = missingIcons().length, b = $('#icons-count'); if (b) { b.hidden = !m; b.textContent = m; }
  }
  var VIEWS = {};
  function render() {
    renderNav();
    if (map) { map.remove(); map = null; }
    if (S.view === 'list') viewList(); else if (S.view === 'edit') viewEdit(); else if (S.view === 'icons') viewIcons();
    else if (VIEWS[S.view]) VIEWS[S.view](); else viewList();
  }

  function viewList() {
    var tabs = [['all', 'הכול'], ['marketing', 'בשיווק'], ['construction', 'בבנייה'], ['occupied', 'מאוכלסים']];
    var list = S.items.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return S.filter === 'all' || x.p.status === S.filter; });
    var ch = changes();
    var orig = {}; S.orig.forEach(function (p) { orig[p.slug] = JSON.stringify(finalize(p)); });
    var h = '<div class="bar"><h1>נכסים</h1><div class="filters">' + tabs.map(function (t) { return '<button class="chip' + (S.filter === t[0] ? ' is-on' : '') + '" data-act="filter" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
    h += '<p class="muted">הסדר כאן הוא הסדר באתר. נכס מוסתר נשאר במערכת אבל לא מוצג למבקרים.</p><div class="grid">';
    list.forEach(function (x, k) {
      var p = x.p, changed = orig[p.slug] !== JSON.stringify(finalize(p));
      h += '<article class="card' + (p.published === false ? ' is-hidden' : '') + '"><div class="card__img" style="background-image:url(\'' + esc(src(p.cover)) + '\')"></div><div class="card__body"><div class="card__name">' + esc(p.name) + '</div><div class="card__meta"><span class="badge badge--' + esc(p.status) + '">' + esc(STATUS[p.status] || p.status) + '</span>' + (p.sold ? '<span class="badge badge--sold">נמכר</span>' : '') + (p.published === false ? '<span class="badge">מוסתר</span>' : '') + (changed ? '<span class="badge badge--changed">שונה</span>' : '') + '</div></div><div class="card__foot"><button class="iconbtn" data-act="up" data-i="' + x.i + '" aria-label="הזז קדימה"' + (k === 0 ? ' disabled' : '') + '>▲</button><button class="iconbtn" data-act="down" data-i="' + x.i + '" aria-label="הזז אחורה"' + (k === list.length - 1 ? ' disabled' : '') + '>▼</button><span class="sp"></span><button class="btn btn--sm" data-act="edit" data-i="' + x.i + '">עריכה</button></div></article>';
    });
    h += '<button class="add" data-act="new">+ הוספת פרויקט</button></div>';
    app.innerHTML = h;
  }

  function field(label, inner, wide, hint) { return '<div class="field' + (wide ? ' field--wide' : '') + '"><label>' + label + '</label>' + inner + (hint ? '<small>' + hint + '</small>' : '') + '</div>'; }
  function viewEdit() {
    var p = S.items[S.cur]; if (!p) { S.view = 'list'; return render(); }
    var tabs = [['details', 'פרטים'], ['images', 'תמונות'], ['location', 'מיקום']];
    var h = '<div class="bar"><h1>' + esc(p.name || 'פרויקט חדש') + '</h1><button class="btn btn--ghost btn--sm" data-act="preview">תצוגה מקדימה באתר</button></div>';
    h += '<div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" class="' + (S.tab === t[0] ? 'is-on' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (S.tab === 'details') {
      h += '<div class="form">' +
        field('שם הפרויקט', '<input type="text" data-f="name" value="' + esc(p.name) + '">') +
        field('סטטוס', '<select data-f="status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (p.status === k ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select>') +
        field('עיר', '<select data-f="city">' + Object.keys(S.cities).map(function (k) { return '<option value="' + esc(k) + '"' + (p.city === k ? ' selected' : '') + '>' + esc(S.cities[k]) + '</option>'; }).join('') + '</select>', false, 'עיר חדשה? יש להוסיף ידנית גם למפה באתר.') +
        field('רחוב ומספר', '<input type="text" data-f="street" value="' + esc(street(p)) + '">', false, 'העיר מתווספת אוטומטית.') +
        field('תיאור', '<textarea data-f="desc">' + esc(p.desc || '') + '</textarea>', true, 'שורה ריקה מפרידה בין פסקאות.') +
        '<div class="field"><span class="lbl">מצב</span><label class="check"><input type="checkbox" data-f="sold"' + (p.sold ? ' checked' : '') + '> כל הדירות נמכרו (תג "נמכר")</label><label class="check"><input type="checkbox" data-f="published"' + (p.published !== false ? ' checked' : '') + '> מוצג באתר</label></div>' +
        '<details class="adv"><summary>פרטים נוספים שמופיעים בעמוד הפרויקט</summary><div class="form">' +
        EXTRA.map(function (e) { return field(e[1], '<input type="text" data-f="' + e[0] + '" value="' + esc(p[e[0]] || '') + '">'); }).join('') + '</div></details>' +
        '<details class="adv"><summary>אפשרויות מתקדמות</summary><div class="form">' +
        field('כתובת באנגלית (slug)', '<input type="text" dir="ltr" value="' + esc(p.slug) + '" readonly>', false, 'נקבע ביצירה ואינו משתנה, כדי לא לשבור קישורים ותיקיות תמונות.') +
        field('מקום בקרוסלת ההירו בדף הבית', '<input type="text" value="' + esc(p.heroIndex || 'לא בהירו') + '" readonly>', false, 'דורש וידאו ותמונת הירו ייעודיים. מטופל מחוץ לממשק.') +
        '</div></details></div>';
      h += '<div class="sticky"><div class="grp"><button class="btn btn--ghost" data-act="back">חזרה לרשימה</button></div><div class="grp"><button class="btn btn--danger" data-act="delete">מחיקת פרויקט</button></div></div>';
    }
    if (S.tab === 'images') {
      h += '<p class="muted">התמונה המסומנת "קאבר" מוצגת בכרטיס, בעמוד הבית ובראש עמוד הפרויקט. תמונות מוקטנות אוטומטית.</p><div class="imgs">';
      (p.images || []).forEach(function (im, i) {
        var isC = p.cover === im.src;
        h += '<div class="img' + (isC ? ' is-cover' : '') + '"><div class="img__pic" style="background-image:url(\'' + esc(src(im.src)) + '\')">' + (isC ? '<span class="img__tag">קאבר</span>' : '') + '</div><div class="img__body">' +
          '<select data-img="kind" data-i="' + i + '" aria-label="סוג תמונה">' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '"' + (im.kind === k ? ' selected' : '') + '>' + KINDS[k] + '</option>'; }).join('') + '</select>' +
          '<input type="text" data-img="alt" data-i="' + i + '" value="' + esc(im.alt || '') + '" placeholder="תיאור התמונה (לנגישות)" aria-label="תיאור התמונה">' +
          '<div class="img__row"><button class="btn btn--ghost btn--sm" data-act="imgprev" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>הקדם</button><button class="btn btn--ghost btn--sm" data-act="imgnext" data-i="' + i + '"' + (i === p.images.length - 1 ? ' disabled' : '') + '>אחר</button><button class="btn btn--ghost btn--sm" data-act="imgcover" data-i="' + i + '">קאבר</button><button class="btn btn--danger btn--sm" data-act="imgdel" data-i="' + i + '">הסרה</button></div></div></div>';
      });
      h += '<label class="drop" id="drop"><input type="file" id="file-img" accept="image/*" multiple hidden>גררו תמונות לכאן או לחצו לבחירה</label></div>';
      h += '<div class="sticky"><div class="grp"><button class="btn btn--ghost" data-act="back">חזרה לרשימה</button></div></div>';
    }
    if (S.tab === 'location') {
      h += '<p class="muted">לחצו על המפה כדי למקם את הפרויקט, או חפשו לפי הכתובת. החיפוש והמפה משתמשים ב-OpenStreetMap (בממשק הניהול בלבד).</p>' +
        '<div class="form">' + field('דיוק המיקום', '<select data-f="coordAccuracy">' + Object.keys(ACC).map(function (k) { return '<option value="' + k + '"' + (p.coordAccuracy === k ? ' selected' : '') + '>' + ACC[k] + '</option>'; }).join('') + '</select>', false, 'כשהמיקום לא מדויק האתר מציג "המיקום מקורב".') +
        '<div class="field"><span class="lbl">&nbsp;</span><button class="btn btn--ghost" data-act="geocode">חיפוש לפי הכתובת</button></div></div><div id="map"></div><p class="muted" id="coords"></p>';
      h += '<div class="sticky"><div class="grp"><button class="btn btn--ghost" data-act="back">חזרה לרשימה</button></div></div>';
    }
    app.innerHTML = h;
    if (S.tab === 'location') initMap(p);
  }

  var map = null, marker = null;
  function initMap(p) {
    if (typeof L === 'undefined') { $('#map').innerHTML = '<p class="center">המפה לא נטענה</p>'; return; }
    var ll = [p.lat || 32.8206, p.lng || 35.0640];
    map = L.map('map').setView(ll, p.lat ? 17 : 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    marker = L.marker(ll, { draggable: true }).addTo(map);
    function set(a, b) { p.lat = +a.toFixed(6); p.lng = +b.toFixed(6); marker.setLatLng([p.lat, p.lng]); coords(); persist(); }
    map.on('click', function (e) { set(e.latlng.lat, e.latlng.lng); });
    marker.on('dragend', function () { var q = marker.getLatLng(); set(q.lat, q.lng); });
    map._set = set; coords();
    function coords() { var b = BOX, out = p.lat < b[0] || p.lat > b[2] || p.lng < b[1] || p.lng > b[3]; $('#coords').innerHTML = 'קואורדינטות: ' + p.lat + ', ' + p.lng + (out ? ' <span class="err">· מחוץ לאזור המפה של האתר (קריות). הנקודה לא תוצג במפה.</span>' : ''); }
    setTimeout(function () { map.invalidateSize(); }, 100);
  }

  function viewIcons() {
    var miss = missingIcons();
    var h = '<div class="bar"><h1>אייקונים למפה</h1></div><div class="note">האייקון הוא איור קטן של הבניין שמופיע על המפה. הוא נוצר מחוץ לממשק (במנוע בינה מלאכותית). כאן מעלים את הקובץ המוכן: PNG ברקע שקוף, ריבוע של כ-512 פיקסלים. הקובץ נשמר בשם הפרויקט.</div>';
    h += '<h2>חסרים (' + miss.length + ')</h2>';
    if (!miss.length) h += '<p class="muted">לכל הפרויקטים הפעילים יש אייקון.</p>';
    miss.forEach(function (p) { h += iconRow(p, false); });
    var have = S.items.filter(function (p) { return S.iconHave[p.slug] || S.files['img/fig/' + p.slug + '.png']; });
    h += '<h2 style="margin-top:28px">קיימים (' + have.length + ')</h2>';
    have.forEach(function (p) { h += iconRow(p, true); });
    app.innerHTML = h;
  }
  function iconRow(p, has) {
    var path = 'img/fig/' + p.slug + '.png';
    return '<div class="icon-row">' + (has ? '<img src="' + esc(src(path)) + '" alt="">' : '<img alt="" style="visibility:hidden">') + '<div class="sp"><strong>' + esc(p.name) + '</strong><div class="muted">' + esc(STATUS[p.status]) + (S.files[path] ? ' · הועלה, ממתין לפרסום' : '') + '</div></div><label class="btn btn--ghost btn--sm">' + (has ? 'החלפה' : 'העלאה') + '<input type="file" accept="image/png" hidden data-icon="' + esc(p.slug) + '"></label></div>';
  }

  /* ---------- actions ---------- */
  function swap(i, j) { var t = S.items[i]; S.items[i] = S.items[j]; S.items[j] = t; }
  function neighbor(i, dir) { var j = i + dir; while (j >= 0 && j < S.items.length) { if (S.filter === 'all' || S.items[j].status === S.filter) return j; j += dir; } return -1; }
  function validate(p) {
    var e = [];
    if (!p.name || !p.name.trim()) e.push('חסר שם פרויקט');
    if (!p.cover) e.push('חסרה תמונת קאבר (בלשונית תמונות)');
    if (p.lat == null || p.lng == null) e.push('חסר מיקום על המפה');
    else if (p.lat < BOX[0] || p.lat > BOX[2] || p.lng < BOX[1] || p.lng > BOX[3]) e.push('המיקום מחוץ לאזור המפה של האתר');
    (p.images || []).forEach(function (im, i) { if (!im.alt) e.push('לתמונה ' + (i + 1) + ' חסר תיאור (מומלץ, לנגישות)'); });
    return e;
  }

  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]'); if (!b) return;
    var a = b.dataset.act, i = +b.dataset.i, p = S.items[S.cur];
    if (a === 'filter') { S.filter = b.dataset.v; render(); }
    else if (a === 'up' || a === 'down') { var j = neighbor(i, a === 'up' ? -1 : 1); if (j >= 0) { swap(i, j); persist(); render(); } }
    else if (a === 'edit') { S.cur = i; S.view = 'edit'; S.tab = 'details'; render(); window.scrollTo(0, 0); }
    else if (a === 'new') newProject();
    else if (a === 'back') { S.view = 'list'; render(); }
    else if (a === 'tab') { S.tab = b.dataset.v; render(); }
    else if (a === 'delete') delProject();
    else if (a === 'preview') preview();
    else if (a === 'imgprev' && i > 0) { var im = p.images; var t = im[i]; im[i] = im[i - 1]; im[i - 1] = t; persist(); render(); }
    else if (a === 'imgnext' && i < p.images.length - 1) { var im2 = p.images; var t2 = im2[i]; im2[i] = im2[i + 1]; im2[i + 1] = t2; persist(); render(); }
    else if (a === 'imgcover') { p.cover = p.images[i].src; persist(); render(); toast('הוגדר כקאבר'); }
    else if (a === 'imgdel') { if (confirm('להסיר את התמונה מהפרויקט?')) { var s = p.images[i].src; p.images.splice(i, 1); if (p.cover === s) p.cover = p.images.length ? p.images[0].src : ''; persist(); render(); } }
    else if (a === 'geocode') geocode(p);
  });
  app.addEventListener('input', fieldChange);
  app.addEventListener('change', function (ev) {
    fieldChange(ev);
    var t = ev.target;
    if (t.id === 'file-img') addImages(t.files);
    if (t.dataset && t.dataset.icon) addIcon(t.dataset.icon, t.files[0]);
    if (t.dataset && t.dataset.f === 'status') { persist(); }
  });
  function fieldChange(ev) {
    var t = ev.target, p = S.items[S.cur]; if (!p) return;
    if (t.dataset.f) {
      var f = t.dataset.f, v = t.type === 'checkbox' ? t.checked : t.value;
      if (f === 'street') { p.address = v + ', ' + cityHe(p); }
      else if (f === 'published') { if (v) delete p.published; else p.published = false; }
      else if (f === 'sold') p.sold = v;
      else if (f === 'city') { var st = street(p); p.city = v; p.cityHe = S.cities[v]; p.address = st + ', ' + p.cityHe; }
      else p[f] = v;
      if (f === 'name') $('h1', app).textContent = v || 'פרויקט חדש';
      persist();
    } else if (t.dataset.img) { p.images[+t.dataset.i][t.dataset.img] = t.value; persist(); }
  }
  var dropEl = null;
  document.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('is-over'); } });
  document.addEventListener('dragleave', function (e) { var d = e.target.closest && e.target.closest('#drop'); if (d) d.classList.remove('is-over'); });
  document.addEventListener('drop', function (e) { var d = e.target.closest && e.target.closest('#drop'); if (d) { e.preventDefault(); addImages(e.dataTransfer.files); } });

  /* ---------- images ---------- */
  function compress(file, max, q) {
    return createImageBitmap(file).then(function (bm) {
      var r = Math.min(1, max / Math.max(bm.width, bm.height)), w = Math.round(bm.width * r), h = Math.round(bm.height * r);
      var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(bm, 0, 0, w, h);
      return new Promise(function (res) { c.toBlob(function (b) { res(b); }, 'image/jpeg', q); });
    });
  }
  function addImages(list) {
    var p = S.items[S.cur]; var files = Array.prototype.slice.call(list || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    toast('מעבדים ' + files.length + ' תמונות…');
    var n = 0;
    files.reduce(function (pr, f) {
      return pr.then(function () { return compress(f, 1920, 0.82); }).then(function (b) { return b.size > 900 * 1024 ? compress(f, 1600, 0.7) : b; }).then(function (b) {
        var path = 'img/p/' + p.slug + '/u' + Date.now().toString(36) + (n++) + '.jpg';
        S.files[path] = { blob: b, url: URL.createObjectURL(b) };
        p.images = p.images || []; p.images.push({ src: path, alt: p.name ? 'הדמיית ' + p.name : '', kind: 'render' });
        if (!p.cover) p.cover = path;
      });
    }, Promise.resolve()).then(function () { persist(); render(); toast('התמונות נוספו'); }).catch(function () { toast('לא הצלחנו לעבד אחת התמונות'); });
  }
  function addIcon(slug, f) {
    if (!f) return;
    if (f.type !== 'image/png') return toast('יש להעלות קובץ PNG');
    var path = 'img/fig/' + slug + '.png';
    S.files[path] = { blob: f, url: URL.createObjectURL(f) }; persist(); iconBadge(); render(); toast('האייקון נוסף');
  }

  /* ---------- project create / delete ---------- */
  function modal(html, wide) { var m = $('#modal'), b = $('#modal-box'); b.className = 'modal__box' + (wide ? ' is-wide' : ''); b.innerHTML = html; m.hidden = false; var f = $('input,select,button', b); if (f) f.focus(); }
  function closeModal() { $('#modal').hidden = true; $('#modal-box').innerHTML = ''; }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  function newProject() {
    modal('<h2>פרויקט חדש</h2><div class="form">' +
      field('שם הפרויקט', '<input type="text" id="n-name" placeholder="למשל: בלינסון 51">') +
      field('סטטוס', '<select id="n-status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '">' + STATUS[k] + '</option>'; }).join('') + '</select>') +
      field('עיר', '<select id="n-city">' + Object.keys(S.cities).map(function (k) { return '<option value="' + esc(k) + '">' + esc(S.cities[k]) + '</option>'; }).join('') + '</select>') +
      field('רחוב ומספר', '<input type="text" id="n-street">') +
      field('כתובת באנגלית (slug)', '<input type="text" dir="ltr" id="n-slug">', true, 'אותיות לטיניות, מספרים ומקפים. נקבע פעם אחת ולא משתנה.') +
      '</div><p class="err" id="n-err"></p><div class="modal__foot"><button class="btn btn--ghost" data-close>ביטול</button><button class="btn" id="n-ok">יצירה</button></div>');
    var nm = $('#n-name'), sl = $('#n-slug'), manual = false;
    sl.addEventListener('input', function () { manual = true; });
    nm.addEventListener('input', function () { if (!manual) sl.value = slugify(nm.value); $('#n-street').value = $('#n-street').dataset.t ? $('#n-street').value : nm.value; });
    $('#n-street').addEventListener('input', function () { this.dataset.t = 1; });
    $('#n-ok').addEventListener('click', function () {
      var name = nm.value.trim(), slug = sl.value.trim(), err = $('#n-err');
      if (!name) return err.textContent = 'יש להזין שם';
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return err.textContent = 'ה-slug חייב להיות באותיות לטיניות קטנות, מספרים ומקפים';
      if (S.items.some(function (p) { return p.slug === slug; })) return err.textContent = 'כבר קיים פרויקט עם ה-slug הזה';
      var city = $('#n-city').value;
      S.items.unshift({ slug: slug, name: name, status: $('#n-status').value, city: city, cityHe: S.cities[city], address: ($('#n-street').value.trim() || name) + ', ' + S.cities[city], lat: null, lng: null, coordAccuracy: 'street', desc: '', sold: false, cover: '', images: [] });
      S.cur = 0; S.view = 'edit'; S.tab = 'images'; closeModal(); persist(); render(); toast('הפרויקט נוצר. הוסיפו תמונות ומיקום');
    });
  }
  function delProject() {
    var p = S.items[S.cur];
    modal('<h2>מחיקת "' + esc(p.name) + '"</h2><p>אפשר להסתיר את הפרויקט במקום למחוק: הוא יישאר במערכת ולא יוצג באתר. מחיקה מוחקת אותו מרשימת הנכסים (קבצי התמונות נשארים באתר).</p><div class="modal__foot"><button class="btn btn--ghost" data-close>ביטול</button><button class="btn btn--ghost" id="d-hide">הסתרה</button><button class="btn btn--danger" id="d-del">מחיקה</button></div>');
    $('#d-hide').onclick = function () { p.published = false; persist(); closeModal(); S.view = 'list'; render(); toast('הפרויקט הוסתר'); };
    $('#d-del').onclick = function () { S.items.splice(S.cur, 1); persist(); closeModal(); S.view = 'list'; render(); toast('הפרויקט נמחק'); };
  }

  function geocode(p) {
    var q = street(p) + ', ' + cityHe(p) + ', ישראל';
    toast('מחפשים…');
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=he&viewbox=' + [BOX[1], BOX[2], BOX[3], BOX[0]].join(',') + '&bounded=1&q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); }).then(function (d) {
        if (!d.length) return toast('הכתובת לא נמצאה. לחצו על המפה למיקום ידני');
        var a = +d[0].lat, b = +d[0].lon; map.setView([a, b], 18); map._set(a, b); p.coordAccuracy = 'street'; $('[data-f=coordAccuracy]').value = 'street'; toast('נמצא. אפשר לגרור את הסמן לתיקון');
      }).catch(function () { toast('החיפוש נכשל. לחצו על המפה למיקום ידני'); });
  }

  /* ---------- preview ---------- */
  function walkUrls(o) {
    if (typeof o === 'string') return S.files[o] ? S.files[o].url : o;
    if (Array.isArray(o)) return o.map(walkUrls);
    if (o && typeof o === 'object') { var r = {}; Object.keys(o).forEach(function (k) { r[k] = walkUrls(o[k]); }); return r; }
    return o;
  }
  function setDrafts() {
    window.__tzDraftProjects = draftForPreview();
    window.__tzDraftContent = walkUrls(clone(S.content));
    window.__tzDraftTours = walkUrls(toursCur());
  }
  function previewPages(list, idx) {
    setDrafts(); idx = idx || 0;
    modal('<div class="bar"><h2 style="margin:0">תצוגה מקדימה (כך זה ייראה באתר)</h2><div class="filters">' + list.map(function (x, i) { return '<button class="chip' + (i === idx ? ' is-on' : '') + '" data-pvi="' + i + '">' + esc(x[0]) + '</button>'; }).join('') + '<button class="btn btn--ghost btn--sm" data-close>סגירה</button></div></div><iframe src="' + BASE + list[idx][1] + '" title="תצוגה מקדימה"></iframe>', true);
    $$('[data-pvi]').forEach(function (b) { b.onclick = function () { previewPages(list, +b.dataset.pvi); }; });
  }
  function draftForPreview() {
    return finalItems().map(function (p) { if (S.files[p.cover]) p.cover = S.files[p.cover].url; (p.images || []).forEach(function (i) { if (S.files[i.src]) i.src = S.files[i.src].url; }); return p; });
  }
  function preview(page) {
    setDrafts();
    var p = S.items[S.cur];
    var pages = { project: BASE + 'project.html?p=' + (p ? p.slug : '') + '&draft=1', list: BASE + 'projects.html?draft=1', home: BASE + 'home.html?noloader=1&draft=1' };
    page = page || (p ? 'project' : 'list');
    modal('<div class="bar"><h2 style="margin:0">תצוגה מקדימה (כך זה ייראה באתר)</h2><div class="filters">' +
      (p ? '<button class="chip' + (page === 'project' ? ' is-on' : '') + '" data-pv="project">עמוד הפרויקט</button>' : '') +
      '<button class="chip' + (page === 'list' ? ' is-on' : '') + '" data-pv="list">רשימת פרויקטים</button><button class="chip' + (page === 'home' ? ' is-on' : '') + '" data-pv="home">דף הבית</button><button class="btn btn--ghost btn--sm" data-close>סגירה</button></div></div><iframe src="' + pages[page] + '" title="תצוגה מקדימה"></iframe>', true);
    $$('[data-pv]').forEach(function (b) { b.onclick = function () { preview(b.dataset.pv); }; });
  }

  /* ---------- export (ZIP, store only) ---------- */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(entries) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0, d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    entries.forEach(function (e) {
      var name = enc.encode(e.name), data = e.data, crc = crc32(data), lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      cen.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    });
    var cs = cen.reduce(function (s, x) { return s + x.length; }, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, cs, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }
  function checkAll() {
    var bad = [];
    S.items.forEach(function (p) { var e = validate(p).filter(function (x) { return !/תיאור/.test(x); }); if (e.length) bad.push('<strong>' + esc(p.name) + '</strong>: ' + e.map(esc).join(', ')); });
    (S.content.articles || []).forEach(function (a) { var e = []; if (!(a.title || '').trim()) e.push('חסרה כותרת'); if (!(a.excerpt || '').trim()) e.push('חסר תקציר'); if (!a.cover) e.push('חסרה תמונת שער'); if (e.length) bad.push('<strong>מאמר ' + esc(a.title || a.id) + '</strong>: ' + e.join(', ')); });
    var pm = S.content.promo; if (pm && pm.enabled !== false && (!pm.video || !pm.title)) bad.push('<strong>סרטון פרומו</strong>: חסר סרטון או כותרת');
    var ct = S.content.contact || {}; [['mainPhone', 'טלפון ראשי'], ['officePhone', 'טלפון משרד'], ['mobile', 'נייד']].forEach(function (f) { if (ct[f[0]] && String(ct[f[0]]).replace(/\D/g, '').length < 9) bad.push('<strong>פרטי קשר</strong>: ' + f[1] + ' לא תקין'); });
    return bad;
  }
  function summary() {
    var c = changes(), li = [];
    if (c.added.length) li.push('נוספו: ' + c.added.map(esc).join(', '));
    if (c.changed.length) li.push('עודכנו: ' + c.changed.map(esc).join(', '));
    if (c.removed.length) li.push('נמחקו: ' + c.removed.map(esc).join(', '));
    if (c.reordered) li.push('שונה סדר הפרויקטים');
    if (c.mods.length) li.push('עודכן תוכן: ' + c.mods.map(esc).join(', '));
    if (c.tours.length) li.push('עודכנו סיורים: ' + c.tours.map(function (k) { return esc((S.tours[k].cur.title) || k); }).join(', '));
    if (c.imgs) li.push('תמונות חדשות: ' + c.imgs);
    if (c.icons) li.push('אייקונים חדשים: ' + c.icons);
    return '<ul class="list">' + li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }
  $('#btn-export').addEventListener('click', function () {
    var bad = checkAll(); var enc = new TextEncoder();
    var go = function () {
      var ents = outputs().map(function (o) { return { name: o.path, data: enc.encode(o.text) }; });
      Promise.all(usedFiles().map(function (f) { return f.blob.arrayBuffer().then(function (b) { ents.push({ name: f.path, data: new Uint8Array(b) }); }); })).then(function () {
        var a = document.createElement('a'); a.href = URL.createObjectURL(zip(ents)); a.download = 'tzeelim-update-' + new Date().toISOString().slice(0, 10) + '.zip'; a.click(); closeModal(); toast('הורדה החלה. הקבצים בתוך ה-ZIP שומרים על מבנה התיקיות של האתר');
      });
    };
    modal('<h2>הורדת קובץ עדכון</h2>' + summary() + (bad.length ? '<div class="note"><strong>שימו לב, חסר בפרויקטים:</strong><ul class="list"><li>' + bad.join('</li><li>') + '</li></ul></div>' : '') + '<p class="muted">ה-ZIP מכיל את קובץ הנתונים והתמונות החדשות. את התוכן מעתיקים לתיקיית האתר.</p><div class="modal__foot"><button class="btn btn--ghost" data-close>ביטול</button><button class="btn" id="x-go">הורדה</button></div>');
    $('#x-go').onclick = go;
  });

  /* ---------- publish (GitHub Git Data API: one atomic commit) ---------- */
  function b64(buf) { var s = '', u = new Uint8Array(buf), n = 0x8000; for (var i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n)); return btoa(s); }
  $('#btn-publish').addEventListener('click', function () {
    var bad = checkAll(), tok = '';
    try { tok = sessionStorage.getItem('tzGh') || ''; } catch (e) {}
    modal('<h2>פרסום באתר</h2>' + summary() + (bad.length ? '<div class="note"><strong>לא ניתן לפרסם עד שמתקנים:</strong><ul class="list"><li>' + bad.join('</li><li>') + '</li></ul></div>' : '') +
      '<div class="form"><div class="field field--wide"><label>מפתח גישה של GitHub (נשמר רק עד סגירת הדפדפן)</label><input type="password" dir="ltr" id="p-tok" value="' + esc(tok) + '" autocomplete="off"><small>מפתח fine-grained עם הרשאת Contents (קריאה וכתיבה) לריפו ' + REPO.owner + '/' + REPO.repo + ' בלבד. מגדירים אותו פעם אחת עם המפתח שלכם.</small></div></div>' +
      '<p class="muted">הפרסום יוצר עדכון אחד באתר. העדכון מופיע תוך דקה-שתיים.</p><p class="err" id="p-err"></p><div class="modal__foot"><button class="btn btn--ghost" data-close>ביטול</button><button class="btn" id="p-go"' + (bad.length ? ' disabled' : '') + '>פרסום עכשיו</button></div>');
    $('#p-go').onclick = function () {
      var t = $('#p-tok').value.trim(), err = $('#p-err'), btn = this;
      if (!t) return err.textContent = 'יש להזין מפתח גישה';
      try { sessionStorage.setItem('tzGh', t); } catch (e) {}
      btn.disabled = true; err.textContent = 'מפרסמים…';
      publish(t).then(function (sha) {
        markPublished(); idbDel('draft'); NOCACHE = Date.now();
        modal('<h2>פורסם</h2><p>העדכון נשלח (' + esc(sha.slice(0, 7)) + '). האתר יתעדכן תוך דקה-שתיים.</p><div class="modal__foot"><button class="btn" data-close>סגירה</button></div>'); render(); updateDirty();
      }).catch(function (e) { btn.disabled = false; err.textContent = 'הפרסום נכשל: ' + e.message; });
    };
  });
  function gh(tok, path, method, body) {
    return fetch('https://api.github.com/repos/' + REPO.owner + '/' + REPO.repo + path, { method: method || 'GET', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'המפתח לא תקין או חסר הרשאה' : (j.message || r.status)); return j; }); });
  }
  function publish(tok) {
    var enc = new TextEncoder(), tree = [], files = usedFiles(), head, baseTree;
    return gh(tok, '/git/ref/heads/' + REPO.branch).then(function (r) { head = r.object.sha; return gh(tok, '/git/commits/' + head); })
      .then(function (c) { baseTree = c.tree.sha; return outputs().reduce(function (pr, o) { return pr.then(function () { return gh(tok, '/git/blobs', 'POST', { content: o.text, encoding: 'utf-8' }); }).then(function (b) { tree.push({ path: o.path, mode: '100644', type: 'blob', sha: b.sha }); }); }, Promise.resolve()); })
      .then(function () { return files.reduce(function (pr, f) { return pr.then(function () { return f.blob.arrayBuffer(); }).then(function (buf) { return gh(tok, '/git/blobs', 'POST', { content: b64(buf), encoding: 'base64' }); }).then(function (bb) { tree.push({ path: f.path, mode: '100644', type: 'blob', sha: bb.sha }); }); }, Promise.resolve()); })
      .then(function () { return gh(tok, '/git/trees', 'POST', { base_tree: baseTree, tree: tree }); })
      .then(function (t) { return gh(tok, '/git/commits', 'POST', { message: 'Admin: update projects (' + changes().total + ' changes)', tree: t.sha, parents: [head] }); })
      .then(function (c) { return gh(tok, '/git/refs/heads/' + REPO.branch, 'PATCH', { sha: c.sha }).then(function () { return c.sha; }); });
  }

  /* ---------- top nav ---------- */
  $('.top__nav').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) { S.view = b.dataset.view; window.scrollTo(0, 0); render(); } });
  window.addEventListener('beforeunload', function (e) { if (S.ready && changes().total) { e.preventDefault(); e.returnValue = ''; } });

  window.TZA = { S: S, esc: esc, $: $, $$: $$, clone: clone, toast: toast, modal: modal, closeModal: closeModal, persist: persist, src: src, app: app, render: render, field: field, compress: compress, views: VIEWS, previewPages: previewPages, slugify: slugify, STATUS: STATUS, BASE: BASE };
  window.dispatchEvent(new Event('tza-ready'));
  idbOpen().then(load);
})();
