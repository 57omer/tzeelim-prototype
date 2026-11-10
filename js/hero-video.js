/* Hero life: for slides that have a silent 10s video (data-video="hero-N"), the video is laid over the
   still image. The still is the video's own first frame, so the swap is invisible.
   Residents on balconies and pedestrians move independently; window lights never change.
   - slide 1 starts after the loading screen has opened; the others start when they become active
   - the next slide's video is fetched quietly while the current one plays
   - plays once per visit to a slide and holds on the last frame
   - skipped for reduced motion, Save-Data, 2G; ?novideo=1 turns it off (for comparison)
   - phones get the 720p file (~0.5 MB), desktops the 1080p WebM/MP4 (~1-1.5 MB) */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  if (q.get('novideo') === '1') return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  if (reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;

  var slides = [].slice.call(document.querySelectorAll('.hero__slide'));
  var items = [];
  slides.forEach(function (slide, i) {
    var name = slide.getAttribute('data-video');
    if (!name) return;
    items.push({ slide: slide, idx: i, name: name, v: null, ready: false });
  });
  if (!items.length) return;

  var small = window.matchMedia && matchMedia('(max-width: 900px)').matches;
  function build(it) {
    if (it.v) return it.v;
    var v = document.createElement('video');
    v.className = 'hero__bg hero__video';
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
    v.setAttribute('disablepictureinpicture', '');
    function src(u, t) { var s = document.createElement('source'); s.src = u; s.type = t; v.appendChild(s); }
    if (small) { src('video/' + it.name + '-720.mp4', 'video/mp4'); }
    else { src('video/' + it.name + '.webm', 'video/webm; codecs="vp9"'); src('video/' + it.name + '.mp4', 'video/mp4'); }
    it.slide.classList.add('has-video');
    var img = it.slide.querySelector('.hero__bg');
    img.insertAdjacentElement('afterend', v);
    v.addEventListener('playing', function () { v.classList.add('is-on'); if (it.idx === 0 && !window.__heroVideoStart) window.__heroVideoStart = performance.now(); });
    it.v = v;
    return v;
  }
  function fetchIt(it) { var v = build(it); if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); } }
  function isActive(it) { return it.slide.classList.contains('is-active'); }
  var inView = true;
  function playIt(it, fromStart) {
    if (!isActive(it) || !inView) return;
    var v = build(it);
    function go() {
      if (!isActive(it) || !inView) return;
      if (fromStart) { try { v.currentTime = 0; } catch (e) {} v.classList.remove('is-on'); }
      try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
    fetchIt(it);
    if (v.readyState >= 3) go(); else v.addEventListener('canplay', go, { once: true });
  }
  function nextItem(it) { var k = items.indexOf(it); return items[(k + 1) % items.length]; }

  items.forEach(function (it) {
    new MutationObserver(function () {
      if (!it.started) return;
      if (isActive(it)) { it.adv = false; playIt(it, true); var nx = nextItem(it); if (nx !== it) setTimeout(function () { fetchIt(nx); }, 1500); }
      else if (it.v) { var leaving = it.v; setTimeout(function () { if (!isActive(it)) leaving.pause(); }, 1300); }   // keep playing while the next slide dissolves in over it
    }).observe(it.slide, { attributes: true, attributeFilter: ['class'] });
  });

  /* first slide: wait for the loading screen to open; other slides begin when they are first shown */
  var first = items[0];
  function startFirst() {
    items.forEach(function (it) { it.started = true; });
    if (isActive(first)) { playIt(first, false); var nx = nextItem(first); if (nx !== first) setTimeout(function () { fetchIt(nx); }, 2500); }
  }
  if (items[0].idx !== 0) { items.forEach(function (it) { it.started = true; }); }
  else if (document.documentElement.classList.contains('tz-loading')) {
    window.addEventListener('load', function () { fetchIt(first); });
    document.addEventListener('tz:revealed', startFirst, { once: true });
    setTimeout(startFirst, 14000);
  } else if (document.readyState === 'complete') { setTimeout(startFirst, 300); }
  else { window.addEventListener('load', function () { setTimeout(startFirst, 300); }, { once: true }); }

  /* continuous chain: ~1s before the video ends, hand over to the next slide (dissolve while both play) */
  var OVERLAP = 1.05;
  setInterval(function () {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.v || !it.started || it.adv || !isActive(it)) continue;
      var v = it.v;
      if (v.duration && !v.paused && v.currentTime >= v.duration - OVERLAP) {
        if (window.TZHero && window.TZHero.next()) it.adv = true;
      } else if (v.ended && window.TZHero && window.TZHero.next()) { it.adv = true; }
    }
  }, 120);

  if ('IntersectionObserver' in window) {
    var heroEl = document.getElementById('hero') || slides[0];
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      items.forEach(function (it) {
        if (!it.v || !it.started) return;
        if (inView) { if (isActive(it) && !it.v.ended) playIt(it, false); } else it.v.pause();
      });
    }, { threshold: 0.25 }).observe(heroEl);
  }
})();
