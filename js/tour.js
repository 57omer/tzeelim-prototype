/* admin draft preview of tour texts */
(function () { try { if (/[?&]draft=1/.test(location.search) && window.parent !== window && window.parent.__tzDraftTours) { window.TZ_TOURS = window.TZ_TOURS || {}; Object.keys(window.parent.__tzDraftTours).forEach(function (k) { window.TZ_TOURS[k] = window.parent.__tzDraftTours[k]; }); } } catch (e) {} })();
/* Interactive apartment tours: compact players with a full-screen mode.
   Each tour = a walk-through video + floor plan with the walker's position + room chips.
   The video loads only when a visitor starts it (about 20MB each). Several tours can sit on one page. */
(function () {
  'use strict';
  var TZ = window.TZ = window.TZ || {};
  var players = [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
  };

  function mix(a, b, t) { return a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); }); }
  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }

  /* one section per apartment, each with its own explanation; the dark background steps from noir towards a warm maroon tint,
     every section ending on the tone the next one starts with, so the page reads as a smooth graded descent */
  TZ.toursSection = function (keys) {
    var list = (keys || []).filter(function (k) { return window.TZ_TOURS && window.TZ_TOURS[k]; });
    if (!list.length) return '';
    var A = [27, 23, 23], B = [67, 32, 31], n = list.length;
    return list.map(function (k, i) {
      var c = window.TZ_TOURS[k];
      var g0 = rgb(mix(A, B, i / n)), g1 = rgb(mix(A, B, (i + 1) / n));
      var rooms = (c.stops || []).map(function (s, j) { return '<li><button type="button" class="tsec__room" data-tour="' + esc(k) + '" data-i="' + j + '">' + esc(s[1]) + '</button></li>'; }).join('');
      return '<section class="section section--dark tsec' + (i % 2 ? ' tsec--alt' : '') + (i === 0 ? ' tsec--first' : '') + (i === n - 1 ? ' tsec--last' : '') + '"' +
        (i === 0 ? ' id="pj-tour"' : '') + ' style="--g0:' + g0 + ';--g1:' + g1 + '" aria-label="סיור: ' + esc(c.title) + '">' +
        '<div class="container tsec__in">' +
        '<div class="tsec__txt reveal"><span class="eyebrow">' + esc(c.eyebrow || 'הדמיה אינטראקטיבית') + '</span>' +
        '<h2 class="section-title">' + esc(c.title) + '</h2>' +
        (c.desc ? '<p class="tsec__desc">' + esc(c.desc) + '</p>' : '') +
        (rooms ? '<p class="tsec__rooms-h">התחנות בסיור · לחצו לקפיצה</p><ul class="tsec__rooms">' + rooms + '</ul>' : '') +
        '<p class="tsec__how">↑ ↓ או גלגלת העכבר מעל התמונה · לחצו על חדר כדי לקפוץ אליו.</p>' +
        '<a class="btn btn--cotton" href="#pj-lead">השאר פרטים על הפרויקט</a></div>' +
        '<div class="tsec__player reveal" style="--i:1">' + playerHtml(k, c) + '</div>' +
        '</div></section>';
    }).join('');
  };

  function playerHtml(k, c) {
    return '<article class="tr" data-tour="' + esc(k) + '" aria-label="סיור: ' + esc(c.title) + '">' +
        '<div class="tr__stage" role="group" aria-label="סיור בדירה: ' + esc(c.title) + '. חצים למעלה ולמטה להליכה בדירה">' +
        '<video class="tr__video" muted playsinline webkit-playsinline preload="none" poster="' + esc(c.poster || '') + '" aria-hidden="true"></video>' +
        '<div class="tr__shade"></div>' +
        '<header class="tr__cap"><p class="tr__eyebrow">' + esc(c.title) + '</p><h3 class="tr__t"></h3><p class="tr__s"></p></header>' +
        '<div class="tr__map"><canvas width="' + (c.mapW || 900) + '" height="' + (c.mapH || 285) + '" aria-label="מפת הדירה"></canvas></div>' +
        '<div class="tr__chips" role="group" aria-label="קפיצה לחדר"></div>' +
        '<button type="button" class="tr__start"><span class="tr__start-ico">' + I.play + '</span><span class="tr__start-txt">התחילו סיור</span><span class="tr__start-sub">' + esc(c.title) + '</span></button>' +
        '<div class="tr__bar"><button type="button" class="tr__pp" aria-label="ניגון">' + I.play + '</button>' +
        '<input class="tr__range" type="range" min="0" max="1000" value="0" step="1" aria-label="התקדמות בסיור">' +
        '<button type="button" class="tr__fs" aria-label="מסך מלא">' + I.full + '</button></div>' +
        '<button type="button" class="tr__x" aria-label="יציאה ממסך מלא">&times;</button>' +
        '<div class="tr__hint" aria-hidden="true"><i></i><span>גללו או החליקו כדי ללכת קדימה · חזרה כדי לחזור</span></div>' +
        '<div class="tr__load" role="status" hidden><span></span></div>' +
        '<div class="tr__guide" role="dialog" aria-label="איך מטיילים בדירה" hidden><div class="tr__guide-in">' +
        '<div class="tr__guide-keys"><span class="tr__key" aria-label="חץ למעלה">&uarr;</span><span class="tr__key" aria-label="חץ למטה">&darr;</span></div>' +
        '<p class="tr__guide-t">חצים או גלגלת להליכה · לחצו על חדר כדי לקפוץ אליו</p>' +
        '<button type="button" class="tr__guide-go">הבנתי</button></div></div>' +
        '</div>' +
        '<p class="tr__note">הדמיה להמחשה בלבד · הריהוט והנוף להמחשה</p></article>';
  }

  function Player(el) {
    var cfg = window.TZ_TOURS[el.getAttribute('data-tour')];
    var stage = el.querySelector('.tr__stage'), v = el.querySelector('.tr__video'), mc = el.querySelector('.tr__map canvas'), mg = mc.getContext('2d');
    var chips = el.querySelector('.tr__chips'), range = el.querySelector('.tr__range'), pp = el.querySelector('.tr__pp'), fsb = el.querySelector('.tr__fs');
    var startB = el.querySelector('.tr__start'), xB = el.querySelector('.tr__x'), loadEl = el.querySelector('.tr__load'), loadTxt = loadEl.firstElementChild;
    var capT = el.querySelector('.tr__t'), capS = el.querySelector('.tr__s');
    var PATH = cfg.path, STOPS = cfg.stops, B = cfg.bnd, MW = mc.width, MH = mc.height;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var plan = new Image(), ready = false, loading = false, want = false, visible = false, raf = 0, lastCap = -1, mode = '';
    var self = this, guide = el.querySelector('.tr__guide'), guideGo = el.querySelector('.tr__guide-go'), guideShown = false, active = false, pending = -1;

    function mx(x) { return (x - B.x0) / (B.x1 - B.x0) * MW; }
    function my(y) { return (y - B.y0) / (B.y1 - B.y0) * MH; }
    function prog() { return v.duration ? Math.min(1, Math.max(0, v.currentTime / (v.duration - 0.04))) : 0; }

    STOPS.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = s[1]; b.dataset.i = i;
      b.addEventListener('click', function () { dismissGuide(false); seekTo(Math.min(1, s[0] + 0.0015), true); }); chips.appendChild(b);
    });

    function drawMap(p) {
      mg.clearRect(0, 0, MW, MH);
      if (plan.complete && plan.naturalWidth) mg.drawImage(plan, 0, 0, MW, MH);
      mg.strokeStyle = 'rgba(181,102,42,.55)'; mg.lineWidth = 3; mg.setLineDash([8, 6]); mg.beginPath();
      PATH.forEach(function (q, i) { if (i) mg.lineTo(mx(q[0]), my(q[1])); else mg.moveTo(mx(q[0]), my(q[1])); }); mg.stroke(); mg.setLineDash([]);
      var f = Math.max(0, Math.min(1, p)) * (PATH.length - 1), i = Math.floor(f), j = Math.min(PATH.length - 1, i + 1), a = f - i;
      var x = mx(PATH[i][0] * (1 - a) + PATH[j][0] * a), y = my(PATH[i][1] * (1 - a) + PATH[j][1] * a), an = -PATH[i][2] - Math.PI / 2;
      mg.fillStyle = 'rgba(196,122,58,.35)'; mg.beginPath(); mg.moveTo(x, y); mg.arc(x, y, MW * .05, an - .55, an + .55); mg.closePath(); mg.fill();
      mg.fillStyle = '#b5662a'; mg.strokeStyle = '#fff'; mg.lineWidth = 3; mg.beginPath(); mg.arc(x, y, MW * .011, 0, 7); mg.fill(); mg.stroke();
    }
    function markChip(p) { var k = 0; STOPS.forEach(function (s, i) { if (p >= s[0]) k = i; }); Array.prototype.forEach.call(chips.children, function (b) { var on = +b.dataset.i === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    function caption(p, instant) {
      var k = 0, i; for (i = 0; i < STOPS.length; i++) if (p >= STOPS[i][0]) k = i;
      if (k === lastCap) return; lastCap = k;
      function set() { capT.textContent = STOPS[k][1]; capS.textContent = STOPS[k][2]; capT.style.opacity = 1; capS.style.opacity = 1; }
      if (instant) { set(); return; }
      capT.style.opacity = 0; capS.style.opacity = 0; setTimeout(set, 220);
    }
    function ui() {
      var p = prog(), ended = v.ended || (v.duration && v.currentTime >= v.duration - 0.05);
      drawMap(p); markChip(p); caption(p);
      if (document.activeElement !== range) range.value = Math.round(p * 1000);
      range.style.setProperty('--p', (p * 100) + '%');
      pp.innerHTML = ended ? I.replay : (v.paused ? I.play : I.pause);
      pp.setAttribute('aria-label', ended ? 'ניגון מחדש' : (v.paused ? 'ניגון' : 'השהיה'));
    }
    function loop() { ui(); raf = (visible || mode) && !v.paused ? requestAnimationFrame(loop) : 0; }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    ['play', 'playing', 'pause', 'seeked', 'ended'].forEach(function (e) { v.addEventListener(e, function () { ui(); if (!v.paused) kick(); }); });

    function seekTo(p, cut) {
      if (!ready) return; tp = p;
      if (cut) { v.style.opacity = '.25'; var back = function () { v.style.opacity = ''; v.removeEventListener('seeked', back); }; v.addEventListener('seeked', back); setTimeout(back, 600); }
      v.currentTime = Math.max(0, Math.min(1, p)) * (v.duration - 0.04); ui(); }
    range.addEventListener('input', function () { seekTo(range.value / 1000); });
    mc.addEventListener('click', function (e) {
      if (!ready) return;
      var r = mc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * MW, y = (e.clientY - r.top) / r.height * MH, best = 0, bd = 1e9;
      PATH.forEach(function (q, i) { var d = Math.hypot(mx(q[0]) - x, my(q[1]) - y); if (d < bd) { bd = d; best = i; } });
      dismissGuide(false); seekTo(best / (PATH.length - 1), true);
    });

    function dismissGuide(play) {
      if (guide.hidden) return; guide.hidden = true;
      if (play && !reduce) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    }
    guideGo.addEventListener('click', function (e) { e.stopPropagation(); dismissGuide(true); try { stage.focus({ preventScroll: true }); } catch (x) {} });
    function toggle() {
      if (!ready) { want = true; load(); return; }
      if (v.paused || v.ended) {
        if (v.ended || v.currentTime >= v.duration - 0.05) v.currentTime = 0;
        players.forEach(function (o) { if (o !== self) o.pause(); });
        var q = v.play(); if (q && q.catch) q.catch(function () {});
      } else v.pause();
    }
    pp.addEventListener('click', toggle);
    startB.addEventListener('click', function () { want = true; load(); });
    v.addEventListener('click', function () { if (ready) toggle(); });

    function markReady() {
      if (ready) return; ready = true; loadEl.hidden = true; el.classList.add('is-ready'); v.currentTime = 0.001;
      if (want) {
        players.forEach(function (o) { if (o !== self) o.pause(); });
        if (pending >= 0) { guideShown = true; var pi = pending; pending = -1; seekTo(Math.min(1, STOPS[pi][0] + 0.0015), false); if (!reduce) { var q2 = v.play(); if (q2 && q2.catch) q2.catch(function () {}); } }
        else if (!guideShown) { guideShown = true; guide.hidden = false; try { guideGo.focus({ preventScroll: true }); } catch (e) {} }
        else if (!reduce) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
      }
      ui();
    }
    v.addEventListener('loadeddata', markReady); v.addEventListener('canplay', markReady);
    function load() {
      if (loading) return; loading = true; el.classList.add('is-loading'); loadEl.hidden = false; loadTxt.textContent = 'טוען את הסיור…';
      plan.src = cfg.plan;
      fetch(cfg.video).then(function (res) {
        var total = +res.headers.get('Content-Length') || 0;
        if (!res.body || !total || !window.ReadableStream) return res.blob();
        var rd = res.body.getReader(), got = 0, parts = [];
        return (function pump() {
          return rd.read().then(function (r) {
            if (r.done) return new Blob(parts, { type: 'video/mp4' });
            parts.push(r.value); got += r.value.length;
            loadTxt.textContent = 'טוען את הסיור… ' + Math.round(got / total * 100) + '%';
            return pump();
          });
        })();
      }).then(function (blob) { v.src = URL.createObjectURL(blob); v.load(); })
        .catch(function () { loading = false; loadTxt.textContent = 'לא ניתן לטעון את הסיור כרגע. נסו שוב.'; });
    }
    plan.addEventListener('load', function () { ui(); });

    /* ---- scroll-driven walk (full screen): wheel / swipe / arrow keys scrub the video ---- */
    var tp = 0, sraf = 0, seeking = false, hintEl = el.querySelector('.tr__hint'), touchY = null;
    function scrubOn() { return true; }   /* wheel over the video always scrubs it; the page scrolls when the pointer is elsewhere */
    function atEdge(dir) { var c = prog(); return (dir > 0 && c >= 0.998 && tp >= 0.998) || (dir < 0 && c <= 0.002 && tp <= 0.002); }
    v.addEventListener('seeked', function () { seeking = false; });
    function scrubLoop() {
      sraf = 0; if (!scrubOn() || !ready || !v.duration) return;
      var cur = prog(), d = tp - cur;
      if (Math.abs(d) > 0.0004) {
        var next = reduce ? tp : cur + d * 0.2;
        if (!seeking) { seeking = true; v.currentTime = Math.max(0, Math.min(1, next)) * (v.duration - 0.04); }
        ui(); sraf = requestAnimationFrame(scrubLoop);
      } else ui();
    }
    function scrubBy(dp) {
      if (!ready || !v.duration) return;
      if (!v.paused) v.pause();
      if (!sraf) tp = prog();
      tp = Math.max(0, Math.min(1, tp + dp));
      if (hintEl) hintEl.style.opacity = 0;
      if (!sraf) sraf = requestAnimationFrame(scrubLoop);
    }
    stage.addEventListener('wheel', function (e) {
      if (!scrubOn() || !ready) return;
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      if (!isFull() && atEdge(dy)) return;     /* at either end the page scrolls on normally */
      e.preventDefault(); dismissGuide(false);
      scrubBy(dy / (window.innerHeight * 8));
    }, { passive: false });
    stage.addEventListener('touchstart', function (e) { touchY = isFull() && e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (touchY == null || !isFull() || !ready) return;
      if (e.target.closest && e.target.closest('.tr__bar,.tr__chips,.tr__map')) return;
      var y = e.touches[0].clientY, d = touchY - y;
      e.preventDefault(); scrubBy(d / (window.innerHeight * 5.6)); touchY = y;
    }, { passive: false });
    stage.setAttribute('tabindex', '0');
    stage.addEventListener('mouseenter', function () { active = true; });
    stage.addEventListener('mouseleave', function () { active = false; });
    function onScrubKey(e) {
      if (!ready || !(isFull() || active || document.activeElement === stage)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key, d = 0;
      if (k === 'ArrowDown' || k === 'PageDown') d = k === 'PageDown' ? .08 : .04; else if (k === 'ArrowUp' || k === 'PageUp') d = k === 'PageUp' ? -.08 : -.04;
      if (!d) return;
      e.preventDefault(); dismissGuide(false); scrubBy(d);
    }
    document.addEventListener('keydown', onScrubKey, true);

    /* ---- full screen: native API where it exists, a fixed overlay otherwise (e.g. iPhone) ---- */
    function isFull() { return !!mode; }
    function enter() {
      if (isFull()) return;
      var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
      if (req && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        try { var r = req.call(stage); mode = 'native'; if (r && r.catch) r.catch(function () { overlay(); }); } catch (e) { overlay(); }
      } else overlay();
      if (hintEl) hintEl.style.opacity = 1; el.classList.add('is-full'); fsb.innerHTML = I.exit; fsb.setAttribute('aria-label', 'יציאה ממסך מלא'); kick();
    }
    function overlay() { mode = 'overlay'; stage.classList.add('is-overlay'); document.documentElement.style.overflow = 'hidden'; document.addEventListener('keydown', onKey, true); }
    function leave() {
      if (!isFull()) return;
      var m = mode; mode = '';
      if (m === 'native') { var ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) { try { ex.call(document); } catch (e) {} } }
      stage.classList.remove('is-overlay'); document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey, true);
      el.classList.remove('is-full'); fsb.innerHTML = I.full; fsb.setAttribute('aria-label', 'מסך מלא'); ui();
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); leave(); } }
    function onFsChange() { var fe = document.fullscreenElement || document.webkitFullscreenElement; if (mode === 'native' && fe !== stage) leave(); }
    document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);
    fsb.addEventListener('click', function () { isFull() ? leave() : enter(); });
    xB.addEventListener('click', leave);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (!visible && !isFull() && !v.paused) v.pause(); else if (visible) kick(); }, { threshold: 0.15 }).observe(el);
    } else visible = true;

    this.go = function (i) {
      if (!STOPS[i]) return;
      try { stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
      if (!ready) { pending = i; want = true; load(); return; }
      dismissGuide(false); seekTo(Math.min(1, STOPS[i][0] + 0.0015), true);
    };
    this.key = el.getAttribute('data-tour');
    this.pause = function () { if (ready && !v.paused) v.pause(); };
    drawMap(0); caption(0, true); markChip(0); ui();
    plan.src = cfg.plan;   /* the small floor plan (100KB) is fine to fetch up front */
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tsec__room'); if (!b) return;
    players.forEach(function (p) { if (p.key === b.getAttribute('data-tour')) p.go(+b.getAttribute('data-i')); });
  });
  TZ.initTour = function (root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.tr[data-tour]'), function (el) { players.push(new Player(el)); });
  };
})();
