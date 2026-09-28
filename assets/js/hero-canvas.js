/* Hero fallback: slow-drifting topographic contour field.
   Used when no hero video is present, or under prefers-reduced-motion (drawn once, static). */
(function () {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, t = 0, raf = 0, running = false;

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // Smooth pseudo-noise from summed sines; cheap and deterministic.
  function field(x, y, tt) {
    return (
      Math.sin(x * 0.0021 + tt * 0.00021) * 0.9 +
      Math.sin(y * 0.0017 - tt * 0.00017) * 0.8 +
      Math.sin((x + y) * 0.0011 + tt * 0.00012) * 0.7 +
      Math.sin(Math.hypot(x - w * 0.7, y - h * 0.35) * 0.0026 - tt * 0.0002) * 1.0
    );
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var step = Math.max(10, Math.round(w / 110));
    var levels = 14;
    var cols = Math.ceil(w / step) + 1;
    var rows = Math.ceil(h / step) + 1;
    var grid = new Float32Array(cols * rows);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) grid[j * cols + i] = field(i * step, j * step, t);

    ctx.lineWidth = 1;
    for (var l = 0; l < levels; l++) {
      var iso = -3.2 + (6.4 * l) / (levels - 1);
      var a = 0.05 + 0.06 * Math.abs(Math.sin(l * 0.9 + t * 0.0004));
      ctx.strokeStyle = 'rgba(233,162,59,' + a.toFixed(3) + ')';
      ctx.beginPath();
      for (var y = 0; y < rows - 1; y++) {
        for (var x = 0; x < cols - 1; x++) {
          var v0 = grid[y * cols + x], v1 = grid[y * cols + x + 1], v2 = grid[(y + 1) * cols + x + 1], v3 = grid[(y + 1) * cols + x];
          var idx = (v0 > iso ? 1 : 0) | (v1 > iso ? 2 : 0) | (v2 > iso ? 4 : 0) | (v3 > iso ? 8 : 0);
          if (idx === 0 || idx === 15) continue;
          var px = x * step, py = y * step;
          var top = [px + step * lerp(v0, v1, iso), py];
          var right = [px + step, py + step * lerp(v1, v2, iso)];
          var bottom = [px + step * lerp(v3, v2, iso), py + step];
          var left = [px, py + step * lerp(v0, v3, iso)];
          seg(idx, top, right, bottom, left);
        }
      }
      ctx.stroke();
    }
  }

  function lerp(a, b, iso) { var d = b - a; return d === 0 ? 0.5 : Math.min(1, Math.max(0, (iso - a) / d)); }
  function line(p, q) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
  function seg(i, T, R, B, L) {
    switch (i) {
      case 1: case 14: line(L, T); break;
      case 2: case 13: line(T, R); break;
      case 3: case 12: line(L, R); break;
      case 4: case 11: line(R, B); break;
      case 5: line(L, T); line(R, B); break;
      case 6: case 9: line(T, B); break;
      case 7: case 8: line(L, B); break;
      case 10: line(T, R); line(L, B); break;
    }
  }

  function loop(now) { t = now; draw(); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize();
  window.addEventListener('resize', resize);
  if (!reduce) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0.05 }).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  }
})();
