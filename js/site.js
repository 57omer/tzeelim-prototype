/* Tzeelim prototype — shared behaviour. Exposes window.TZ. No storage, no network for data. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var CFG = {
    name: 'צאלים קבלני בניין',
    slogan: 'יש על מי לסמוך',
    tagline: 'קבלני בניין בקריות, מאז 1991',
    phoneMain: { tel: '0528587821', label: '052-8587821' },
    office: { tel: '048722475', label: '04-8722475' },
    fax: '04-8578886',
    mobile: { tel: '0505381557', label: '050-5381557' },
    address: 'בן צבי 61, קרית חיים',
    whatsapp: 'https://wa.me/972528587821',
    facebook: 'https://www.facebook.com/tzeelim/',
    logo: 'img/brand/logo.png'
  };

  var STATUS = { marketing: 'בשיווק', construction: 'בבנייה', occupied: 'מאוכלס' };
  var CITY = { 'kiryat-haim': 'קרית חיים', 'kiryat-motzkin': 'קרית מוצקין' };

  var NAV = [
    { key: 'home', label: 'ראשי', href: 'home.html' },
    { key: 'marketing', label: 'פרויקטים בשיווק', href: 'projects.html?status=marketing' },
    { key: 'construction', label: 'פרויקטים בבנייה', href: 'projects.html?status=construction' },
    { key: 'occupied', label: 'מאוכלסים', href: 'projects.html?status=occupied' },
    { key: 'articles', label: 'מאמרים', href: 'articles.html' },
    { key: 'about', label: 'אודות', href: 'about.html' },
    { key: 'contact', label: 'צור קשר', href: 'contact.html' }
  ];

  var LEGAL = [
    { label: 'מדיניות פרטיות', href: 'legal.html?doc=privacy' },
    { label: 'תנאי שימוש', href: 'legal.html?doc=terms' },
    { label: 'הצהרת נגישות', href: 'legal.html?doc=accessibility' }
  ];

  /* ---------- helpers ---------- */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function qs(name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  }
  function projects() { return Array.isArray(window.PROJECTS) ? window.PROJECTS : []; }
  function statusLabel(s) { return STATUS[s] || ''; }
  function cityLabel(c) { return CITY[c] || ''; }
  function byStatus(s) { return projects().filter(function (p) { return p.status === s; }); }
  function bySlug(slug) {
    var l = projects();
    for (var i = 0; i < l.length; i++) { if (l[i].slug === slug) return l[i]; }
    return null;
  }

  var ICONS = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    whatsapp: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9 9.2c0 3 2.8 5.8 5.8 5.8l1.2-1.3-1.9-1-.9.7a3.5 3.5 0 0 1-1.9-1.9l.7-.9-1-1.9L9 9.2z"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    'arrow-next': '<path d="M19 12H5M11 5l-7 7 7 7"/>',
    'arrow-prev': '<path d="M5 12h14M13 5l7 7-7 7"/>',
    'chevron-next': '<path d="M15 5l-7 7 7 7"/>',
    'chevron-prev': '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon icon--' + esc(name) + (cls ? ' ' + esc(cls) : '') + '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }
  function tel(o) { return '<a href="tel:' + o.tel + '"><bdi dir="ltr">' + o.label + '</bdi></a>'; }

  /* ---------- header / menu ---------- */
  var menuEl = null;
  var headerEl = null;
  var toggleEl = null;
  var lastFocus = null;

  function navLinkHtml(n, active, cls) {
    return '<a class="' + cls + '" href="' + n.href + '"' + (n.key === active ? ' aria-current="page"' : '') + '>' + esc(n.label) + '</a>';
  }

  function renderHeader(activeKey) {
    var el = doc.getElementById('site-header');
    if (!el) return;
    headerEl = el;
    el.classList.add('site-header');
    var items = NAV.map(function (n) { return '<li>' + navLinkHtml(n, activeKey, 'nav__link') + '</li>'; }).join('');
    el.innerHTML =
      '<div class="site-header__inner">' +
        '<a class="logo" href="home.html" aria-label="' + esc(CFG.name) + ' — לדף הבית"><img src="' + CFG.logo + '" alt="' + esc(CFG.name) + '" width="142" height="50"></a>' +
        '<nav class="nav" aria-label="ניווט ראשי"><ul class="nav__list">' + items + '</ul></nav>' +
        '<div class="site-header__actions">' +
          '<a class="btn btn--sm site-header__phone" href="tel:' + CFG.phoneMain.tel + '">' + icon('phone') + '<bdi dir="ltr">' + CFG.phoneMain.label + '</bdi></a>' +
          '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="tz-menu" aria-label="פתיחת תפריט"><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span></button>' +
        '</div>' +
      '</div>';
    toggleEl = $('.nav-toggle', el);

    var old = doc.getElementById('tz-menu');
    if (old) old.parentNode.removeChild(old);
    var m = doc.createElement('div');
    m.className = 'menu';
    m.id = 'tz-menu';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'תפריט ראשי');
    m.setAttribute('aria-hidden', 'true');
    m.innerHTML =
      '<nav aria-label="תפריט נייד"><ul class="menu__list">' +
        NAV.map(function (n, i) {
          return '<li style="--i:' + i + '">' + '<a class="menu__link" style="--i:' + i + '" href="' + n.href + '"' + (n.key === activeKey ? ' aria-current="page"' : '') + '><span>' + esc(n.label) + '</span>' + icon('arrow-next') + '</a></li>';
        }).join('') +
      '</ul></nav>' +
      '<div class="menu__foot">' +
        '<a class="btn" href="tel:' + CFG.phoneMain.tel + '">' + icon('phone') + 'התקשרו <bdi dir="ltr">' + CFG.phoneMain.label + '</bdi></a>' +
        '<a class="btn btn--light" href="' + CFG.whatsapp + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'שלחו הודעה בוואטסאפ</a>' +
        '<p>' + esc(CFG.address) + '</p>' +
      '</div>';
    doc.body.appendChild(m);
    menuEl = m;
    wireMenu();
    updateScroll();
  }

  function setMenu(open) {
    if (!menuEl || !toggleEl) return;
    var isOpen = doc.body.classList.contains('menu-open');
    if (open === isOpen) return;
    doc.body.classList.toggle('menu-open', open);
    toggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleEl.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    menuEl.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      lastFocus = doc.activeElement;
      var first = $('a', menuEl);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus({ preventScroll: true });
    }
  }

  var menuWired = false;
  function wireMenu() {
    toggleEl.addEventListener('click', function () { setMenu(!doc.body.classList.contains('menu-open')); });
    $$('a', menuEl).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    if (menuWired) return;
    menuWired = true;
    doc.addEventListener('keydown', function (e) {
      if (!doc.body.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button', menuEl).concat(toggleEl ? [toggleEl] : []);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!menuEl.contains(doc.activeElement) && doc.activeElement !== toggleEl) { e.preventDefault(); first.focus(); return; }
      // order: toggle (header) then menu links
      var seq = [toggleEl].concat($$('a[href]', menuEl));
      var idx = seq.indexOf(doc.activeElement);
      if (e.shiftKey && idx <= 0) { e.preventDefault(); seq[seq.length - 1].focus(); }
      else if (!e.shiftKey && idx === seq.length - 1) { e.preventDefault(); seq[0].focus(); }
    });
    try {
      window.matchMedia('(min-width: 1080px)').addEventListener('change', function (mq) { if (mq.matches) setMenu(false); });
    } catch (e) { /* old browser */ }
  }

  var ticking = false;
  function updateScroll() {
    ticking = false;
    if (headerEl) headerEl.classList.toggle('is-scrolled', (window.pageYOffset || root.scrollTop) > 24);
    revealSweep();
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  }

  /* ---------- footer ---------- */
  function renderFooter() {
    var el = doc.getElementById('site-footer');
    if (!el) return;
    el.classList.add('site-footer');
    el.innerHTML =
      '<div class="container">' +
        '<div class="site-footer__grid">' +
          '<div class="site-footer__brand">' +
            '<a class="site-footer__logo" href="home.html" aria-label="' + esc(CFG.name) + ' — לדף הבית"><img src="' + CFG.logo + '" alt="' + esc(CFG.name) + '" width="142" height="50" loading="lazy"></a>' +
            '<p class="site-footer__slogan">' + esc(CFG.slogan) + '</p>' +
            '<p>' + esc(CFG.tagline) + '</p>' +
            '<div class="site-footer__social">' +
              '<a class="icon-btn" href="' + CFG.facebook + '" target="_blank" rel="noopener" aria-label="צאלים בפייסבוק (נפתח בחלון חדש)">' + icon('facebook') + '</a>' +
              '<a class="icon-btn" href="' + CFG.whatsapp + '" target="_blank" rel="noopener" aria-label="וואטסאפ (נפתח בחלון חדש)">' + icon('whatsapp') + '</a>' +
            '</div>' +
          '</div>' +
          '<nav aria-label="ניווט תחתון"><h2 class="site-footer__title">ניווט</h2><ul class="site-footer__list">' +
            NAV.map(function (n) { return '<li><a href="' + n.href + '">' + esc(n.label) + '</a></li>'; }).join('') +
          '</ul></nav>' +
          '<div><h2 class="site-footer__title">צור קשר</h2><ul class="site-footer__list site-footer__contact">' +
            '<li><span class="k">משרד</span>' + tel(CFG.office) + '</li>' +
            '<li><span class="k">פקס</span><bdi dir="ltr">' + CFG.fax + '</bdi></li>' +
            '<li><span class="k">נייד</span>' + tel(CFG.mobile) + '</li>' +
            '<li><span class="k">ראשי</span>' + tel(CFG.phoneMain) + '</li>' +
            '<li><span class="k">כתובת</span><span>' + esc(CFG.address) + '</span></li>' +
          '</ul></div>' +
          '<nav aria-label="מידע משפטי"><h2 class="site-footer__title">מידע</h2><ul class="site-footer__list">' +
            LEGAL.map(function (l) { return '<li><a href="' + l.href + '">' + esc(l.label) + '</a></li>'; }).join('') +
          '</ul></nav>' +
        '</div>' +
        '<div class="site-footer__bottom">' +
          '<span>© ' + new Date().getFullYear() + ' ' + esc(CFG.name) + '. כל הזכויות שמורות.</span>' +
          '<span>הדמיות להמחשה בלבד. <a href="legal.html?doc=accessibility">הצהרת נגישות</a></span>' +
        '</div>' +
      '</div>';
  }

  /* ---------- floating UI ---------- */
  function addFloating() {
    var b = doc.body;
    if (!$('.skip-link')) {
      var s = doc.createElement('a');
      s.className = 'skip-link';
      s.href = '#main';
      s.textContent = 'דלגו לתוכן הראשי';
      b.insertBefore(s, b.firstChild);
      s.addEventListener('click', function () {
        var m = doc.getElementById('main');
        if (m) { m.setAttribute('tabindex', '-1'); setTimeout(function () { m.focus({ preventScroll: false }); }, 0); }
      });
    }
    var main = $('main');
    if (main && !main.id) main.id = 'main';
    if (!$('.fab-wa')) {
      var w = doc.createElement('a');
      w.className = 'fab-wa';
      w.href = CFG.whatsapp;
      w.target = '_blank';
      w.rel = 'noopener';
      w.setAttribute('aria-label', 'שליחת הודעה בוואטסאפ (נפתח בחלון חדש)');
      w.innerHTML = icon('whatsapp');
      b.appendChild(w);
    }
    if (!$('.callbar')) {
      var c = doc.createElement('div');
      c.className = 'callbar';
      c.setAttribute('role', 'navigation');
      c.setAttribute('aria-label', 'יצירת קשר מהירה');
      c.innerHTML =
        '<a class="callbar__btn callbar__btn--call" href="tel:' + CFG.phoneMain.tel + '">' + icon('phone') + 'התקשרו</a>' +
        '<a class="callbar__btn callbar__btn--wa" href="' + CFG.whatsapp + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'וואטסאפ</a>';
      b.appendChild(c);
    }
    if (!$('.proto-chip')) {
      var p = doc.createElement('div');
      p.className = 'proto-chip';
      p.setAttribute('role', 'note');
      p.textContent = 'אבטיפוס לאישור';
      b.appendChild(p);
    }
  }

  /* ---------- project card ---------- */
  function shortText(t, max) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    var cut = t.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:\-–]+$/, '') + '…';
  }

  function projectCard(p, i) {
    if (!p) return '';
    var st = statusLabel(p.status) || p.statusHe || '';
    var city = cityLabel(p.city) || p.cityHe || '';
    var meta = city;
    var text = shortText(p.desc, 110);
    var cover = p.cover || (p.images && p.images[0] && p.images[0].src) || '';
    var delay = (typeof i === 'number') ? ' style="--i:' + (i % 6) + '"' : '';
    return '<a class="pcard reveal" href="project.html?p=' + encodeURIComponent(p.slug) + '"' + delay + '>' +
      '<div class="pcard__media">' +
        (cover ? '<img src="' + esc(cover) + '" alt="' + esc(p.name + ' — ' + city) + '" loading="lazy" onerror="this.parentNode.classList.add(\'is-empty\');this.style.display=\'none\'">' : '') +
        '<span class="pcard__badge badge badge--' + esc(p.status) + '">' + esc(st) + '</span>' +
        (p.sold ? '<span class="pcard__sold">נמכר</span>' : '') +
      '</div>' +
      '<div class="pcard__body">' +
        '<div class="pcard__city">' + esc(meta) + '</div>' +
        '<h3 class="pcard__name">' + esc(p.name) + '</h3>' +
        (text ? '<p class="pcard__text">' + esc(text) + '</p>' : '') +
        '<span class="pcard__more">לעמוד הפרויקט ' + icon('arrow-next') + '</span>' +
      '</div>' +
    '</a>';
  }

  /* ---------- reveal ---------- */
  var revealIO = null;
  function revealSweep() {
    var vh = window.innerHeight || root.clientHeight;
    $$('.reveal:not(.is-visible)').forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) e.classList.add('is-visible');
    });
  }
  function initReveal() {
    var els = $$('.reveal:not(.is-visible)');
    if (!els.length) return;
    if (reduced() || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-visible'); });
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    }
    setTimeout(revealSweep, 350);
    setTimeout(revealSweep, 1400);
    els.forEach(function (e) {
      if (e.__tzRv) return;
      e.__tzRv = true;
      revealIO.observe(e);
    });
  }

  /* ---------- count up ---------- */
  function countUp(el) {
    if (!el || el.__tzCounted) return;
    el.__tzCounted = true;
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) target = parseFloat(String(el.textContent).replace(/[^\d.]/g, ''));
    if (isNaN(target)) return;
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10) || 0;
    var pre = el.getAttribute('data-prefix') || '';
    var suf = el.getAttribute('data-suffix') || '';
    function fmt(v) { return pre + v.toFixed(dec) + suf + (suf || pre ? '\u200E' : ''); }
    if (reduced()) { el.textContent = fmt(target); return; }
    var dur = parseInt(el.getAttribute('data-duration') || '1700', 10);
    var t0 = null;
    el.textContent = fmt(0);
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * e);
      if (k < 1) window.requestAnimationFrame(step); else el.textContent = fmt(target);
    }
    window.requestAnimationFrame(step);
  }
  function initCounts() {
    var els = $$('[data-count]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(countUp); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- forms ---------- */
  function normPhone(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    d = d.replace(/^\+?972/, '0').replace(/\D/g, '');
    return d;
  }
  function validPhone(v) {
    var d = normPhone(v);
    return /^0(5\d{8}|7\d{8}|[23489]\d{7})$/.test(d);
  }
  function initForm(form) {
    if (typeof form === 'string') form = $(form);
    if (!form || form.__tzForm) return;
    form.__tzForm = true;
    form.setAttribute('novalidate', '');
    form.classList.add('form');

    var success = $('.form__success', form);
    if (!success) {
      success = doc.createElement('div');
      success.className = 'form__success';
      form.appendChild(success);
    }
    success.setAttribute('role', 'status');
    success.setAttribute('aria-live', 'polite');
    success.setAttribute('tabindex', '-1');
    success.innerHTML =
      '<strong class="form__success-title">תודה, נחזור אליך בהקדם</strong>' +
      '<p>זהו אבטיפוס — הפרטים לא נשלחו ולא נשמרו.</p>' +
      '<button type="button" class="btn btn--ghost btn--sm form__again">שליחת פנייה נוספת</button>';
    $('.form__again', success).addEventListener('click', function () {
      form.reset();
      form.classList.remove('is-success');
      var f = $('input, textarea', form);
      if (f) f.focus();
    });

    function fieldOf(input) { return input.closest('.field') || input.closest('.consent') || input.parentNode; }
    function setError(input, msg) {
      var f = fieldOf(input);
      f.classList.add('field--error');
      input.setAttribute('aria-invalid', 'true');
      var err = $('.field__error', f);
      if (!err) { err = doc.createElement('div'); err.className = 'field__error'; f.appendChild(err); }
      if (!err.id) err.id = 'err-' + (input.name || input.id || Math.random().toString(36).slice(2, 7));
      err.textContent = msg;
      input.setAttribute('aria-describedby', err.id);
    }
    function clearError(input) {
      var f = fieldOf(input);
      f.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      var err = $('.field__error', f);
      if (err) err.textContent = '';
    }
    function check(input) {
      var n = input.name;
      var v = (input.value || '').trim();
      if (n === 'name') {
        if (v.length < 2) return 'נא להזין שם מלא';
      } else if (n === 'phone') {
        if (!v) return 'נא להזין מספר טלפון';
        if (!validPhone(v)) return 'מספר הטלפון אינו תקין (לדוגמה 052-1234567)';
      } else if (n === 'email') {
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'כתובת הדוא״ל אינה תקינה';
      } else if (n === 'consent') {
        if (!input.checked) return 'יש לאשר את התנאים כדי להמשיך';
      }
      return '';
    }
    var inputs = $$('[name=name], [name=phone], [name=email], [name=consent]', form);
    inputs.forEach(function (inp) {
      inp.addEventListener('blur', function () {
        if (inp.name === 'consent') return;
        var m = check(inp);
        if (m) setError(inp, m); else clearError(inp);
      });
      inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', function () {
        if (fieldOf(inp).classList.contains('field--error') && !check(inp)) clearError(inp);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      inputs.forEach(function (inp) {
        var m = check(inp);
        if (m) { setError(inp, m); if (!firstBad) firstBad = inp; } else clearError(inp);
      });
      if (firstBad) { firstBad.focus(); return; }
      form.classList.add('is-success');
      success.focus({ preventScroll: true });
      if (success.scrollIntoView) success.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    });
  }

  /* ---------- lightbox ---------- */
  function initLightbox(container) {
    var wrap = typeof container === 'string' ? $(container) : container;
    if (!wrap || wrap.__tzLb) return;
    wrap.__tzLb = true;
    var items = [];
    var idx = 0;
    var box = null, img, cap, count, opener = null, startX = null;

    function collect() { items = $$('a[data-lightbox], a[href][data-lightbox-item]', wrap); if (!items.length) items = $$('a[data-lightbox]', wrap); }
    function build() {
      box = doc.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'גלריית תמונות');
      box.hidden = true;
      box.innerHTML =
        '<button type="button" class="lightbox__btn lightbox__close" aria-label="סגירה">' + icon('close') + '</button>' +
        '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" aria-label="התמונה הקודמת">' + icon('chevron-prev') + '</button>' +
        '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" aria-label="התמונה הבאה">' + icon('chevron-next') + '</button>' +
        '<div class="lightbox__count" aria-live="polite"></div>' +
        '<figure class="lightbox__stage"><img class="lightbox__img" alt=""><figcaption class="lightbox__cap"></figcaption></figure>';
      doc.body.appendChild(box);
      img = $('.lightbox__img', box);
      cap = $('.lightbox__cap', box);
      count = $('.lightbox__count', box);
      $('.lightbox__close', box).addEventListener('click', close);
      $('.lightbox__nav--prev', box).addEventListener('click', function () { go(-1); });
      $('.lightbox__nav--next', box).addEventListener('click', function () { go(1); });
      box.addEventListener('click', function (e) { if (e.target === box || e.target.classList.contains('lightbox__stage')) close(); });
      box.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);   // swipe left => next in RTL? left swipe moves forward
      }, { passive: true });
      doc.addEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (!box || box.hidden) return;
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft') { go(1); }     // RTL: left = next
      else if (e.key === 'ArrowRight') { go(-1); }  // RTL: right = previous
      else if (e.key === 'Tab') {
        var f = $$('button', box);
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
    }
    function show(i) {
      idx = (i + items.length) % items.length;
      var a = items[idx];
      var th = $('img', a);
      var alt = a.getAttribute('data-alt') || (th && th.getAttribute('alt')) || '';
      img.classList.add('is-loading');
      img.onload = function () { img.classList.remove('is-loading'); };
      img.onerror = function () { img.classList.remove('is-loading'); };
      img.src = a.getAttribute('href');
      img.alt = alt;
      var render = a.hasAttribute('data-render') || a.getAttribute('data-kind') === 'render';
      cap.innerHTML = esc(alt) + (render ? '<small>הדמיה להמחשה בלבד</small>' : '');
      count.textContent = (idx + 1) + ' מתוך ' + items.length;
      var multi = items.length > 1;
      $('.lightbox__nav--prev', box).style.display = multi ? '' : 'none';
      $('.lightbox__nav--next', box).style.display = multi ? '' : 'none';
    }
    function go(d) { show(idx + d); }
    function open(i, from) {
      if (!box) build();
      opener = from || null;
      show(i);
      box.hidden = false;
      doc.body.style.overflow = 'hidden';
      window.requestAnimationFrame(function () { box.classList.add('is-open'); });
      $('.lightbox__close', box).focus();
    }
    function close() {
      if (!box || box.hidden) return;
      box.classList.remove('is-open');
      doc.body.style.overflow = '';
      setTimeout(function () { box.hidden = true; }, reduced() ? 0 : 380);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    wrap.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-lightbox]') : null;
      if (!a || !wrap.contains(a)) return;
      e.preventDefault();
      collect();
      var i = items.indexOf(a);
      if (i >= 0) open(i, a);
    });
    collect();
  }

  /* ---------- map ---------- */
  function mapCardHtml(p) {
    var st = statusLabel(p.status) || p.statusHe || '';
    var city = cityLabel(p.city) || p.cityHe || '';
    var cover = p.cover || (p.images && p.images[0] && p.images[0].src) || '';
    return '<a class="map-card" href="project.html?p=' + encodeURIComponent(p.slug) + '">' +
      '<div class="map-card__img">' + (cover ? '<img src="' + esc(cover) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') + '</div>' +
      '<div class="map-card__body">' +
        '<span class="badge badge--' + esc(p.status) + '">' + esc(st) + '</span>' +
        '<strong class="map-card__name">' + esc(p.name) + '</strong>' +
        '<span class="map-card__city">' + esc(city) + '</span>' +
        '<span class="map-card__cta">לעמוד הפרויקט</span>' +
      '</div></a>';
  }

  /* ---------- ink-style vector map (OSM data drawn as line art) ---------- */
  var INK = '#2a2624', PAPER = '#f1ecdd', PAPER2 = '#f7f3e7', GREEN = '#e3e1c8';
  function drawInk(L, map, el, D) {
    el.classList.add('map--ink');
    el.style.background = PAPER;
    if (map.attributionControl) map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" title="© OpenStreetMap contributors">© OSM</a>');
    function ll(a) { return a; }
    function poly(list, style) { return list.map(function (pts) { return L.polygon(pts.map(ll), style); }); }
    function lines(list, style) { return list.map(function (pts) { return L.polyline(pts.map(ll), style); }); }
    var base = { interactive: false, smoothFactor: 1.2, lineJoin: 'round', lineCap: 'round' };
    var groups = {};
    groups.green = L.layerGroup(poly(D.green, Object.assign({}, base, { stroke: false, fillColor: GREEN, fillOpacity: 1 }))).addTo(map);
    groups.pathLine = L.layerGroup(lines(D.roads.path, Object.assign({}, base, { color: INK, weight: 0.6, opacity: 0.55, dashArray: '2 3' }))).addTo(map);
    groups.minorCase = L.layerGroup(lines(D.roads.minor, Object.assign({}, base, { color: INK, weight: 5, opacity: .8 }))).addTo(map);
    groups.majorCase = L.layerGroup(lines(D.roads.major, Object.assign({}, base, { color: INK, weight: 9, opacity: .9 }))).addTo(map);
    groups.minorFill = L.layerGroup(lines(D.roads.minor, Object.assign({}, base, { color: PAPER, weight: 3.4, opacity: 1 }))).addTo(map);
    groups.majorFill = L.layerGroup(lines(D.roads.major, Object.assign({}, base, { color: PAPER, weight: 6.6, opacity: 1 }))).addTo(map);
    groups.rail = L.layerGroup(lines(D.rail, Object.assign({}, base, { color: INK, weight: 1.4, opacity: 0.9, dashArray: '10 5' }))).addTo(map);
    groups.bld = L.layerGroup(poly(D.buildings, Object.assign({}, base, { color: INK, weight: 0.9, opacity: .75, fillColor: PAPER2, fillOpacity: 1, lineJoin: 'miter' }))).addTo(map);
    function eachLayer(g, fn) { g.eachLayer(fn); }
    function restyle() {
      var z = map.getZoom(), k = Math.pow(2, z - 16);
      var f = Math.max(0.55, Math.min(k, 6));
      var set = { minorCase: 5 * f, minorFill: 3.4 * f, majorCase: 9 * f, majorFill: 6.6 * f };
      Object.keys(set).forEach(function (n) { eachLayer(groups[n], function (l) { l.setStyle({ weight: set[n] }); }); });
      var bw = Math.max(0.6, Math.min(1.5, 0.7 * f));
      eachLayer(groups.bld, function (l) { l.setStyle({ weight: bw }); });
      el.setAttribute('data-z', String(Math.floor(z))); if (z >= 17) el.setAttribute('data-zn', '1'); else el.removeAttribute('data-zn'); if (z >= 15.75) el.setAttribute('data-zm', '1'); else el.removeAttribute('data-zm'); if (z >= 15) el.setAttribute('data-zs', '1'); else el.removeAttribute('data-zs');
      el.style.setProperty('--fig', Math.round(Math.max(55, Math.min(115, 58 * Math.pow(2, (z - 15.25) * 0.28)))) + 'px');
    }
    map.on('zoomend', restyle);
    restyle();
    // north arrow
    var NA = L.Control.extend({ options: { position: 'topright' }, onAdd: function () {
      var d = L.DomUtil.create('div', 'tz-north');
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<svg viewBox="0 0 24 40" width="22" height="36"><path d="M12 2 L20 30 L12 24 L4 30 Z" fill="#1b1717"/><path d="M12 2 L12 24 L4 30 Z" fill="#810100"/></svg><span>צ</span>';
      return d; } });
    new NA().addTo(map);
    // main road names
    (window.MAPNAMES || []).forEach(function (n) {
      var ic = L.divIcon({ className: 'tz-road', html: '<span class="' + (n[4] ? 'tz-road--more' : '') + '" style="transform:translate(-50%,-50%) rotate(' + n[3] + 'deg)">' + n[0] + '</span>', iconSize: [0, 0] });
      L.marker([n[1], n[2]], { icon: ic, interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(map);
    });
  }
  function figIcon(L, p, active) {
    var src = 'img/fig/' + p.slug + '.png';
    var html = '<span class="fig' + (active ? ' fig--active' : '') + '"><img src="' + src + '" alt="" onerror="this.parentNode.classList.add(\'fig--none\')"><i class="fig__dot"></i><b class="fig__name">' + esc(p.name) + '</b></span>';
    return L.divIcon({ className: 'tz-fig' + (active ? ' tz-fig--active' : ''), html: html, iconSize: [0, 0], iconAnchor: [0, 0] });
  }

  function initMap(target, list, opts) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el) return null;
    opts = opts || {};
    var popup = opts.popup !== false;
    var fit = opts.fit !== false;
    list = Array.isArray(list) ? list : projects();
    if (!window.L) {
      el.classList.add('map', 'map--nolib');
      el.textContent = 'המפה אינה זמינה כרגע.';
      return null;
    }
    var L = window.L;
    el.classList.add('map');
    var pts = list.filter(function (p) {
      return p && isFinite(p.lat) && isFinite(p.lng) && p.lat !== null && p.lng !== null && (!opts.onlyActive || p.status !== 'occupied');
    });
    var D = window.MAPDATA, BOX = [32.806, 35.044, 32.844, 35.099];
    var ink = !!(D && opts.ink !== false && pts.length && pts.every(function (p) { return p.lat > BOX[0] && p.lat < BOX[2] && p.lng > BOX[1] && p.lng < BOX[3]; }));
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, minZoom: ink ? 14 : 11, maxZoom: ink ? 19 : 18, zoomSnap: ink ? 0.25 : 1, tap: false, dragging: !L.Browser.mobile, touchZoom: true, preferCanvas: ink, renderer: ink ? L.canvas({ padding: 0.4 }) : undefined });
    if (L.Browser.mobile) { map.dragging.disable(); var hint = doc.createElement('div'); hint.className = 'map-hint'; hint.textContent = 'גלילה עם שתי אצבעות להזזת המפה'; el.appendChild(hint); var tc = 0; el.addEventListener('touchstart', function (e) { if (e.touches.length > 1) { map.dragging.enable(); hint.classList.remove('is-on'); } else { map.dragging.disable(); } }, { passive: true }); }
    if (map.attributionControl) map.attributionControl.setPrefix(false);
    if (!ink) L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    else drawInk(L, map, el, D);

    // wheel zoom only after the user clicks into the map (keeps page scrolling smooth)
    map.on('click focus', function () { map.scrollWheelZoom.enable(); });
    el.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });

    var markers = {};
    el._tzmap = map;
    var seen = [];
    pts.forEach(function (p) {
      var lat = p.lat, lng = p.lng;
      var active = p.status !== 'occupied';
      var m;
      if (ink) {
        m = L.marker([lat, lng], { icon: figIcon(L, p, active), title: p.name, alt: p.name, keyboard: true, riseOnHover: true, zIndexOffset: Math.round((90 - (lat - BOX[0]) * 1000) + (active ? 1000 : 0)) });
      } else {
        if (active) {
          seen.forEach(function (s) { if (Math.abs(s[0] - lat) < 0.0006 && Math.abs(s[1] - lng) < 0.0006) { lat += 0.0005; lng += 0.0006; } });
          seen.push([lat, lng]);
        }
        var size = active ? 34 : 36;
        var ic = L.divIcon({
          className: 'tz-pin ' + (active ? 'pin--active' : 'pin--past'),
          html: '<span class="pin__dot"></span>',
          iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2]
        });
        m = L.marker([lat, lng], { icon: ic, title: p.name, alt: p.name, keyboard: true, riseOnHover: true, zIndexOffset: active ? 1000 : 0 });
      }
      if (popup && ink) m.on('click keypress', function () { map.setMaxBounds(null); });   // let the map pan freely so the card is never clipped
      if (popup) m.bindPopup(mapCardHtml(p), { maxWidth: 260, minWidth: 248, className: 'map-popup', autoPanPaddingTopLeft: [24, 110], autoPanPaddingBottomRight: [24, 24] });
      m.addTo(map);
      markers[p.slug] = m;
    });

    function fitView() {
      if (!pts.length) { map.setView([32.8355, 35.0745], 14); return; }
      if (pts.length === 1) { map.setView([pts[0].lat, pts[0].lng], 16); return; }
      var focus = pts.filter(function (p) { return p.city === 'kiryat-haim'; });
      if (focus.length < 2) focus = pts;
      var b = L.latLngBounds(focus.map(function (p) { return [p.lat, p.lng]; }));
      map.fitBounds(b.pad(0.12), { maxZoom: 15, padding: [24, 24] });
      if (map.getZoom() < 14 && focus.length < pts.length + 1 && b.getNorthEast().distanceTo(b.getSouthWest()) < 6000) map.setZoom(14);
    }
    var inkBounds = null;
    if (ink) map.on('popupclose', function () { if (inkBounds) map.setMaxBounds(inkBounds.pad(0.02)); });
    function lockBounds() {
      if (!ink) return;
      map.invalidateSize();
      var b = L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.08);
      b.extend([b.getNorth() + 0.0028, b.getCenter().lng]); b.extend([b.getSouth() - 0.0006, b.getCenter().lng]);
      if (pts.length < 2) b = b.pad(1.5);
      inkBounds = b;
      var z = map.getBoundsZoom(b, false);
      map.setMinZoom(Math.max(13, Math.min(z, 17)));
      map.setMaxBounds(b.pad(0.02));
      map.options.maxBoundsViscosity = 1;
    }
    if (ink) {
      lockBounds();
      if (pts.length > 1) map.fitBounds(inkBounds, { animate: false }); else map.setView([pts[0].lat, pts[0].lng], 17);
    } else if (fit) fitView(); else map.setView([32.8355, 35.0745], 14);

    // layout can settle after fonts/images — keep tiles sized correctly
    setTimeout(function () { map.invalidateSize(); if (ink) { lockBounds(); if (pts.length > 1) map.fitBounds(inkBounds, { animate: false }); } else if (fit) fitView(); }, 250);
    window.addEventListener('load', function () { map.invalidateSize(); });
    if ('ResizeObserver' in window) {
      var t = null;
      new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { map.invalidateSize(); lockBounds(); }, 120); }).observe(el);
    }
    return {
      map: map, markers: markers,
      focus: function (slug) { var m = markers[slug]; if (!m) return; map.setView(m.getLatLng(), Math.max(map.getZoom(), 16)); if (popup) m.openPopup(); }
    };
  }

  /* ---------- bootstrap ---------- */
  function activeKeyFor(page) {
    if (page === 'home') return 'home';
    if (page === 'projects') { var s = qs('status'); return STATUS[s] ? s : ''; }
    if (page === 'project') { var p = bySlug(qs('p')); return p ? p.status : ''; }
    if (page === 'articles' || page === 'article') return 'articles';
    if (page === 'about') return 'about';
    if (page === 'contact') return 'contact';
    return '';
  }

  function bootstrap() {
    var b = doc.body;
    var page = b.getAttribute('data-page') || '';
    if ($('.hero') || b.getAttribute('data-header') === 'over') b.classList.add('header-over');
    renderHeader(activeKeyFor(page));
    renderFooter();
    addFloating();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScroll();
    initReveal();
    initCounts();
    // forms marked data-tz-form are wired automatically
    $$('form[data-tz-form]').forEach(initForm);
  }

  window.TZ = {
    config: CFG,
    nav: NAV,
    esc: esc,
    icon: icon,
    qs: qs,
    statusLabel: statusLabel,
    cityLabel: cityLabel,
    byStatus: byStatus,
    bySlug: bySlug,
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    projectCard: projectCard,
    mapCard: mapCardHtml,
    initReveal: initReveal,
    initLightbox: initLightbox,
    initMap: initMap,
    initForm: initForm,
    countUp: countUp,
    reducedMotion: reduced
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
