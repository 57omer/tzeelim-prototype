/* Home page behaviour: hero carousel, sections, map */
(function () {
  'use strict';
  var TZ = window.TZ, C = window.CONTENT || {}, P = window.PROJECTS || [];
  var esc = TZ.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; return el; }
  function txt(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
  var sec = C.sections || {};

  /* ---------------- 1. HERO ---------------- */
  var heroProjects = P.filter(function (p) { return p.heroIndex; })
    .sort(function (a, b) { return a.heroIndex - b.heroIndex; });
  var POS = { 5: '50% 62%' };
  var lead = (C.company && C.company.lead) || 'קבלני בניין בקריות, מאז 1991';
  var slogan = (C.company && C.company.tagline) || 'יש על מי לסמוך';
  var n = heroProjects.length;
  var HV = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };   // hero indexes that have a video (video/hero-N.*)
  var NOVIDEO = /[?&]novideo=1/.test(location.search);

  set('hero-slides', heroProjects.map(function (p, i) {
    var k = p.heroIndex;
        return '<div class="hero__slide' + (i === 0 ? ' is-active' : '') + '" role="group" aria-roledescription="שקופית" aria-label="' + (i + 1) + ' מתוך ' + n + '" style="--pos:' + (POS[k] || '50% 50%') + '"' + (HV[k] && !NOVIDEO ? ' data-dwell="11500" data-prog="9000" data-video="hero-' + k + '"' : '') + '>' +
      '<img class="hero__bg" src="' + (HV[k] && !NOVIDEO ? 'video/hero-' + k + '-poster.jpg' : 'img/hero/hero-' + k + '.jpg') + '" alt="' + esc('הדמיית הפרויקט ' + p.name + ', ' + (p.cityHe || '')) + '"' + (i === 0 ? ' fetchpriority="high"' : '') + ' decoding="async">' +
      '<a class="hero__cap" href="project.html?p=' + encodeURIComponent(p.slug) + '" aria-label="' + esc('לעמוד הפרויקט ' + p.name + ', ' + (p.cityHe || '') + ', ' + (p.statusHe || '')) + '">' +
        '<span class="hero__cap-kicker"><span class="hero__cap-status hero__cap-status--' + esc(p.status) + '">' + esc(p.statusHe || TZ.statusLabel(p.status)) + '</span><span class="hero__cap-city">' + esc(p.cityHe || TZ.cityLabel(p.city)) + '</span></span>' +
        '<span class="hero__cap-name">' + esc(p.name) + '</span>' +
        '<span class="hero__cap-go">לעמוד הפרויקט ' + TZ.icon('arrow-next', 'icon--arrow') + '</span>' +
      '</a></div>';
  }).join(''));

  // persistent layer above all slides: slogan, lead and buttons (rendered once, never re-animated per slide)
  set('hero-overlay',
    '<p class="hero__title" role="presentation">' + esc(slogan) + '</p>' +
    '<p class="hero__lead">' + esc(lead) + '</p>' +
    '<div class="hero__actions"><a class="btn" href="#cta">השאר פרטים</a><a class="btn btn--light" href="projects.html?status=marketing">לפרויקטים בשיווק</a></div>');

  var hero = $('#hero');
  var slides = [].slice.call(document.querySelectorAll('.hero__slide'));
  var cur = 0, timer = null, paused = false, reduced = TZ.reducedMotion && TZ.reducedMotion();

  set('hero-ui',
    '<div class="hero__dots" role="group" aria-label="בחירת שקופית">' + heroProjects.map(function (p, i) {
      return '<button type="button" class="hero__dot' + (i === 0 ? ' is-active' : '') + '" aria-label="שקופית ' + (i + 1) + ': ' + esc(p.name) + '"></button>';
    }).join('') + '</div>' +
    '<div class="hero__side">' +
    '<div class="hero__nav"><button type="button" class="hero__arrow" data-dir="-1" aria-label="הקודם">' + TZ.icon('arrow-prev') + '</button>' +
    '<button type="button" class="hero__arrow" data-dir="1" aria-label="הבא">' + TZ.icon('arrow-next') + '</button></div></div>');
  var dots = [].slice.call(document.querySelectorAll('.hero__dot'));

  function renderThumbs() { return; /* preview thumbnails removed */
    var out = '';
    for (var s = 1; s <= Math.min(2, n - 1); s++) {
      var j = (cur + s) % n, p = heroProjects[j];
      out += '<button type="button" class="hero__thumb" data-go="' + j + '" aria-label="מעבר ל' + esc(p.name) + '"><img src="img/hero/hero-' + p.heroIndex + '-thumb.jpg" alt=""><span>' + esc(p.name) + '</span></button>';
    }
    set('hero-thumbs', out);
  }
  function restartProgress() {
    hero.classList.remove('is-playing');
    if (reduced || n < 2) return;
    void hero.offsetWidth;
    hero.style.setProperty('--hero-dur', (((+slides[cur].getAttribute('data-prog')) || (+slides[cur].getAttribute('data-dwell')) || 6500) / 1000) + 's');
    hero.classList.add('is-playing');
  }
  function schedule() {
    clearTimeout(timer);
    if (reduced || paused || n < 2 || document.hidden) return;
    timer = setTimeout(function () { go(cur + 1); }, (+slides[cur].getAttribute('data-dwell')) || 6500);
  }
  function go(i, user) {
    i = (i + n) % n;
    slides[cur].classList.remove('is-active');
    dots[cur].classList.remove('is-active'); dots[cur].removeAttribute('aria-current');
    cur = i;
    slides[cur].classList.add('is-active');
    dots[cur].classList.add('is-active'); dots[cur].setAttribute('aria-current', 'true');
    renderThumbs();
    restartProgress(); schedule();
  }
  // video-driven advance: hero-video.js calls this ~1s before a video ends, so the next slide dissolves in while the last second still plays
  window.TZHero = { next: function () { if (paused || n < 2) return false; go(cur + 1); return true; } };
  function setPaused(v) {
    paused = v;
    hero.classList.toggle('is-paused', v);
    if (v) clearTimeout(timer); else { restartProgress(); schedule(); }
  }

  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i, true); }); });
  hero.addEventListener('click', function (e) {
    var a = e.target.closest('.hero__arrow'); if (a) { go(cur + parseInt(a.getAttribute('data-dir'), 10), true); return; }
    var t = e.target.closest('.hero__thumb'); if (t) go(parseInt(t.getAttribute('data-go'), 10), true);
  });
  hero.addEventListener('mouseenter', function () { setPaused(true); });
  hero.addEventListener('mouseleave', function () { if (!hero.contains(document.activeElement) || !document.activeElement.matches(':focus-visible')) setPaused(false); });
  hero.addEventListener('focusin', function () { setPaused(true); });
  hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) setPaused(false); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else { restartProgress(); schedule(); } });
  hero.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(cur + 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(cur - 1, true); e.preventDefault(); }
  });
  /* swipe (horizontal intent only) */
  var sx = 0, sy = 0, tracking = false;
  var area = $('#hero-slides');
  area.style.touchAction = 'pan-y';
  hero.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true; }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    if (!tracking) return; tracking = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? cur + 1 : cur - 1, true);
  }, { passive: true });

  if (reduced) hero.classList.add('is-paused');
  renderThumbs(); restartProgress(); schedule();
  // while the loading screen is up the first slide is not visible yet: start its dwell clock when it opens
  document.addEventListener('tz:revealed', function () { cur = 0; restartProgress(); schedule(); }, { once: true });

  /* ---------------- 2. TRUST ---------------- */
  var allP = P || [];
  var nOcc = allP.filter(function (p) { return p.status === 'occupied'; }).length;
  var nMk = allP.filter(function (p) { return p.status === 'marketing'; }).length;
  function stat(n, label, i) { return '<div class="stat reveal"' + (i ? ' style="--i:' + i + '"' : '') + '><div class="stat__num" data-count="' + n.num + '"' + (n.suf ? ' data-suffix="' + n.suf + '"' : '') + '>' + n.num + (n.suf || '') + '</div><div class="stat__label">' + label + '</div></div>'; }
  set('trust',
    stat({ num: 35, suf: '+' }, 'שנות ניסיון', 0) +
    stat({ num: 1991 }, 'שנת הקמה', 1) +
    stat({ num: allP.length }, 'פרויקטים באתר', 2) +
    stat({ num: nOcc }, 'פרויקטים מאוכלסים', 3) +
    stat({ num: nMk }, 'פרויקטים בשיווק כעת', 4));

  /* ---------------- 3. MARKETING ---------------- */
  txt('mk-title', (sec.marketing || {}).title || 'פרויקטים בשיווק');
  txt('mk-intro', (sec.marketing || {}).intro || '');
  set('mk-cards', TZ.byStatus('marketing').map(function (p, i) { return TZ.projectCard(p, i); }).join(''));

  /* ---------------- 4. CONSTRUCTION ---------------- */
  txt('cn-title', (sec.construction || {}).title || 'פרויקטים בבנייה');
  txt('cn-intro', (sec.construction || {}).intro || '');
  var cp = TZ.byStatus('construction')[0];
  if (cp) {
    var meta = cp.cityHe || TZ.cityLabel(cp.city) || '';
    set('cn-card',
      '<div class="wide-card reveal">' +
        '<figure class="wide-card__fig"><a class="wide-card__media" href="project.html?p=' + encodeURIComponent(cp.slug) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(cp.cover) + '" alt="" loading="lazy"><span class="badge badge--construction">בבנייה</span></a>' +
        '<figcaption class="render-note wide-card__caption">הדמיה להמחשה בלבד</figcaption></figure>' +
        '<div class="wide-card__body"><div class="wide-card__city">' + esc(meta) + '</div><h3 class="wide-card__name">' + esc(cp.name) + '</h3>' +
        (cp.desc ? '<p class="wide-card__text">' + esc(cp.desc.length > 160 ? cp.desc.slice(0, 160).replace(/\s+\S*$/, '') + '…' : cp.desc) + '</p>' : '') +
        '<div><a class="wide-card__more" href="project.html?p=' + encodeURIComponent(cp.slug) + '" aria-label="לעמוד הפרויקט ' + esc(cp.name) + '">לעמוד הפרויקט ' + TZ.icon('arrow-next') + '</a></div></div></div>');
  } else { var cs = document.getElementById('construction'); if (cs) cs.hidden = true; }

  /* ---------------- 5. ABOUT TEASER ---------------- */
  var co = C.company || {};
  txt('ab-title', co.yearsHeading || '35 שנות ניסיון');
  txt('ab-text', (co.intro || [])[0] || '');
  set('values', (C.values || []).map(function (v, i) {
    return '<div class="value reveal" style="--i:' + i + '"><div class="value__num">0' + (i + 1) + '</div><h3 class="value__title">' + esc(v.title) + '</h3><p class="value__text">' + esc(v.text) + '</p></div>';
  }).join(''));

  /* ---------------- 6. MAP ---------------- */
  var mapEl = document.getElementById('map');
  var mapInit = false;
  function buildMap() {
    if (mapInit) return; mapInit = true;
    try { TZ.initMap(mapEl, P, { popup: true, fit: true }); } catch (e) { if (window.console) console.warn('map', e); }
  }
  if ('IntersectionObserver' in window) {
    var mio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { buildMap(); mio.disconnect(); } }, { rootMargin: '300px' });
    mio.observe(mapEl);
  } else buildMap();

  /* ---------------- 7. OCCUPIED ---------------- */
  txt('oc-title', (sec.occupied || {}).title || 'פרויקטים מאוכלסים');
  txt('oc-intro', (sec.occupied || {}).intro || '');
  var pick = ['shishet-hayamim-20', 'belinson-38', 'rans-34', 'yatziv-45', 'moshe-sharett-60', 'ziper-20'];
  set('oc-cards', pick.map(TZ.bySlug).filter(Boolean).map(function (p, i) { return TZ.projectCard(p, i); }).join(''));

  /* ---------------- 8. NEWS ---------------- */
  txt('news-title', C.newsHeading || 'חדשות ועדכונים');
  set('news-list', (C.news || []).map(function (x, i) {
    return '<article class="news__item reveal" style="--i:' + i + '"><h3 class="news__title">' + esc(x.title) + '</h3><p class="news__text">' + esc(x.text) + '</p></article>';
  }).join(''));

  /* ---------------- 9. PARTNERS ---------------- */
  if (C.partners && C.partners.length) {
    document.getElementById('partners').hidden = false;
    txt('partners-title', C.partnersHeading || '');
    (function () {
      var box = document.getElementById('partners-logos');
      if (!box) return;
      function item(x, hide) { return '<div class="marquee__item"><img src="' + esc(x.src) + '" alt="' + (hide ? '' : esc(x.alt || 'שותף')) + '" decoding="async"' + (hide ? '' : '') + '></div>'; }
      function group(reps, hide) {
        var h = '';
        for (var r = 0; r < reps; r++) h += C.partners.map(function (x) { return item(x, hide || r > 0); }).join('');
        return '<ul class="marquee__group"' + (hide ? ' aria-hidden="true"' : '') + '>' + h.replace(/<div class="marquee__item">/g, '<li class="marquee__item">').replace(/<\/div>/g, '</li>') + '</ul>';
      }
      function build() {
        box.innerHTML = '<div class="marquee__track">' + group(1, false) + '</div>';
        var track = box.firstChild, g = track.firstChild;
        var w = g.getBoundingClientRect().width || 1;
        var need = Math.max(window.innerWidth, window.screen ? screen.width : 0, 1280) * 1.1;
        var reps = Math.max(1, Math.ceil(need / w));
        track.innerHTML = group(reps, false) + group(reps, true);
        var gw = track.firstChild.getBoundingClientRect().width;
        track.style.setProperty('--marquee-dur', Math.max(20, gw / 45).toFixed(1) + 's');
        box.dataset.reps = reps;
      }
      build();
      var lastW = window.innerWidth, t;
      window.addEventListener('resize', function () {
        clearTimeout(t); t = setTimeout(function () { if (window.innerWidth > lastW + 200) { lastW = window.innerWidth; build(); } }, 250);
      });
    })();
  }

  /* ---------------- 10. ARTICLES ---------------- */
  txt('ar-title', (C.articlesIntro || {}).title || 'מאמרים ומידע');
  var covers = ['yitzhak-yatziv-51', 'harav-kook-86', 'hashayara-26'];
  set('ar-cards', (C.articles || []).slice(0, 3).map(function (a, i) {
    var cp2 = TZ.bySlug(covers[i]);
    return '<a class="acard reveal" style="--i:' + i + '" href="article.html?id=' + encodeURIComponent(a.id) + '">' +
      '<div class="acard__media media media--zoom" style="--ratio:16/10">' + (cp2 ? '<img src="' + esc(cp2.cover) + '" alt="" loading="lazy">' : '') + '</div>' +
      '<h3 class="acard__title">' + esc(a.title) + '</h3><p class="acard__text">' + esc(a.excerpt.length > 130 ? a.excerpt.slice(0, 130).replace(/\s+\S*$/, '') + '…' : a.excerpt) + '</p>' +
      '<span class="acard__more">קראו עוד ' + TZ.icon('arrow-next') + '</span></a>';
  }).join(''));

  /* ---------------- 11. CTA ---------------- */
  var cfg = C.contact || {};
  set('cta-call', TZ.icon('phone') + ' התקשרו <bdi dir="ltr">' + esc(cfg.mainPhone || '052-8587821') + '</bdi>');
  set('cta-wa', TZ.icon('whatsapp') + ' וואטסאפ');

  /* new .reveal nodes were added: re-observe */
  if (TZ.initReveal) TZ.initReveal();
})();
