/* data-driven overrides from data/content.js (CONTENT.promo), edited in the admin. HTML holds the defaults. */
(function () {
  var P = window.CONTENT && window.CONTENT.promo, sec = document.getElementById('promo41');
  if (!P || !sec) return;
  if (P.enabled === false) { sec.parentNode.removeChild(sec); return; }
  var v = document.getElementById('promo-video');
  function q(s) { return sec.querySelector(s); }
  if (P.eyebrow && q('.eyebrow')) q('.eyebrow').textContent = P.eyebrow;
  if (P.title && q('.promo__title')) q('.promo__title').textContent = P.title;
  if (P.text && q('.promo__text')) q('.promo__text').textContent = P.text;
  if (P.slug && q('.btn')) q('.btn').href = 'project.html?p=' + encodeURIComponent(P.slug);
  if (v && P.poster) v.setAttribute('poster', P.poster);
  if (v && P.video) { var s = v.querySelector('source'); if (s) s.src = P.video; }
})();
/* Harishonim 41 promo: plays while in view, sound ON by default.
   Browsers only allow audible autoplay after a user gesture, so if the first unmuted play is blocked
   it starts muted and turns the sound on at the visitor's first click / key / touch.
   The sound button toggles mute only (never restarts the video); the video resumes where it paused. */
(function () {
  var v = document.getElementById('promo-video'), b = document.getElementById('promo-sound');
  if (!v) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visible = false, userMuted = false;
  function ui() {
    if (!b) return;
    b.setAttribute('aria-pressed', String(!v.muted));
    if (!v.muted) b.classList.remove('is-hint');
    b.setAttribute('aria-label', v.muted ? 'הפעלת קול' : 'כיבוי קול');
  }
  function play() {
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      if (!v.muted) { v.muted = true; b && b.classList.add('is-hint'); ui(); var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    });
  }
  function sync() { if (visible && !reduce) play(); else v.pause(); }
  var gestures = ['pointerdown', 'keydown', 'touchend'];
  function unlock(e) {
    if (e && b && b.contains(e.target)) return;
    gestures.forEach(function (g) { document.removeEventListener(g, unlock, true); });
    if (!userMuted && v.muted) { v.muted = false; ui(); if (visible && v.paused) sync(); }
  }
  gestures.forEach(function (g) { document.addEventListener(g, unlock, true); });
  v.muted = false; ui();
  if (v.preload === 'none') v.preload = 'metadata';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(v);
  } else { visible = true; sync(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) v.pause(); else sync(); });
  if (b) b.addEventListener('click', function (e) {
    e.stopPropagation();
    v.muted = !v.muted; userMuted = v.muted; ui();
    if (visible && v.paused) sync();
  });
})();
