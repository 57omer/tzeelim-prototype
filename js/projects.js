/* Projects pages: projects.html (list) + project.html (single). Uses window.TZ, PROJECTS, CONTENT. */
(function () {
  'use strict';
  var TZ = window.TZ, P = window.PROJECTS || [], C = window.CONTENT || {};
  var esc = TZ.esc;
  var page = document.body.getAttribute('data-page');
  var SUFFIX = ' | צאלים קבלני בניין';
  var STATUSES = ['marketing', 'construction', 'occupied'];

  function setMeta(title, desc) {
    document.title = title + SUFFIX;
    var m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute('content', desc);
  }

  /* ================= LIST ================= */
  function initList() {
    var sec = C.sections || {};
    var tabsEl = document.getElementById('pj-tabs');
    var grid = document.getElementById('pj-grid');
    var empty = document.getElementById('pj-empty');
    var titleEl = document.getElementById('pj-title');
    var introEl = document.getElementById('pj-intro');
    var panel = document.getElementById('pj-panel');
    var def = [
      { key: 'all', label: 'הכל' },
      { key: 'marketing', label: 'בשיווק' },
      { key: 'construction', label: 'בבנייה' },
      { key: 'occupied', label: 'מאוכלסים' }
    ];
    function list(key) { return key === 'all' ? P.slice() : P.filter(function (p) { return p.status === key; }); }
    function valid(k) { return k === 'all' || STATUSES.indexOf(k) > -1; }
    var current = TZ.qs('status'); if (!valid(current)) current = 'all';

    tabsEl.innerHTML = def.map(function (t) {
      return '<button class="tab" type="button" role="tab" id="pj-tab-' + t.key + '" data-key="' + t.key + '" aria-controls="pj-panel" aria-selected="false" tabindex="-1">' +
        esc(t.label) + ' <span class="tab__count" aria-label="' + list(t.key).length + ' פרויקטים">' + list(t.key).length + '</span></button>';
    }).join('');
    var tabs = [].slice.call(tabsEl.querySelectorAll('.tab'));

    function render(key, opts) {
      opts = opts || {};
      current = key;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-key') === key;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', 'pj-tab-' + key);
      var items = list(key);
      var s = key === 'all' ? null : sec[key];
      var heading = s ? s.title : 'הפרויקטים שלנו';
      titleEl.textContent = heading;
      introEl.textContent = s ? s.intro : (sec.projectsGeneral || '');
      setMeta(heading, s ? s.intro : sec.projectsGeneral);
      grid.innerHTML = items.map(function (p, i) { return TZ.projectCard(p, i); }).join('');
      empty.hidden = items.length > 0;
      grid.hidden = items.length === 0;
      TZ.initReveal();
      if (opts.url) {
        try {
          var u = 'projects.html' + (key === 'all' ? '' : '?status=' + key);
          history.replaceState(null, '', u);
        } catch (e) { /* file:// or sandbox */ }
      }
    }

    tabs.forEach(function (t, idx) {
      t.addEventListener('click', function () { render(t.getAttribute('data-key'), { url: true }); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        /* RTL: ArrowLeft = next, ArrowRight = previous */
        if (e.key === 'ArrowLeft') n = tabs[(idx + 1) % tabs.length];
        else if (e.key === 'ArrowRight') n = tabs[(idx - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); n.focus(); render(n.getAttribute('data-key'), { url: true }); }
      });
    });
    var all = document.querySelector('[data-pj-all]');
    if (all) all.addEventListener('click', function () { render('all', { url: true }); tabs[0].focus(); });
    render(current);
  }

  /* ================= SINGLE ================= */
  function lines(txt) {
    return String(txt || '').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function hasRender(p) {
    return (p.images || []).some(function (i) { return i.kind === 'render'; });
  }

  function notFound(root) {
    document.body.removeAttribute('data-header');
    setMeta('הפרויקט לא נמצא');
    root.innerHTML =
      '<section class="page-head pj-nf"><div class="container">' +
      '<ol class="breadcrumb"><li><a href="home.html">ראשי</a></li><li><a href="projects.html">פרויקטים</a></li><li>לא נמצא</li></ol>' +
      '<h1>הפרויקט לא נמצא</h1>' +
      '<p class="lead">ייתכן שהקישור שגוי או שהפרויקט הוסר. אפשר לעבור לרשימת הפרויקטים ולבחור משם.</p>' +
      '<div class="cluster"><a class="btn" href="projects.html">לכל הפרויקטים ' + TZ.icon('arrow-next', 'icon--arrow') + '</a>' +
      '<a class="btn btn--ghost" href="projects.html?status=marketing">פרויקטים בשיווק</a>' +
      '<a class="btn btn--ghost" href="contact.html">צור קשר</a></div>' +
      '<div class="pj-nf-list grid grid--3">' +
      P.filter(function (x) { return x.status !== 'occupied'; }).slice(0, 3).map(function (x, i) { return TZ.projectCard(x, i); }).join('') +
      '</div></div></section>';
  }

  function detailRows(p) {
    var empty = '<div class="kv__v kv__v--empty">יעודכן</div>';
    function row(k, v) {
      return '<div class="kv__row"><div class="kv__k">' + esc(k) + '</div>' + (v ? '<div class="kv__v">' + esc(v) + '</div>' : empty) + '</div>';
    }
    return '<div class="kv">' +
      row('כתובת', p.address) + row('עיר', p.cityHe || TZ.cityLabel(p.city)) + row('סטטוס', p.statusHe || TZ.statusLabel(p.status)) +
      row('מספר דירות', '') + row('קומות', '') + row('סוגי דירות', '') + (p.status === 'occupied' ? row('מועד אכלוס', '') : row('מועד אכלוס משוער', '') + row('מחיר', '')) +
      '</div>';
  }

  function descBlock(p) {
    var ls = lines(p.desc);
    if (ls.length) return '<div class="pd-desc">' + ls.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>';
    return '<div class="placeholder pd-desc-empty"><span class="placeholder__tag">מציין מקום</span><p>כאן יופיע תיאור חופשי של הפרויקט, שיוזן בעתיד דרך ממשק הניהול.</p></div>';
  }

  var KIND = { render: 'הדמיה', plan: 'תוכנית', photo: 'צילום' };
  function gallery(p) {
    var ord = { render: 0, photo: 1, plan: 2 };
    var imgs = (p.images || []).filter(function (i) { return i.kind !== 'placeholder'; }).map(function (i, n) { return { i: i, n: n }; })
      .sort(function (a, b) { return ((ord[a.i.kind] || 0) - (ord[b.i.kind] || 0)) || (a.n - b.n); }).map(function (x) { return x.i; });
    if (!imgs.length) {
      return '<div class="placeholder pgal-empty"><span class="placeholder__tag">מציין מקום</span><p>תמונות נוספות יתווספו לפרויקט זה.</p></div>';
    }
    return '<div class="pgal reveal" id="pj-gal" data-n="' + imgs.length + '">' + imgs.map(function (i, n) {
      var render = i.kind === 'render';
      return '<a class="gallery__item" href="' + esc(i.src) + '" data-lightbox data-kind="' + esc(i.kind || '') + '" data-alt="' + esc(i.alt) + '">' +
        '<img src="' + esc(i.src) + '" alt="' + esc(i.alt) + '"' + (n > 2 ? ' loading="lazy"' : '') + '>' +
        (KIND[i.kind] && i.kind !== 'photo' ? '<span class="pgal__tag">' + KIND[i.kind] + '</span>' : '') + '</a>';
    }).join('') + '</div>';
  }

  function leadSection(p) {
    var wa = (TZ.config && TZ.config.whatsapp) || 'https://wa.me/972528587821';
    var msg = encodeURIComponent('שלום, אשמח לפרטים על הפרויקט ' + p.name);
    var waHref = wa + (wa.indexOf('?') > -1 ? '&' : '?') + 'text=' + msg;
    return '<section class="section section--dark" id="pj-lead"><div class="container cta">' +
      '<div class="reveal"><span class="eyebrow">מתעניינים</span>' +
      '<h2 class="cta__title">רוצים לשמוע עוד על הפרויקט?</h2>' +
      '<p class="cta__text">השאירו פרטים ונחזור אליכם בהקדם, או פנו אלינו ישירות.</p>' +
      '<div class="pj-cta-actions">' +
      '<a class="btn btn--light" href="tel:0528587821">' + TZ.icon('phone') + ' <bdi dir="ltr">052-8587821</bdi></a>' +
      '<a class="btn btn--light" href="' + esc(waHref) + '" target="_blank" rel="noopener">' + TZ.icon('whatsapp') + ' וואטסאפ</a>' +
      '</div></div>' +
      '<form class="form reveal" data-tz-form novalidate>' +
      '<input type="hidden" name="project" value="' + esc(p.name) + '">' +
      '<div class="form__row form__row--2">' +
      '<div class="field"><label for="pf-name">שם מלא</label><input id="pf-name" name="name" autocomplete="name"></div>' +
      '<div class="field"><label for="pf-phone">טלפון</label><input id="pf-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right"></div></div>' +
      '<div class="field"><label for="pf-email">אימייל <span class="field__opt">(לא חובה)</span></label><input id="pf-email" name="email" type="email" autocomplete="email" dir="ltr" style="text-align:right"></div>' +
      '<div class="field"><label for="pf-msg">הודעה <span class="field__opt">(לא חובה)</span></label><textarea id="pf-msg" name="message" rows="3"></textarea></div>' +
      '<div class="consent"><input type="checkbox" id="pf-c" name="consent"><label for="pf-c">אני מאשר/ת יצירת קשר חוזר. <a href="legal.html?doc=privacy">מדיניות פרטיות</a></label></div>' +
      '<button class="btn" type="submit">שליחת פרטים</button>' +
      '<p class="form__note">זהו אבטיפוס: הפרטים אינם נשלחים בפועל.</p>' +
      '</form></div></section>';
  }

  function initSingle() {
    var root = document.getElementById('pj-root');
    var slug = TZ.qs('p');
    var p = slug ? TZ.bySlug(slug) : null;
    if (!p) { notFound(root); return; }

    var active = p.status !== 'occupied';
    var first = (p.images || []).filter(function (i) { return i.kind !== 'placeholder'; })[0];
    var coverAlt = (first && first.alt) || ('פרויקט ' + p.name);
    var place = p.address || ((p.cityHe || '') );
    var desc = lines(p.desc)[0] || ('פרויקט ' + p.name + ' של צאלים קבלני בניין, ' + (p.cityHe || ''));
    setMeta(p.name + ' · ' + (p.cityHe || ''), desc);
    document.body.setAttribute('data-header', 'over');

    var html = '';
    /* hero */
    html += '<section class="phero theme-dark" aria-label="' + esc(p.name) + '">' +
      '<img class="phero__img" src="' + esc(p.cover) + '" alt="' + esc(coverAlt) + '" fetchpriority="high">' +
      '<div class="phero__shade"></div>' +
      '<div class="container phero__inner">' +
      '<ol class="breadcrumb"><li><a href="home.html">ראשי</a></li><li><a href="projects.html' + (p.status ? '?status=' + esc(p.status) : '') + '">' + esc(TZ.statusLabel(p.status) === 'מאוכלס' ? 'מאוכלסים' : TZ.statusLabel(p.status) === 'בשיווק' ? 'פרויקטים בשיווק' : 'פרויקטים בבנייה') + '</a></li><li aria-current="page">' + esc(p.name) + '</li></ol>' +
      '<div class="phero__badges"><span class="badge badge--' + esc(p.status) + '">' + esc(p.statusHe || TZ.statusLabel(p.status)) + '</span>' +
      (p.sold ? '<span class="badge badge--sold">נמכר</span>' : '') + '</div>' +
      '<h1 class="phero__title">' + esc(p.name) + '</h1>' +
      '<p class="phero__place">' + TZ.icon('pin') + '<span>' + esc(place) + '</span></p>' +
      (active ? '<div class="phero__actions"><a class="btn" href="#pj-lead">השאר פרטים</a><a class="btn btn--light" href="tel:0528587821">' + TZ.icon('phone') + ' <bdi dir="ltr">052-8587821</bdi></a></div>' : '') +
      '</div>' +
      (hasRender(p) ? '<span class="media__note">הדמיה להמחשה בלבד</span>' : '') +
      '</section>';

    /* details + description */
    html += '<section class="section"><div class="container pd-split">' +
      '<div class="pd-block reveal"><span class="eyebrow">פרטי הפרויקט</span><h2 class="pd-block__title">פרטי הפרויקט</h2>' +
      detailRows(p) +
      '<p class="pd-hint"><span class="placeholder__tag">מציין מקום</span><span>שדות ללא נתון יתעדכנו בממשק הניהול</span></p></div>' +
      '<div class="pd-block reveal" style="--i:1"><span class="eyebrow">על הפרויקט</span>' + descBlock(p) + '</div>' +
      '</div></section>';

    /* gallery */
    html += '<section class="section section--surface"><div class="container">' +
      '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">גלריה</span><h2 class="section-title">גלריית הפרויקט</h2></div></div>' +
      gallery(p) +
      (hasRender(p) ? '<p class="render-note pj-gal-foot">הדמיה להמחשה בלבד</p>' : '') +
      '</div></section>';

    if (active) {
      /* video slot */
      html += '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">סרטון / הדמיה</span><h2 class="section-title">הפרויקט בתנועה</h2></div></div>' +
        '<div class="vslot reveal" role="img" aria-label="מקום שמור לסרטון הדמיה, יתווסף בהמשך"><span class="placeholder__tag vslot__tag">מציין מקום</span>' +
        '<div><div class="vslot__play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg></div>' +
        '<p class="vslot__text">סרטון הדמיה יתווסף לפרויקט זה</p><p class="vslot__sub">הדמיה להמחשה בלבד</p></div></div>' +
        '</div></section>';

      /* map */
      html += '<section class="section section--surface"><div class="container ploc">' +
        '<div class="reveal"><span class="eyebrow">מיקום</span><h2 class="section-title">איפה זה</h2><p class="ploc__addr mt-5">' + esc(p.address) + '</p>' +
        (p.coordAccuracy && p.coordAccuracy !== 'exact' ? '<p class="small muted mt-3">המיקום על המפה מקורב לפי הכתובת.</p>' : '') + '</div>' +
        '<div class="reveal" style="--i:1"><div id="pj-map" role="region" aria-label="מפה: מיקום ' + esc(p.name) + '"></div></div>' +
        '</div></section>';

      html += leadSection(p);

      /* more */
      var more = P.filter(function (x) { return x.status !== 'occupied' && x.slug !== p.slug; }).slice(0, 3);
      if (more.length) {
        html += '<section class="section"><div class="container">' +
          '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">עוד מאיתנו</span><h2 class="section-title">פרויקטים נוספים</h2></div>' +
          '<a class="link-arrow" href="projects.html">לכל הפרויקטים ' + TZ.icon('arrow-next', 'icon--arrow') + '</a></div>' +
          '<div class="grid grid--3 pj-more-grid">' + more.map(function (x, i) { return TZ.projectCard(x, i); }).join('') + '</div>' +
          '<p class="render-note mt-6">הדמיה להמחשה בלבד</p></div></section>';
      }
    } else {
      html += '<section class="section"><div class="container pj-quiet reveal">' +
        '<span class="eyebrow">פרויקט חדש</span><h2 class="section-title">מתעניינים בפרויקט חדש?</h2>' +
        '<p class="lead">הפרויקט הושלם ומאוכלס. נשמח לספר לכם על הפרויקטים שלנו שנמצאים כעת בשיווק.</p>' +
        '<div class="cluster"><a class="btn" href="contact.html">צור קשר ' + TZ.icon('arrow-next', 'icon--arrow') + '</a>' +
        '<a class="btn btn--ghost" href="projects.html?status=marketing">לפרויקטים בשיווק</a></div></div></section>';
    }

    root.innerHTML = html;
    TZ.initLightbox('#pj-gal');
    if (active) {
      var m = document.getElementById('pj-map');
      if (m) TZ.initMap(m, [p], { popup: false, fit: true });
    }
  }

  if (page === 'projects') initList();
  else if (page === 'project') initSingle();
})();
