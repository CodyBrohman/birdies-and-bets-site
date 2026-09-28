/* Birdies & Bets site behaviour: header, hero motion, reveals, carousel, video control, scorecard mock. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- sticky header ---------- */
  var header = document.getElementById('site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- headline word reveal ---------- */
  var h1 = document.querySelector('[data-split]');
  if (h1) {
    h1.querySelectorAll('.line').forEach(function (line) {
      var isEm = line.querySelector('em');
      var host = isEm || line;
      var words = host.textContent.trim().split(/\s+/);
      host.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        host.appendChild(s);
        if (i < words.length - 1) host.appendChild(document.createTextNode(' '));
      });
    });
    if (hasGsap && !reduce.matches) {
      gsap.from('.hero h1 .w', { y: '0.6em', opacity: 0, rotateX: -30, duration: 0.7, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.from('.hero .eyebrow, .hero .lede, .hero-actions, .hero-note', { y: 14, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08, delay: 0.45 });
    }
  }

  /* ---------- hero phone: tilt -> flat, scrubbed ---------- */
  var phone = document.getElementById('hero-phone');
  if (phone && hasGsap) {
    gsap.matchMedia().add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 901px)' }, function (ctx) {
      var c = ctx.conditions;
      if (!c.motion) { gsap.set(phone, { rotateX: 0, rotateY: 0, y: 0, scale: 1 }); return; }
      gsap.set(phone, { rotateX: 18, rotateY: c.desktop ? -14 : 0, y: 60, scale: 0.94, transformOrigin: '50% 60%' });
      gsap.from(phone, { opacity: 0, y: 120, duration: 1, ease: 'expo.out', delay: 0.2 });
      gsap.to(phone, {
        rotateX: 0, rotateY: 0, y: c.desktop ? -60 : -20, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.8 }
      });
      gsap.to('.hero-copy', {
        y: -40, opacity: 0.35, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: '30% top', end: 'bottom top', scrub: 0.8 }
      });
      gsap.to('.hero-media', {
        yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------- scroll reveals ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (hasGsap && !reduce.matches) {
    ScrollTrigger.batch(reveals, {
      start: 'top 88%',
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.07, overwrite: true, onComplete: function () { els.forEach(function (e) { e.classList.add('is-in'); }); } });
      },
      once: true
    });
  } else {
    reveals.forEach(function (e) { e.classList.add('is-in'); });
  }

  /* ---------- scorecard mock: type scores in on reveal ---------- */
  var mock = document.getElementById('card-mock');
  if (mock) {
    var cells = Array.prototype.slice.call(mock.querySelectorAll('td[data-s]'));
    var tots = Array.prototype.slice.call(mock.querySelectorAll('td[data-t]'));
    cells.forEach(function (c) { c.setAttribute('data-empty', ''); c.textContent = '–'; });
    tots.forEach(function (c) { c.textContent = ''; });
    var fill = function (c) {
      var parts = c.getAttribute('data-s').split(' ');
      var s = document.createElement('span');
      s.className = 's ' + parts.slice(1).join(' ');
      s.textContent = parts[0];
      c.textContent = '';
      c.removeAttribute('data-empty');
      c.appendChild(s);
    };
    var run = function () {
      if (reduce.matches || !hasGsap) { cells.forEach(fill); tots.forEach(function (t) { t.textContent = t.getAttribute('data-t'); }); return; }
      // Fill column by column (hole by hole), like a round being played.
      var byHole = {};
      cells.forEach(function (c) { var i = c.cellIndex; (byHole[i] = byHole[i] || []).push(c); });
      var holes = Object.keys(byHole).sort(function (a, b) { return a - b; });
      holes.forEach(function (h, i) { setTimeout(function () { byHole[h].forEach(fill); }, 260 + i * 140); });
      setTimeout(function () { tots.forEach(function (t) { t.textContent = t.getAttribute('data-t'); }); }, 260 + holes.length * 140);
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(mock);
    } else run();
  }

  /* ---------- carousel (mobile: scroll-snap track + buttons + keys) ---------- */
  var car = document.getElementById('shots-carousel');
  if (car) {
    var track = car.querySelector('.shots-track');
    var slides = Array.prototype.slice.call(track.children);
    var pos = car.querySelector('.pos');
    var btns = car.querySelectorAll('[data-dir]');
    var index = 0;
    function goTo(i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      var el = slides[index];
      var left = el.offsetLeft - (track.clientWidth - el.clientWidth) / 2;
      track.scrollTo({ left: left, behavior: reduce.matches ? 'auto' : 'smooth' });
      update();
    }
    function update() {
      pos.textContent = (index + 1) + ' / ' + slides.length;
      btns[0].disabled = index === 0;
      btns[1].disabled = index === slides.length - 1;
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { goTo(index + Number(b.getAttribute('data-dir'))); }); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    });
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var mid = track.scrollLeft + track.clientWidth / 2, best = 0, d = Infinity;
        slides.forEach(function (s, i) { var c = s.offsetLeft + s.clientWidth / 2; var dd = Math.abs(c - mid); if (dd < d) { d = dd; best = i; } });
        index = best; update();
      }, 80);
    }, { passive: true });
    update();
  }

  if (hasGsap) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
