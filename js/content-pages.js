/* Content pages: about, articles, article, contact, legal. Runs after site.js. */
(function () {
  'use strict';
  var TZ = window.TZ || {};
  var C = window.CONTENT || {};
  var esc = TZ.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var page = document.body.getAttribute('data-page');
  var NOTE = 'הדמיה להמחשה בלבד';
  var ARTICLE_COVER = { 'new-apartments': 'homa-umigdal-64', 'pinui-binui': 'harishonim-41', 'tama-38': 'belinson-42' };

  function $(s, c) { return (c || document).querySelector(s); }
  function icon(n, c) { return TZ.icon ? TZ.icon(n, c) : ''; }
  function ph(tel, label) { return '<a href="tel:' + tel + '"><bdi dir="ltr">' + esc(label) + '</bdi></a>'; }
  function bySlug(s) { return (window.PROJECTS || []).filter(function (p) { return p.slug === s; })[0] || null; }
  function coverFor(id) { return ARTICLE_COVER[id] ? 'img/articles/' + id + '.jpg' : 'img/hero/hero-1.jpg'; }

  /* shared form (prefix keeps ids unique) */
  function formHtml(pfx, withMessage) {
    return '<form class="form" data-tz-form novalidate>' +
      '<div class="form__row form__row--2">' +
        '<div class="field"><label for="' + pfx + '-name">שם מלא</label><input id="' + pfx + '-name" name="name" autocomplete="name"></div>' +
        '<div class="field"><label for="' + pfx + '-phone">טלפון</label><input id="' + pfx + '-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:start"></div>' +
      '</div>' +
      (withMessage ? '<div class="field"><label for="' + pfx + '-msg">הודעה <span class="field__opt">(לא חובה)</span></label><textarea id="' + pfx + '-msg" name="message"></textarea></div>' : '') +
      '<div class="consent"><input type="checkbox" id="' + pfx + '-c" name="consent"><label for="' + pfx + '-c">אני מאשר/ת יצירת קשר חוזר. <a href="legal.html?doc=privacy">מדיניות פרטיות</a></label></div>' +
      '<button class="btn" type="submit">השאר פרטים ' + icon('arrow-next', 'icon--arrow') + '</button>' +
      '<p class="form__note">אבטיפוס: הפרטים אינם נשלחים בפועל.</p>' +
    '</form>';
  }
  function ctaBlock(id, title, text) {
    return '<section class="section section--dark" id="' + id + '"><div class="container cta">' +
      '<div class="reveal"><span class="eyebrow">צור קשר</span><h2 class="cta__title">' + esc(title) + '</h2><p class="cta__text">' + esc(text) + '</p></div>' +
      '<div class="reveal" style="--i:1">' + formHtml(id + '-f', false) + '</div></div></section>';
  }

  function blocks(list) {
    var out = '', inList = false;
    (list || []).forEach(function (b) {
      if (b.type === 'li') { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + esc(b.text) + '</li>'; return; }
      if (inList) { out += '</ul>'; inList = false; }
      if (b.type === 'h2') out += '<h2>' + esc(b.text) + '</h2>';
      else if (b.type === 'h3') out += '<h3>' + esc(b.text) + '</h3>';
      else out += '<p>' + esc(b.text) + '</p>';
    });
    if (inList) out += '</ul>';
    return out;
  }

  function setTitle(t, desc) {
    document.title = t + ' | צאלים קבלני בניין';
    if (desc) { var m = $('meta[name="description"]'); if (m) m.setAttribute('content', desc); }
  }

  /* ---------------- ABOUT ---------------- */
  function about() {
    var co = C.company || {}, all = window.PROJECTS || [];
    var occ = all.filter(function (p) { return p.status === 'occupied'; }).length;
    $('#about-lead').textContent = co.lead || '';
    var intro = (co.intro || []).map(function (t, i) { return i === 0 ? '<p class="lead">' + esc(t) + '</p>' : '<p>' + esc(t) + '</p>'; }).join('');
    var cover = bySlug('belinson-49') || all[0];
    var galSlugs = ['belinson-42', 'homa-umigdal-64', 'harishonim-41', 'ziper-5', 'yael-13'];
    var gal = galSlugs.map(bySlug).filter(Boolean).map(function (p, i) {
      var alt = esc(p.name + ' · ' + p.cityHe);
      return '<a class="gallery__item reveal' + (i === 0 ? ' gallery__item--wide' : '') + '" style="--i:' + i + '" href="project.html?p=' + esc(p.slug) + '" aria-label="' + alt + '">' +
        '<img src="' + esc(p.cover) + '" alt="' + alt + '" loading="lazy"><span class="about-gal__cap">' + esc(p.name) + '</span></a>';
    }).join('');
    var values = (C.values || []).map(function (v, i) {
      return '<div class="value reveal" style="--i:' + i + '"><div class="value__num">0' + (i + 1) + '</div><h3 class="value__title">' + esc(v.title) + '</h3><p class="value__text">' + esc(v.text) + '</p></div>';
    }).join('');
    var services = (co.services || []).map(function (s, i) { return '<li class="reveal" style="--i:' + i + '"><span>' + icon('check') + '</span>' + esc(s) + '</li>'; }).join('');

    $('#about-root').innerHTML =
      '<section class="section section--flush-top"><div class="container split split--top">' +
        '<div class="stack reveal" style="--stack:20px">' + intro + '<p class="about-sign">' + esc(co.sinceLine || '') + '</p></div>' +
        '<figure class="reveal" style="--i:1"><div class="media" style="--ratio:4/5"><img src="' + esc(cover.cover) + '" alt="' + esc(cover.name + ' · ' + cover.cityHe) + '" loading="eager"><span class="media__note">' + NOTE + '</span></div></figure>' +
      '</div></section>' +

      '<section class="section section--surface"><div class="container">' +
        '<div class="trust">' +
          '<div class="stat reveal"><div class="stat__num" data-count="' + (co.years || 35) + '" data-suffix="+">' + (co.years || 35) + '+</div><div class="stat__label">שנות ניסיון</div></div>' +
          '<div class="stat reveal" style="--i:1"><div class="stat__num">' + (co.founded || 1991) + '</div><div class="stat__label">שנת הקמה</div></div>' +
          '<div class="stat reveal" style="--i:2"><div class="stat__num" data-count="' + all.length + '">' + all.length + '</div><div class="stat__label">פרויקטים באתר</div></div>' +
          '<div class="stat reveal" style="--i:3"><div class="stat__num" data-count="' + occ + '">' + occ + '</div><div class="stat__label">פרויקטים מאוכלסים</div></div>' +
        '</div></div></section>' +

      '<section class="section"><div class="container split split--top">' +
        '<div class="reveal"><span class="eyebrow">תחומי פעילות</span><h2 class="section-title mt-4">' + esc(co.servicesHeading || '') + '</h2></div>' +
        '<ul class="about-services">' + services + '</ul></div></section>' +

      '<section class="section section--surface"><div class="container">' +
        '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">הערכים שלנו</span><h2 class="section-title">' + esc(co.tagline || 'יש על מי לסמוך') + '</h2></div></div>' +
        '<div class="values">' + values + '</div></div></section>' +

      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">פרויקטים</span><h2 class="section-title">מהפרויקטים שלנו</h2></div>' +
        '<a class="link-arrow" href="projects.html">לכל הפרויקטים ' + icon('arrow-next', 'icon--arrow') + '</a></div>' +
        '<div class="gallery about-gal">' + gal + '</div><p class="render-note mt-5">' + NOTE + '</p></div></section>' +

      ctaBlock('cta', 'בואו נדבר על הדירה הבאה שלכם', 'השאירו פרטים ונחזור אליכם בהקדם. אנחנו כאן לליווי ולייעוץ.');
  }

  /* ---------------- ARTICLES ---------------- */
  function articles() {
    var ai = C.articlesIntro || {};
    $('#articles-title').textContent = ai.title || 'מאמרים ומידע';
    $('#articles-lead').textContent = ai.text || '';
    $('#articles-grid').innerHTML = (C.articles || []).map(function (a, i) {
      return '<a class="acard reveal" style="--i:' + i + '" href="article.html?id=' + encodeURIComponent(a.id) + '">' +
        '<div class="acard__media media media--zoom" style="--ratio:16/10"><img src="' + esc(coverFor(a.id)) + '" alt="" loading="lazy"></div>' +
        '<h3 class="acard__title">' + esc(a.title) + '</h3><p class="acard__text">' + esc(a.excerpt) + '</p><span class="acard__more">קראו עוד ' + icon('arrow-next', 'icon--arrow') + '</span></a>';
    }).join('');
  }

  /* ---------------- ARTICLE ---------------- */
  function article() {
    var id = TZ.qs ? TZ.qs('id') : null;
    var list = C.articles || [];
    var a = list.filter(function (x) { return x.id === id; })[0];
    var root = $('#article-root');
    if (!a) {
      setTitle('המאמר לא נמצא');
      root.innerHTML = '<section class="page-head"><div class="container">' +
        '<ol class="breadcrumb"><li><a href="home.html">ראשי</a></li><li><a href="articles.html">מאמרים</a></li><li>לא נמצא</li></ol>' +
        '<h1>המאמר לא נמצא</h1><p class="lead">ייתכן שהקישור שגוי או שהמאמר הוסר.</p>' +
        '<p><a class="btn" href="articles.html">לכל המאמרים</a></p></div></section>' +
        '<section class="section section--flush-top"><div class="container"><div class="grid grid--3" id="rel">' + related(null) + '</div></div></section>';
      return;
    }
    setTitle(a.title, a.excerpt.replace(/…$/, ''));
    root.innerHTML =
      '<section class="page-head"><div class="container art-head">' +
        '<ol class="breadcrumb"><li><a href="home.html">ראשי</a></li><li><a href="articles.html">מאמרים</a></li><li>' + esc(a.title) + '</li></ol>' +
        '<h1 class="art-title reveal">' + esc(a.title) + '</h1></div></section>' +
      '<section class="section section--flush-top"><div class="container">' +
        '<figure class="art-cover reveal"><div class="media" style="--ratio:21/9"><img src="' + esc(coverFor(a.id)) + '" alt="" loading="eager"><span class="media__note">' + NOTE + '</span></div></figure>' +
        '<article class="prose art-prose">' + blocks(a.blocks) + '</article>' +
        '<p class="art-back"><a class="link-arrow" href="articles.html">' + icon('arrow-prev') + ' חזרה לכל המאמרים</a></p>' +
      '</div></section>' +
      '<section class="section section--surface"><div class="container">' +
        '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">להמשך קריאה</span><h2 class="section-title">מאמרים נוספים</h2></div></div>' +
        '<div class="grid grid--2 art-related">' + related(a.id) + '</div></div></section>' +
      ctaBlock('cta', 'רוצים לדעת עוד?', 'השאירו פרטים ונחזור אליכם לשיחה והתאמת הפתרון הנכון עבורכם.');
  }
  function related(exceptId) {
    return (C.articles || []).filter(function (x) { return x.id !== exceptId; }).map(function (x, i) {
      return '<a class="acard reveal" style="--i:' + i + '" href="article.html?id=' + encodeURIComponent(x.id) + '">' +
        '<div class="acard__media media media--zoom" style="--ratio:16/10"><img src="' + esc(coverFor(x.id)) + '" alt="" loading="lazy"></div>' +
        '<h3 class="acard__title">' + esc(x.title) + '</h3><span class="acard__more">קראו עוד ' + icon('arrow-next', 'icon--arrow') + '</span></a>';
    }).join('');
  }

  /* ---------------- CONTACT ---------------- */
  function contact() {
    var c = C.contact || {};
    var T = TZ.config || {};
    function row(k, v) { return '<div class="kv__row"><div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div></div>'; }
    $('#contact-root').innerHTML =
      '<section class="section section--flush-top"><div class="container split split--top">' +
        '<div class="reveal"><span class="eyebrow">פרטי התקשרות</span><h2 class="section-title mt-4">צאלים קבלני בניין</h2>' +
          '<div class="kv mt-6">' +
            row('כתובת המשרד', esc(c.address || 'בן צבי 61, קרית חיים')) +
            row('נייד ראשי', ph('0528587821', c.mainPhone || '052-8587821')) +
            row('משרד', ph('048722475', c.officePhone || '04-8722475')) +
            row('נייד', ph('0505381557', c.mobile || '050-5381557')) +
            row('פקס', '<bdi dir="ltr">' + esc(c.fax || '04-8578886') + '</bdi>') +
          '</div>' +
          '<div class="cluster mt-6" style="--gap:12px">' +
            '<a class="btn" href="' + esc(c.whatsapp || 'https://wa.me/972528587821') + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' שלחו הודעה בוואטסאפ</a>' +
            '<a class="btn btn--ghost" href="' + esc(c.facebook || 'https://www.facebook.com/tzeelim/') + '" target="_blank" rel="noopener">' + icon('facebook') + ' פייסבוק</a>' +
          '</div></div>' +
        '<div class="reveal contact-form" style="--i:1"><span class="eyebrow">השאירו פרטים</span><h2 class="section-title mt-4">נחזור אליכם בהקדם</h2><div class="mt-6">' + formHtml('ct', true) + '</div></div>' +
      '</div></section>' +
      '<section class="section section--surface"><div class="container">' +
        '<div class="section-head reveal"><div class="section-head__text"><span class="eyebrow">איך מגיעים</span><h2 class="section-title">המשרד שלנו בקרית חיים</h2></div></div>' +
        '<div id="map" class="map--short contact-map" role="region" aria-label="מפה: המשרד בבן צבי 61, קרית חיים"></div>' +
        '<p class="small muted mt-4">' + esc(c.address || 'בן צבי 61, קרית חיים') + ' · המיקום על המפה מקורב לפי הכתובת.</p>' +
      '</div></section>';
    var o = window.OFFICE;
    if (o && TZ.initMap) TZ.initMap('#map', [{ slug: 'office', name: o.name, status: 'marketing', city: 'kiryat-haim', lat: o.lat, lng: o.lng }], { popup: false });
  }

  /* ---------------- LEGAL ---------------- */
  function legal() {
    var L = C.legal || {};
    var key = TZ.qs ? TZ.qs('doc') : null;
    var doc = L[key];
    var nav = $('#legal-nav');
    var keys = ['privacy', 'terms', 'accessibility'].filter(function (k) { return L[k]; });
    nav.innerHTML = keys.map(function (k) {
      return '<a href="legal.html?doc=' + k + '"' + (k === key ? ' aria-current="page"' : '') + '>' + esc(L[k].title) + '</a>';
    }).join('');
    if (!doc) {
      setTitle('מסמכים משפטיים');
      $('#legal-title').textContent = 'מסמכים משפטיים';
      $('#legal-crumb').textContent = 'מסמכים משפטיים';
      $('#legal-body').innerHTML = '<p>בחרו מסמך מהרשימה.</p>';
      return;
    }
    setTitle(doc.title);
    $('#legal-title').textContent = doc.title;
    $('#legal-crumb').textContent = doc.title;
    var html = '';
    if (doc.placeholder || !doc.blocks || !doc.blocks.length) {
      html += '<div class="placeholder"><span class="placeholder__tag">מציין מקום</span><p>הטקסט של מסמך זה יעודכן.</p></div>';
    } else {
      html += '<p class="legal-note small muted">הטקסט הועתק מהאתר הקיים ויועבר לבדיקה משפטית לפני עלייה לאוויר.</p>';
    }
    html += blocks(doc.blocks);
    $('#legal-body').innerHTML = html;
  }

  var map = { about: about, articles: articles, article: article, contact: contact, legal: legal };
  if (map[page]) map[page]();
})();
