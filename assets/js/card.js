// Shared scorecard page. Reads the round from the URL fragment (#v1.<base64url JSON>), which the browser never sends
// to this server, and draws it. Mirrors birdies-and-bets/src/lib/cardLink.ts (format v1): change both together.
// Every value from the link is inserted as text, never as HTML.
(function () {
  'use strict';

  var root = document.getElementById('card');
  var MAX = 4000;
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    (children || []).forEach(function (c) {
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function fromBase64Url(s) {
    var out = [];
    var buf = 0;
    var bits = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s[i]);
      if (v < 0) return null;
      buf = ((buf << 6) | v) & 0xffffff;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((buf >> bits) & 255);
      }
    }
    return new Uint8Array(out);
  }

  var isStr = function (v, max) { return typeof v === 'string' && v.length <= (max || 120); };
  var isInt = function (v, lo, hi) { return typeof v === 'number' && Math.floor(v) === v && v >= lo && v <= hi; };
  var isBasis = function (v) { return v === 'gross' || v === 'net'; };

  function validate(d) {
    if (!d || d.v !== 1 || !isStr(d.c) || !d.c || !isStr(d.t) || !isStr(d.d, 40) || !isBasis(d.b)) return null;
    if (!Array.isArray(d.h) || d.h.length < 1 || d.h.length > 18) return null;
    var n = d.h.length;
    if (!d.h.every(function (h) { return Array.isArray(h) && h.length === 3 && isInt(h[0], 1, 18) && isInt(h[1], 3, 6) && isInt(h[2], 1, 18); })) return null;
    if (!Array.isArray(d.p) || d.p.length < 1 || d.p.length > 6) return null;
    if (!d.p.every(function (p) {
      return Array.isArray(p) && p.length === 3 && isStr(p[0], 40) && p[0] && isInt(p[1], -54, 54) && Array.isArray(p[2]) && p[2].length === n &&
        p[2].every(function (s) { return s === null || isInt(s, -1, 20); });
    })) return null;
    if (!Array.isArray(d.g) || d.g.length > 8) return null;
    if (!d.g.every(function (g) {
      return Array.isArray(g) && g.length === 4 && isStr(g[0]) && isBasis(g[1]) && isStr(g[2]) && Array.isArray(g[3]) && g[3].length <= 8 && g[3].every(function (l) { return isStr(l); });
    })) return null;
    return d;
  }

  function decode(hash) {
    var payload = (hash || '').replace(/^#/, '');
    if (!payload || payload.length > MAX || payload.indexOf('v1.') !== 0) return null;
    try {
      var bytes = fromBase64Url(payload.slice(3));
      if (!bytes) return null;
      return validate(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
    } catch (e) {
      return null;
    }
  }

  // Same allocation as lib/handicap.ts: SIs re-ranked 1..n over the holes in play; plus handicaps give back from SI n.
  function strokesByHole(playing, holes) {
    var n = holes.length;
    var sorted = holes.slice().sort(function (a, b) { return a[2] - b[2]; });
    var out = {};
    sorted.forEach(function (h, i) {
      var rank = i + 1;
      var s;
      if (playing >= 0) s = Math.floor(playing / n) + (rank <= playing % n ? 1 : 0);
      else {
        var give = -playing;
        s = -(Math.floor(give / n) + (n - rank + 1 <= give % n ? 1 : 0));
      }
      out[h[0]] = s || 0;
    });
    return out;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function broken() {
    document.title = 'Shared scorecard — Birdies & Bets';
    root.replaceChildren(
      el('h1', null, ['Shared scorecard']),
      el('p', { class: 'meta' }, ['Link problem']),
      el('p', null, ['This card link looks broken or incomplete. Ask whoever sent it to share the card again from the app.'])
    );
  }

  function render(data, basis) {
    var holes = data.h;
    var strokes = data.p.map(function (p) { return strokesByHole(p[1], holes); });
    var valueOf = function (pi, hi) {
      var g = data.p[pi][2][hi];
      if (g === -1) return undefined;
      if (g === null) return null;
      return basis === 'net' ? g - (strokes[pi][holes[hi][0]] || 0) : g;
    };
    var front = [];
    var back = [];
    holes.forEach(function (h, i) { (h[0] <= 9 ? front : back).push(i); });
    var blocks = [];
    if (front.length) blocks.push({ label: 'Out', idx: front });
    if (back.length) blocks.push({ label: 'In', idx: back });

    var headRow = el('tr', null, [el('th', { scope: 'col' }, ['Hole'])]);
    var parRow = el('tr', null, [el('th', { scope: 'row' }, ['Par'])]);
    var playerRows = data.p.map(function (p) { return el('tr', null, [el('th', { scope: 'row' }, [p[0]])]); });

    var addBlock = function (block, showSub) {
      block.idx.forEach(function (hi) {
        headRow.appendChild(el('th', { scope: 'col' }, [holes[hi][0]]));
        parRow.appendChild(el('td', { class: 'muted' }, [holes[hi][1]]));
        playerRows.forEach(function (row, pi) {
          var v = valueOf(pi, hi);
          var rel = typeof v === 'number' ? v - holes[hi][1] : 0;
          row.appendChild(el('td', { class: 'player' + (rel < 0 ? ' under' : rel > 0 ? ' over' : '') + (v === undefined ? ' muted' : '') }, [v === undefined ? '·' : v === null ? '–' : v]));
        });
      });
      if (!showSub) return;
      headRow.appendChild(el('th', { scope: 'col' }, [block.label]));
      parRow.appendChild(el('td', null, [block.idx.reduce(function (s, hi) { return s + holes[hi][1]; }, 0)]));
      playerRows.forEach(function (row, pi) { row.appendChild(el('td', { class: 'player' }, [sum(pi, block.idx)])); });
    };
    var sum = function (pi, idx) {
      var total = 0;
      var any = false;
      idx.forEach(function (hi) {
        var v = valueOf(pi, hi);
        if (typeof v === 'number') { total += v; any = true; }
      });
      return any ? total : '·';
    };

    var showSubs = blocks.length > 1;
    blocks.forEach(function (b) { addBlock(b, showSubs); });
    var all = holes.map(function (_, i) { return i; });
    headRow.appendChild(el('th', { scope: 'col' }, ['Total']));
    parRow.appendChild(el('td', null, [holes.reduce(function (s, h) { return s + h[1]; }, 0)]));
    playerRows.forEach(function (row, pi) { row.appendChild(el('td', { class: 'player' }, [sum(pi, all)])); });

    var anyHandicap = data.p.some(function (p) { return p[1] !== 0; });
    var toggle = null;
    if (anyHandicap) {
      var btn = function (value, label) {
        var b = el('button', { type: 'button', 'aria-pressed': String(basis === value) }, [label]);
        b.addEventListener('click', function () { render(data, value); });
        return b;
      };
      toggle = el('div', { class: 'basis', role: 'group', 'aria-label': 'Scoring basis' }, [btn('gross', 'Gross'), btn('net', 'Net')]);
    }

    var meta = [data.t ? data.t + ' tees' : null, holes.length + ' holes', formatDate(data.d), basis === 'net' ? 'Net scores' : 'Gross scores'].filter(Boolean).join(' · ');
    var head = el('div', { class: 'card-head' }, [el('div', null, [el('h1', null, [data.c]), el('p', { class: 'meta', style: 'margin-bottom:0' }, [meta])])]);
    if (toggle) head.appendChild(toggle);

    var table = el('table', { class: 'score' }, [
      el('caption', { class: 'sr-only' }, ['Scorecard, ' + basis]),
      el('thead', null, [headRow]),
      el('tbody', null, [parRow].concat(playerRows)),
    ]);

    var games = el('div', { class: 'games' }, data.g.map(function (g) {
      return el('section', { class: 'game' }, [
        el('h2', null, [g[0] + ' · ' + (g[1] === 'net' ? 'Net' : 'Gross')]),
        el('p', { class: 'headline' }, [g[2]]),
      ].concat(g[3].map(function (line) { return el('p', null, [line]); })));
    }));

    root.replaceChildren(head, el('div', { class: 'scroller' }, [table]), games);
    document.title = data.c + ' scorecard — Birdies & Bets';
  }

  function show() {
    var data = decode(location.hash);
    if (!data) return broken();
    render(data, data.b);
  }

  window.addEventListener('hashchange', show);
  show();
})();
