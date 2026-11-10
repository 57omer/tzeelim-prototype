/* Hero life: a silent 10s video (residents on balconies, pedestrians walking independently; window lights stay fixed) laid over the
   still image of the first slide. The still is the video's own first frame, so the swap is invisible.
   - starts after the loading screen has opened (or after page load when there is no loader)
   - plays once per visit to the slide and holds on the last frame (window lights never change)
   - skipped for reduced motion, Save-Data, 2G; ?novideo=1 turns it off (for comparison)
   - phones get the 720p file (about 0.5 MB), desktops the 1080p file (about 1.2 MB) */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  if (q.get('novideo') === '1') return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  if (reduced || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;

  var slide = document.querySelector('.hero__slide[data-dwell]');
  var img = slide && slide.querySelector('.hero__bg');
  if (!slide || !img) return;

  var v = document.createElement('video');
  v.className = 'hero__bg hero__video';
  v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'none';
  v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
  v.setAttribute('disablepictureinpicture', '');
  var small = window.matchMedia && matchMedia('(max-width: 900px)').matches;
  function src(u, t) { var s = document.createElement('source'); s.src = u; s.type = t; v.appendChild(s); }
  if (small) { src('video/hero-1-720.mp4', 'video/mp4'); }
  else { src('video/hero-1.webm', 'video/webm; codecs="vp9"'); src('video/hero-1.mp4', 'video/mp4'); }
  slide.classList.add('has-video');
  img.insertAdjacentElement('afterend', v);

  var started = false, inView = true;
  function active() { return slide.classList.contains('is-active'); }
  function play() { if (!active() || !inView) return; try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
  v.addEventListener('playing', function () { v.classList.add('is-on'); window.__heroVideoStart = performance.now(); });

  function start() {
    if (started) return; started = true;
    v.preload = 'auto'; v.load();
    if (v.readyState >= 3) play(); else v.addEventListener('canplay', play, { once: true });
  }
  if (document.documentElement.classList.contains('tz-loading')) {
    // fetch quietly while the loading screen runs, but play only when it opens onto the site
    window.addEventListener('load', function () { v.preload = 'auto'; v.load(); });
    document.addEventListener('tz:revealed', start, { once: true });
    setTimeout(start, 14000);
  } else if (document.readyState === 'complete') { setTimeout(start, 300); }
  else { window.addEventListener('load', function () { setTimeout(start, 300); }, { once: true }); }

  // replay from the beginning every time the slide comes back into view; pause when it leaves
  new MutationObserver(function () {
    if (!started) return;
    if (active()) { try { v.currentTime = 0; } catch (e) {} v.classList.remove('is-on'); play(); }
    else { v.pause(); }
  }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (!started) return;
      if (inView) { if (!v.ended) play(); } else v.pause();
    }, { threshold: 0.25 }).observe(slide);
  }
})();
