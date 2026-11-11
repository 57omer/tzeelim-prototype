/* Coverflow card carousel for the project sections (same technique as the 21st.dev "Card Carousel":
   Swiper + effect "coverflow", centred slides, loop, autoplay, pagination, navigation). Vanilla build. */
(function () {
  'use strict';
  var TZ = window.TZ; if (!TZ) return;
  var esc = TZ.esc || function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function card(p, cls) {
    var st = TZ.statusLabel(p.status) || p.statusHe || '', city = p.cityHe || TZ.cityLabel(p.city) || '';
    var cover = p.card || p.cover || (p.images && p.images[0] && p.images[0].src) || '';
    return '<a class="cc__card' + (cls ? ' ' + cls : '') + '" href="project.html?p=' + encodeURIComponent(p.slug) + '" aria-label="' + esc(p.name + ' — ' + city) + '">' +
      (cover ? '<img src="' + esc(cover) + '" alt="" draggable="false">' : '') +
      '<span class="cc__badge badge badge--' + esc(p.status) + '">' + esc(st) + '</span>' +
      (p.sold ? '<span class="cc__sold">נמכר</span>' : '') +
      '<span class="cc__info"><span class="cc__city">' + esc(city) + '</span><strong class="cc__name">' + esc(p.name) + '</strong>' +
      '<span class="cc__more">לעמוד הפרויקט ' + TZ.icon('arrow-next') + '</span></span>' +
    '</a>';
  }

  /* one project: a single centred card, same look, no carousel */
  function single(host, p) { host.innerHTML = '<div class="cc cc--single"><div class="cc__slide">' + card(p) + '</div></div>'; }

  function build(host, list) {
    list = (list || []).filter(Boolean);
    if (!host || !list.length) return;
    if (list.length === 1) return single(host, list[0]);
    var N = list.length, items = list.slice();
    while (items.length < 8) items = items.concat(list);      // Swiper's loop needs enough slides; dots/counter still use the real N
    host.innerHTML = '<div class="cc" dir="rtl">' +
      '<div class="swiper cc__swiper"><div class="swiper-wrapper">' + items.map(function (p) { return '<div class="swiper-slide cc__slide">' + card(p) + '</div>'; }).join('') + '</div></div>' +
      '<div class="cc__ctrl"><button type="button" class="cc__nav cc__prev" aria-label="הקודם">' + TZ.icon('arrow-prev') + '</button>' +
      '<button type="button" class="cc__nav cc__next" aria-label="הבא">' + TZ.icon('arrow-next') + '</button></div></div>';
    var root = host.querySelector('.cc');
    if (!window.Swiper) { root.classList.add('cc--plain'); return; }
    var sw = new window.Swiper(root.querySelector('.cc__swiper'), {
      effect: 'coverflow', grabCursor: true, centeredSlides: true, slidesPerView: 'auto', loop: true,
      speed: 750, slideToClickedSlide: true, keyboard: { enabled: true },
      coverflowEffect: { rotate: 0, stretch: 0, depth: 140, modifier: 2.1, slideShadows: false },
      navigation: { nextEl: root.querySelector('.cc__next'), prevEl: root.querySelector('.cc__prev') },
      autoplay: reduced ? false : { delay: 3800, disableOnInteraction: false, pauseOnMouseEnter: true },
      a11y: { enabled: false }
    });
    // only the centred card opens its page; side cards just come to the centre
    root.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.cc__card'); if (!a) return;
      var slide = a.closest('.swiper-slide');
      if (slide && !slide.classList.contains('swiper-slide-active')) e.preventDefault();
    });
    root.classList.add('is-ready');
    if ('IntersectionObserver' in window && !reduced) new IntersectionObserver(function (en) { if (!sw.autoplay) return; if (en[0].isIntersecting) sw.autoplay.start(); else sw.autoplay.stop(); }).observe(root);
    return sw;
  }
  TZ.carousel = build; TZ.projectHero = single;
})();
