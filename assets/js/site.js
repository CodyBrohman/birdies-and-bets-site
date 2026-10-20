/* Birdies & Bets site behaviour: header, putt progress, hero motion and shot tracer, story pin, reveals,
   marquee and wind, game diagrams, group chat, dawn-to-dusk grade, tiles, logo easter egg, scorecard mock, carousel. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = hasGsap && !reduce.matches;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  // The head script hides draw-in strokes up front; without GSAP nothing would draw them back in.
  if (!motion) document.documentElement.classList.remove('js-motion');

  /* ---------- sticky header ---------- */
  var header = document.getElementById('site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- logo chip: one flip on load (hover flip is CSS) ---------- */
  if (motion) gsap.fromTo('.brand img', { rotateY: 0 }, { rotateY: 360, duration: 1.1, ease: 'power2.inOut', delay: 0.3, clearProps: 'transform' });

  /* ---------- headline word reveal + pencil underline ---------- */
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
    if (motion) {
      gsap.from('.hero h1 .w', { y: '0.6em', opacity: 0, rotateX: -30, duration: 0.7, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.from('.hero .eyebrow, .hero .lede, .hero-actions, .hero-note', { y: 14, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08, delay: 0.45 });
      gsap.to('.scribble path', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut', delay: 0.8 });
    }
  }

  /* ---------- hero shot tracer (desktop) ---------- */
  // The arc is drawn around the phone's layout box: the ball leaves from behind the phone, climbs over it
  // and lands in the open space to its right, so it never crosses the headline or the buttons.
  var tracer = document.getElementById('tracer');
  var heroDevice = document.querySelector('.hero-device');
  var heroPhone = document.getElementById('hero-phone');
  if (tracer && heroDevice && heroPhone) {
    var tSvg = tracer.querySelector('svg');
    var tLine = tracer.querySelector('.tracer-line');
    var tGlow = tracer.querySelector('.tracer-glow');
    var tBall = tracer.querySelector('.tracer-ball');
    var tChip = tracer.querySelector('.tracer-chip');
    var tLen = 0, tEnd = null, tLanded = false;
    var layoutTracer = function () {
      var box = tracer.getBoundingClientRect();
      var dev = heroDevice.getBoundingClientRect();
      var pw = heroPhone.offsetWidth, ph = heroPhone.offsetHeight;
      var pl = dev.left - box.left + (dev.width - pw) / 2;
      var pt = dev.top - box.top + (dev.height - ph) / 2 + 40; // the phone rests 40-60px low until scrolled
      var vw = box.width, vh = Math.min(window.innerHeight, box.height);
      var room = vw - (pl + pw);
      if (room < 110) return false;
      var x0 = pl + pw * 0.32, y0 = Math.min(pt + ph, vh) - 70;
      var x3 = Math.min(pl + pw + room * 0.45, vw - 70), y3 = pt + ph * 0.42;
      var apex = Math.max(pt - 150, 110);
      var dx = x3 - x0, rise = y0 - apex;
      var d = 'M' + x0 + ' ' + y0 +
        ' C' + (x0 + dx * 0.08) + ' ' + (y0 - rise * 1.3) + ', ' +
        (x0 + dx * 0.78) + ' ' + (apex - rise * 0.12) + ', ' + x3 + ' ' + y3;
      tSvg.setAttribute('viewBox', '0 0 ' + vw + ' ' + box.height);
      tLine.setAttribute('d', d);
      tGlow.setAttribute('d', d);
      tLen = tLine.getTotalLength();
      tEnd = { x: x3, y: y3 };
      tChip.style.left = x3 + 'px';
      tChip.style.top = y3 + 'px';
      if (tLanded) { tBall.setAttribute('cx', x3); tBall.setAttribute('cy', y3); }
      return true;
    };
    var tracerOn = window.matchMedia('(min-width: 901px)').matches && layoutTracer();
    if (tracerOn) {
      var tRaf = 0;
      window.addEventListener('resize', function () { cancelAnimationFrame(tRaf); tRaf = requestAnimationFrame(layoutTracer); });
      tracer.classList.add('is-ready');
      var dash = function (v) { tLine.style.strokeDashoffset = tGlow.style.strokeDashoffset = v + 'px'; };
      if (motion) {
        var flight = { p: 0 };
        tLine.style.strokeDasharray = tGlow.style.strokeDasharray = '1px';
        dash(1);
        gsap.set(tChip, { xPercent: -50, yPercent: -100, scale: 0.4, transformOrigin: '50% 100%' });
        var hop = function (h, dur) {
          return gsap.timeline()
            .to(tBall, { attr: { cy: function () { return tEnd.y - h; } }, duration: dur, ease: 'power1.out' })
            .to(tBall, { attr: { cy: function () { return tEnd.y; } }, duration: dur, ease: 'power1.in' });
        };
        gsap.timeline({ delay: 1.05 })
          .set(tBall, { opacity: 1 })
          .to(flight, {
            p: 1, duration: 1.7, ease: 'power2.out',
            onUpdate: function () {
              var pt = tLine.getPointAtLength(tLen * flight.p);
              tBall.setAttribute('cx', pt.x);
              tBall.setAttribute('cy', pt.y);
              tBall.setAttribute('r', 6 - 3.2 * flight.p);
              dash(1 - flight.p);
            },
            onComplete: function () { tLanded = true; }
          })
          .add(hop(10, 0.16))
          .to(tChip, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(2.4)' }, '<0.1')
          .add(hop(3, 0.1), '>-0.35')
          .to(tChip, { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' }, '+=1.8')
          .to(tBall, { opacity: 0, duration: 0.5 }, '<')
          .to(tLine, { opacity: 0.3, duration: 1 }, '<')
          .to(tGlow, { opacity: 0.16, duration: 1 }, '<');
        // The leftover arc fades as the hero scrolls away rather than drifting against the phone.
        gsap.fromTo(tSvg, { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '35% top', scrub: true } });
      } else {
        tLanded = true;
        tLine.style.opacity = '0.3';
        tGlow.style.opacity = '0.16';
      }
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

  /* ---------- story: pinned phone, three screens (desktop + motion only) ---------- */
  // Created before any trigger further down the page so their start positions include the pin spacing.
  var story = document.getElementById('story');
  if (story && hasGsap) {
    gsap.matchMedia().add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', function () {
      story.classList.add('is-pinned');
      var screens = story.querySelectorAll('.story-screens img');
      var steps = story.querySelectorAll('.story-step');
      var bars = story.querySelectorAll('.story-progress span');
      var sPhone = story.querySelector('.story-phone');
      gsap.set(screens, { autoAlpha: 0 });
      gsap.set(steps, { autoAlpha: 0, y: 40 });
      gsap.set([screens[0], steps[0]], { autoAlpha: 1, y: 0 });
      var swap = function (a, b) {
        return gsap.timeline()
          .to(screens[a], { autoAlpha: 0, scale: 0.94, yPercent: -3, duration: 0.6, ease: 'power2.in' }, 0)
          .fromTo(screens[b], { autoAlpha: 0, scale: 1.04, yPercent: 4 }, { autoAlpha: 1, scale: 1, yPercent: 0, duration: 0.6, ease: 'power2.out' }, 0.25)
          .to(steps[a], { autoAlpha: 0, y: -40, duration: 0.5, ease: 'power2.in' }, 0)
          .to(steps[b], { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.3);
      };
      var fill = function (bar) { return gsap.to(bar, { backgroundSize: '100% 100%', duration: 1, ease: 'none' }); };
      var tl = gsap.timeline({
        scrollTrigger: { trigger: '#story-pin', start: 'top top', end: '+=220%', pin: true, scrub: 0.6, anticipatePin: 1 }
      });
      tl.add(fill(bars[0]))
        .add(swap(0, 1))
        .add(fill(bars[1]))
        .add(swap(1, 2))
        .add(fill(bars[2]));
      tl.fromTo(sPhone, { rotateY: -12, rotateX: 6 }, { rotateY: 10, rotateX: 0, duration: tl.duration(), ease: 'none' }, 0);
      return function () { story.classList.remove('is-pinned'); };
    });
  }

  /* ---------- scroll reveals ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (motion) {
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

  /* ---------- putting-green progress: the ball rolls with the page and drops at the CTA ---------- */
  var putt = document.getElementById('putt');
  if (putt && hasGsap && document.getElementById('download')) {
    var pLine = putt.querySelector('.putt-line');
    var pBall = putt.querySelector('.putt-ball');
    var pFill = putt.querySelector('.putt-fill');
    var pFlag = putt.querySelector('.putt-flag');
    var lineW = pLine.clientWidth;
    var holed = false, lastP = 0;
    var xTo = motion ? gsap.quickTo(pBall, 'x', { duration: 0.35, ease: 'power3' }) : null;
    var rTo = motion ? gsap.quickTo(pBall, 'rotation', { duration: 0.35, ease: 'power3' }) : null;
    var fTo = motion ? gsap.quickTo(pFill, 'scaleX', { duration: 0.35, ease: 'power3' }) : null;
    var roll = function (p) {
      lastP = p;
      if (!motion) { gsap.set(pFill, { scaleX: p }); return; }
      fTo(p);
      if (holed) return;
      xTo(p * lineW);
      rTo(p * lineW / (Math.PI * 10) * 360);
    };
    var sink = function () {
      holed = true;
      putt.classList.add('is-holed');
      if (!motion) return;
      gsap.to(pBall, { x: lineW + 14, y: 1, scale: 0.55, opacity: 0, duration: 0.45, ease: 'power2.in', overwrite: 'auto' });
      gsap.fromTo(pFlag, { rotation: -14 }, { rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.3)' });
    };
    var unsink = function () {
      holed = false;
      putt.classList.remove('is-holed');
      if (!motion) return;
      gsap.to(pBall, { y: 0, scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      xTo(lastP * lineW);
    };
    ScrollTrigger.create({
      start: 0, endTrigger: '#download', end: 'top 60%',
      onUpdate: function (self) { roll(self.progress); },
      onLeave: function () { roll(1); sink(); },
      onEnterBack: unsink
    });
    ScrollTrigger.addEventListener('refresh', function () { lineW = pLine.clientWidth; if (!holed) roll(lastP); });
    putt.classList.add('is-on');
  }

  /* ---------- scroll velocity: marquee speeds up and leans, the putt flag catches the wind ---------- */
  var mq = document.querySelector('.marquee-track');
  var cloth = document.querySelector('.putt-flag i');
  if (motion && (mq || cloth)) {
    var loop = null, skewTo = null, hover = false, calmT = 0;
    var settle = function () { if (loop) gsap.to(loop, { timeScale: hover ? 0 : 1, duration: 1.2, ease: 'power2.out', overwrite: true }); };
    if (mq) {
      mq.classList.add('is-gsap');
      loop = gsap.to(mq, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
      skewTo = gsap.quickTo(mq, 'skewX', { duration: 0.5, ease: 'power3' });
      mq.parentNode.addEventListener('mouseenter', function () { hover = true; settle(); });
      mq.parentNode.addEventListener('mouseleave', function () { hover = false; settle(); });
    }
    var windTo = cloth ? gsap.quickTo(cloth, 'scaleX', { duration: 0.6, ease: 'power2' }) : null;
    var gustTo = cloth ? gsap.quickTo(cloth, 'skewY', { duration: 0.6, ease: 'power2' }) : null;
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = self.getVelocity();
        if (cloth) { windTo(1 + Math.min(Math.abs(v) / 2500, 0.6)); gustTo(gsap.utils.clamp(-16, 16, v / -250)); }
        if (mq && !hover) {
          gsap.to(loop, { timeScale: Math.min(1 + Math.abs(v) / 220, 9), duration: 0.2, overwrite: true, onComplete: settle });
          skewTo(gsap.utils.clamp(-8, 8, v / -350));
        }
        clearTimeout(calmT);
        calmT = setTimeout(function () {
          if (skewTo) skewTo(0);
          if (cloth) { windTo(1); gustTo(0); }
        }, 140);
      }
    });
  }

  /* ---------- game explainers: a tiny diagram per game, played on hover (or once in view on touch) ---------- */
  // Each diagram's markup is its final frame; the timeline animates into it, so reduced motion simply shows it.
  var seq = function (states, last, label) {
    return states.map(function (s, i) {
      return '<span class="v-big v-seq' + (i === states.length - 1 ? ' v-final' + last : '') + '" style="left:0;top:8px">' + s + '</span>';
    }).join('') + '<span class="v-lbl" style="left:64px;top:12px">' + label + '</span>';
  };
  var playSeq = function (tl, viz) {
    var spans = viz.querySelectorAll('.v-seq');
    tl.set(spans, { autoAlpha: 0 });
    spans.forEach(function (s, i) {
      tl.fromTo(s, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' });
      if (i < spans.length - 1) tl.to(s, { autoAlpha: 0, y: -10, duration: 0.18, ease: 'power2.in' }, '+=0.28');
    });
    return tl;
  };
  var VIZ = {
    skins: {
      html: '<span class="v-lbl" style="left:3px;top:24px">5</span><span class="v-lbl" style="left:21px;top:24px">6</span><span class="v-lbl" style="left:39px;top:24px">7</span>' +
        '<span class="v-chip" style="left:78px;top:18px"></span><span class="v-chip" style="left:78px;top:13px"></span><span class="v-chip" style="left:78px;top:8px"></span>' +
        '<span class="v-dot on" style="left:100px;top:9px">M</span>',
      play: function (tl, viz) {
        var chips = viz.querySelectorAll('.v-chip');
        chips.forEach(function (c, i) {
          var dx = i * 18 - 78, dy = 4 - (18 - i * 5);
          tl.fromTo(c, { x: dx, y: dy - 12, autoAlpha: 0 }, { x: dx, y: dy, autoAlpha: 1, duration: 0.25, ease: 'back.out(2)' }, i * 0.22);
        });
        tl.to(chips, { x: 0, y: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.06 }, '+=0.2')
          .fromTo(viz.querySelector('.v-dot'), { scale: 1.35 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }, '-=0.1');
        return tl;
      }
    },
    nassau: {
      html: ['FRONT', 'BACK', 'TOTAL'].map(function (l, i) {
        return '<span class="v-lbl" style="left:' + i * 44 + 'px;top:2px">' + l + '</span><span class="v-bar" style="left:' + i * 44 + 'px;top:18px;width:36px"><i></i></span>';
      }).join('') + '<span class="v-stamp" style="left:42px;top:24px">PRESS</span>',
      play: function (tl, viz) {
        var bars = viz.querySelectorAll('.v-bar i');
        tl.fromTo(bars[0], { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power1.inOut' })
          .fromTo(bars[1], { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power1.inOut' })
          .fromTo(viz.querySelector('.v-stamp'), { scale: 2.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'power3.in' }, '-=0.1')
          .fromTo(bars[2], { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power1.inOut' });
        return tl;
      }
    },
    match: { html: seq(['AS', '1 UP', '2 UP', '3&amp;2'], ' good', 'VS SAM'), play: playSeq },
    stroke: { html: seq(['+2', '+1', 'E', '−1'], ' good', 'THRU 9'), play: playSeq },
    stableford: {
      html: ['2', '3', '2', '4'].map(function (n, i) { return '<span class="v-big v-pt" style="left:' + i * 15 + 'px;top:8px">' + n + '</span>'; }).join('') +
        '<span class="v-big good v-sum" style="left:64px;top:8px">= 11</span>',
      play: function (tl, viz) {
        tl.fromTo(viz.querySelectorAll('.v-pt'), { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, stagger: 0.16, ease: 'back.out(2)' })
          .fromTo(viz.querySelector('.v-sum'), { scale: 0.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.5)' }, '+=0.1');
        return tl;
      }
    },
    wolf: {
      html: '<span class="v-ring"><span class="v-dot on" style="left:10px;top:-7px"></span><span class="v-dot" style="left:27px;top:10px"></span>' +
        '<span class="v-dot" style="left:10px;top:27px"></span><span class="v-dot" style="left:-7px;top:10px"></span></span>' +
        '<span class="v-lbl v-lone" style="left:52px;top:12px;color:var(--gold)">LONE ×2</span>',
      play: function (tl, viz) {
        tl.fromTo(viz.querySelector('.v-ring'), { rotation: -270 }, { rotation: 0, duration: 1.2, ease: 'steps(3)' })
          .fromTo(viz.querySelector('.v-lone'), { x: -8, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
        return tl;
      }
    },
    vegas: {
      html: '<span class="v-tile" style="left:0;top:6px">4</span><span class="v-tile v-t2" style="left:19px;top:6px">5</span><span class="v-lbl v-vs" style="left:50px;top:12px">VS 56</span>',
      play: function (tl, viz) {
        tl.fromTo(viz.querySelector('.v-t2'), { x: 34, autoAlpha: 0 }, { x: 34, autoAlpha: 1, duration: 0.2 })
          .to(viz.querySelector('.v-t2'), { x: 0, duration: 0.45, ease: 'power3.inOut' }, '+=0.2')
          .fromTo(viz.querySelector('.v-vs'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
        return tl;
      }
    },
    bbb: {
      html: ['ON', 'CLOSE', 'IN'].map(function (l, i) {
        return '<span class="v-dot on v-b" style="left:' + (i * 44 + 6) + 'px;top:0"></span><span class="v-lbl" style="left:' + i * 44 + 'px;top:23px">' + l + '</span>';
      }).join(''),
      play: function (tl, viz) {
        tl.fromTo(viz.querySelectorAll('.v-b'), { scale: 0.4, opacity: 0.25 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.35, ease: 'back.out(3)' });
        return tl;
      }
    },
    hotseat: {
      html: '<span class="v-dot" style="left:0;top:16px">A</span><span class="v-dot" style="left:40px;top:16px">M</span><span class="v-dot on v-j" style="left:80px;top:16px">J</span>' +
        '<span class="v-hat" style="left:80px;top:2px"></span>',
      play: function (tl, viz) {
        var hat = viz.querySelector('.v-hat');
        tl.fromTo(hat, { x: -80, y: 0, autoAlpha: 0 }, { x: -80, autoAlpha: 1, duration: 0.2 });
        [-40, 0].forEach(function (x) {
          tl.to(hat, { x: x, duration: 0.4, ease: 'power1.inOut' }, '+=0.15')
            .to(hat, { y: -9, duration: 0.2, ease: 'power1.out', yoyo: true, repeat: 1 }, '<');
        });
        tl.fromTo(viz.querySelector('.v-j'), { scale: 1.3 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
        return tl;
      }
    }
  };
  var gameRows = document.querySelectorAll('.games-list li[data-game]');
  if (gameRows.length) {
    var canHover = window.matchMedia('(hover: hover)').matches;
    gameRows.forEach(function (li) {
      var def = VIZ[li.getAttribute('data-game')];
      if (!def) return;
      var viz = document.createElement('span');
      viz.className = 'viz';
      viz.setAttribute('aria-hidden', 'true');
      viz.innerHTML = def.html;
      li.insertBefore(viz, li.querySelector('.desc'));
      if (!motion) return;
      var tl = def.play(gsap.timeline({ paused: true }), viz);
      if (canHover) {
        tl.progress(1);
        li.addEventListener('mouseenter', function () { tl.restart(); });
      } else {
        ScrollTrigger.create({ trigger: li, start: 'top 85%', once: true, onEnter: function () { tl.restart(); } });
      }
    });
  }

  /* ---------- group chat: the thread types itself out once, then the card lands ---------- */
  var chatWin = document.getElementById('chat-window');
  if (chatWin && motion) {
    var chatLog = chatWin.querySelector('.chat-log');
    var msgs = chatLog.querySelectorAll('.msg');
    var tapback = chatLog.querySelector('.tapback');
    var typing = document.createElement('span');
    typing.className = 'typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<i></i><i></i><i></i>';
    chatLog.style.position = 'relative';
    typing.style.position = 'absolute';
    typing.style.left = '0';
    chatLog.appendChild(typing);
    gsap.set(typing, { autoAlpha: 0 });
    gsap.set(msgs, { autoAlpha: 0 });
    if (tapback) gsap.set(tapback, { autoAlpha: 0, scale: 0 });
    var chatTl = gsap.timeline({ paused: true });
    msgs.forEach(function (m) {
      var bubble = m.querySelector('p, .link-card');
      if (m.classList.contains('out')) {
        chatTl.fromTo(m, { autoAlpha: 0, x: 40, scale: 0.92 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.5, ease: 'back.out(1.6)', transformOrigin: '100% 100%' }, '+=0.5');
        if (tapback) chatTl.to(tapback, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(3)' }, '+=0.7');
        return;
      }
      chatTl.set(typing, { autoAlpha: 1, top: function () { return m.offsetTop + bubble.offsetTop; } }, '+=0.35')
        .set(typing, { autoAlpha: 0 }, '+=0.7')
        .fromTo(m, { autoAlpha: 0, y: 12, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)', transformOrigin: '0% 100%' }, '<');
    });
    ScrollTrigger.create({ trigger: chatWin, start: 'top 70%', once: true, onEnter: function () { chatTl.play(); } });
  }

  /* ---------- dawn to dusk: each photo's grade deepens as it comes in, the ground warms down the page ---------- */
  if (motion) {
    ['#shots', '#games', '#download'].forEach(function (id) {
      var sec = document.querySelector(id);
      var bg = sec && sec.querySelector('.bg');
      if (!bg) return;
      gsap.fromTo(bg, { '--grade': 0 }, { '--grade': 0.4, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'center center', scrub: true } });
    });
    var groundAt = gsap.utils.interpolate('#080F0D', '#100D0A');
    var raisedAt = gsap.utils.interpolate('#0F1A16', '#19140F');
    var rootStyle = document.documentElement.style;
    var lastStep = -1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        // Quantised so the root custom properties (and the restyle they cause) change at most 80 times.
        var step = Math.round(self.progress * 80);
        if (step === lastStep) return;
        lastStep = step;
        rootStyle.setProperty('--ground', groundAt(step / 80));
        rootStyle.setProperty('--raised', raisedAt(step / 80));
      }
    });
  }

  /* ---------- tiles: a light that follows the pointer, and a slight tilt ---------- */
  if (motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.tile, .plain-media').forEach(function (el) {
      gsap.set(el, { transformPerspective: 1000 });
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointerenter', function () { el.classList.add('is-lit'); });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        ry((px - 0.5) * 6);
        rx((0.5 - py) * 6);
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('is-lit'); rx(0); ry(0); });
    });
  }

  /* ---------- logo: back to the top instead of a reload; three quick clicks is a hole in one ---------- */
  var brandLink = document.querySelector('.site-header .brand');
  if (brandLink) {
    var brandImg = brandLink.querySelector('img');
    var clickTimes = [], toast = null, toastT = 0;
    var holeInOne = function () {
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
      }
      toast.textContent = 'Hole in one. First round’s on you.';
      toast.classList.add('is-on');
      clearTimeout(toastT);
      toastT = setTimeout(function () { toast.classList.remove('is-on'); }, 2800);
      if (!motion) return;
      var r = brandImg.getBoundingClientRect();
      var ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      gsap.fromTo(brandImg, { rotateY: 0 }, { rotateY: 720, duration: 1, ease: 'power2.out', clearProps: 'transform' });
      for (var i = 0; i < 24; i++) {
        var chip = document.createElement('span');
        chip.className = 'fx-chip' + (i % 3 === 0 ? ' gold' : '');
        document.body.appendChild(chip);
        // The logo sits at the top-left, so the chips burst out and down like a cannon, then gravity takes them.
        var bx = ox + gsap.utils.random(40, 460), by = oy + gsap.utils.random(-10, 160);
        gsap.set(chip, { x: ox, y: oy, rotation: gsap.utils.random(0, 360) });
        gsap.timeline({ onComplete: chip.remove.bind(chip) })
          .to(chip, { x: bx, y: by, duration: 0.5, ease: 'power3.out' }, 0)
          .to(chip, { x: bx + gsap.utils.random(20, 160), duration: 1.2, ease: 'none' }, 0.5)
          .to(chip, { y: window.innerHeight + 40, duration: 1.2, ease: 'power2.in' }, 0.5)
          .to(chip, { scaleX: 0.15, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 9 }, 0)
          .to(chip, { rotation: '+=' + gsap.utils.random(-540, 540), duration: 1.7, ease: 'none' }, 0);
      }
    };
    brandLink.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
      var now = Date.now();
      clickTimes = clickTimes.filter(function (t) { return now - t < 1500; });
      clickTimes.push(now);
      if (clickTimes.length >= 3) { clickTimes = []; holeInOne(); }
    });
  }

  /* ---------- scorecard mock: pencil the scores in, then the gross -> net leaderboard ---------- */
  var mock = document.getElementById('card-mock');
  if (mock) {
    var cells = Array.prototype.slice.call(mock.querySelectorAll('td[data-s]'));
    var tots = Array.prototype.slice.call(mock.querySelectorAll('td[data-t]'));
    var MARKS = {
      birdie: 'M14 2.6C21.2 2.3 25.7 7.6 25.5 14.2 25.3 20.8 20.4 25.6 13.8 25.5 7.3 25.4 2.5 20.5 2.5 14 2.5 7.8 7 3 13.6 2.7L17.6 3.5',
      bogey: 'M3.4 3.6 24.8 3 25.3 25 3 25.4 3.2 2.2'
    };
    if (motion) mock.classList.add('is-pencil');
    cells.forEach(function (c) { c.setAttribute('data-empty', ''); c.textContent = '–'; });
    tots.forEach(function (c) { c.textContent = ''; });

    var drawMark = function (span, kind) {
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 28 28');
      svg.setAttribute('class', 'mark');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.transform = 'rotate(' + (Math.random() * 14 - 7).toFixed(1) + 'deg)';
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', MARKS[kind]);
      path.setAttribute('pathLength', '1');
      svg.appendChild(path);
      span.appendChild(svg);
      gsap.to(path, { strokeDashoffset: 0, duration: 0.5, ease: 'power1.inOut', delay: 0.05 });
    };
    var fill = function (c) {
      var parts = c.getAttribute('data-s').split(' ');
      var s = document.createElement('span');
      s.className = 's ' + parts.slice(1).join(' ');
      s.textContent = parts[0];
      c.textContent = '';
      c.removeAttribute('data-empty');
      c.appendChild(s);
      if (motion) {
        if (parts.indexOf('birdie') > -1) drawMark(s, 'birdie');
        else if (parts.indexOf('bogey') > -1) drawMark(s, 'bogey');
      }
    };

    // Leaderboard rows come from the table itself: gross is the Out total, strokes are the dotted holes.
    var board = document.getElementById('card-board');
    var boardRows = board ? board.querySelector('.board-rows') : null;
    var players = Array.prototype.map.call(mock.querySelectorAll('tbody tr[data-row]'), function (tr) {
      var gross = Number(tr.querySelector('td[data-t]').getAttribute('data-t'));
      var strokes = tr.querySelectorAll('td[data-s~="dot"]').length;
      var li = document.createElement('li');
      li.innerHTML = '<span class="pos"></span><span class="name"></span><span class="val">–</span>';
      li.querySelector('.name').textContent = tr.cells[0].firstChild.textContent.trim();
      return { el: li, gross: gross, net: gross - strokes, shown: 0 };
    });
    if (boardRows) players.forEach(function (p) { boardRows.appendChild(p.el); });

    var rank = function (key) {
      var order = players.slice().sort(function (a, b) { return a[key] - b[key] || a.gross - b.gross; });
      order.forEach(function (p) {
        var r = 1 + order.filter(function (q) { return q[key] < p[key]; }).length;
        var tied = order.filter(function (q) { return q[key] === p[key]; }).length > 1;
        p.el.querySelector('.pos').textContent = (tied ? 'T' : '') + r;
      });
      return order;
    };
    var showBoard = function (key, animate) {
      if (!boardRows) return;
      board.classList.toggle('is-net', key === 'net');
      board.querySelector('.board-mode').textContent = key === 'net' ? 'Net' : 'Gross';
      var before = players.map(function (p) { return p.el.getBoundingClientRect().top; });
      rank(key).forEach(function (p) { boardRows.appendChild(p.el); });
      players.forEach(function (p, i) {
        var val = p.el.querySelector('.val');
        if (!animate) { p.shown = p[key]; val.textContent = p[key]; return; }
        var dy = before[i] - p.el.getBoundingClientRect().top;
        if (dy) gsap.fromTo(p.el, { y: dy }, { y: 0, duration: 0.8, ease: 'power3.inOut' });
        var o = { v: p.shown };
        gsap.to(o, { v: p[key], duration: 0.8, ease: 'power2.out', onUpdate: function () { val.textContent = Math.round(o.v); } });
        p.shown = p[key];
      });
    };

    var run = function () {
      if (!motion) {
        cells.forEach(fill);
        tots.forEach(function (t) { t.textContent = t.getAttribute('data-t'); });
        showBoard('net', false);
        return;
      }
      // Fill column by column (hole by hole), like a round being played.
      var byHole = {};
      cells.forEach(function (c) { var i = c.cellIndex; (byHole[i] = byHole[i] || []).push(c); });
      var holes = Object.keys(byHole).sort(function (a, b) { return a - b; });
      holes.forEach(function (h, i) { setTimeout(function () { byHole[h].forEach(fill); }, 260 + i * 140); });
      var done = 260 + holes.length * 140;
      setTimeout(function () {
        tots.forEach(function (t) {
          var o = { v: 0 };
          gsap.to(o, { v: Number(t.getAttribute('data-t')), duration: 0.9, ease: 'power2.out', onUpdate: function () { t.textContent = Math.round(o.v); } });
        });
        showBoard('gross', true);
      }, done);
      setTimeout(function () { showBoard('net', true); }, done + 2000);
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
    // aria-disabled, not disabled: a disabled button drops keyboard focus the moment you reach the end.
    function update() {
      pos.textContent = (index + 1) + ' / ' + slides.length;
      btns[0].setAttribute('aria-disabled', String(index === 0));
      btns[1].setAttribute('aria-disabled', String(index === slides.length - 1));
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        goTo(index + Number(b.getAttribute('data-dir')));
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
      if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
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
