/* Loading screen controller (single page: the loader lives in home.html itself).
   Sequence: alef + progress line  ->  alef opens into the full logo  ->  the logo flies to the
   header and lands exactly on the real header logo  ->  the cotton screen opens onto the site.
   - waits for window load + fonts + the first hero image (8s cap), minimum 1.7s
   - shown once per browser session (sessionStorage); ?loader=1 forces it, ?noloader=1 skips it
   - ?loaderhold=4000 keeps the alef stage 4 seconds longer (for review) */
(function () {
  'use strict';
  var el = document.getElementById('tzLoader');
  if (!el) return;
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);

  function seen() { try { return sessionStorage.getItem('tzLoaderSeen') === '1'; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem('tzLoaderSeen', '1'); } catch (e) {} }

  if (q.get('noloader') === '1' || (seen() && q.get('loader') !== '1')) {
    el.parentNode.removeChild(el);
    root.classList.remove('tz-loading');
    return;
  }
  root.classList.add('tz-loading');   // hides the real header logo until the landing

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hold = Math.max(0, parseInt(q.get('loaderhold') || '0', 10) || 0);
  var minMs = (reduced ? 500 : 1700) + hold;
  var t0 = performance.now();
  var bar = el.querySelector('.tz-bar i');
  var progress = 0, finished = false;

  function setProgress(v) {
    progress = Math.max(progress, Math.min(1, v));
    if (bar) bar.style.transform = 'scaleX(' + progress + ')';
  }
  (function tick() {
    if (finished) return;
    setProgress(Math.min(0.9, 1 - Math.exp(-(performance.now() - t0) / 1500)));
    requestAnimationFrame(tick);
  })();

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var pageLoaded = new Promise(function (r) {
    if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true });
  });
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();
  var heroReady = pageLoaded.then(function () {
    var img = document.querySelector('.hero__bg');
    if (!img || img.complete) return;
    return new Promise(function (r) {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    });
  });

  Promise.race([Promise.all([pageLoaded, fontsReady, heroReady]), wait(8000)]).then(function () {
    setTimeout(open, Math.max(0, minMs - (performance.now() - t0)));
  });

  /* where the real header logo is (falls back to the CSS numbers if it is not found) */
  function headerRect() {
    var img = document.querySelector('.site-header .logo img');
    if (img) {
      var r = img.getBoundingClientRect();
      if (r.width > 0) return { left: r.left, top: r.top, w: r.width, h: r.height };
    }
    var vw = window.innerWidth, cw = Math.min(vw - 32, 1360), h = vw >= 1080 ? 50 : 40, w = h * 700 / 246;
    return { left: (vw + cw) / 2 - w, top: ((vw >= 1080 ? 84 : 72) - h) / 2, w: w, h: h };
  }
  // glyph boxes inside the two images (fractions), so wordmark lands on wordmark
  var HX0 = 0, HX1 = 0.9957, HY0 = 0.0122, OX0 = 0.0044, OX1 = 0.9956, OY0 = 0.0218;

  function fly() {
    var logo = el.querySelector('.tz-logo');
    el.classList.add('is-fly');
    var R = logo.getBoundingClientRect(), H = headerRect();
    var s = ((HX1 - HX0) * H.w) / ((OX1 - OX0) * R.width);
    var dx = (H.left + HX0 * H.w) - (R.left + s * OX0 * R.width);
    var dy = (H.top + HY0 * H.h) - (R.top + s * OY0 * R.height);
    logo.style.transition = 'transform 1.15s cubic-bezier(.65,0,.2,1)';
    logo.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
    return 1200;
  }

  function open() {
    finished = true;
    setProgress(1);
    markSeen();
    setTimeout(function () {
      el.classList.add('is-open');
      setTimeout(function () {
        var flightMs = reduced ? 0 : fly();
        setTimeout(function () {
          root.classList.remove('tz-loading');   // the real logo appears under the landed one
          try { document.dispatchEvent(new Event('tz:revealed')); } catch (err) {}
          el.classList.add('is-reveal');
          setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
        }, flightMs);
      }, reduced ? 700 : 1900);
    }, reduced ? 0 : 260);
  }
})();
