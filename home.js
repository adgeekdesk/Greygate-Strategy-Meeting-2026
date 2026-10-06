/* HOME — agenda hero page engine.
   requestAnimationFrame-driven (no scroll-event animation), vanilla JS.
   Phase 1  scrollY 0 → vh        black panel slides up over the fixed video
   Phase 2  scrollY vh → vh+max   panel fixed, inner wrapper scrolls; cards scale in/out
   Outro    after that            white overlay, product info rises, "begin" pill scales in */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none), (pointer: coarse)').matches;

  var spacer = $('#scroll-spacer'), canvas = $('#main-canvas');
  var vidL = $('#vid-left'), vidR = $('#vid-right');
  var panel = $('#black-panel'), wrap = $('#panel-wrap'), grid = $('#grid');
  var overlay = $('#outro-overlay'), info = $('#outro-info'), buy = $('#outro-buy'), foot = $('#outro-footer');
  var caption = $('#caption'), sym = $('#circle-symbol'), infoIn = $('#info-inner');
  var tpl = $('#cells');

  var vh = innerHeight, cols = 0, maxScroll = 0, outroOffset = 166, cards = [];

  /* ---------- scattered-grid layout (from the prompt) ---------- */
  function buildLayout(count, c) {
    var rows = [], idx = 0;
    for (var r = 0; idx < count; r++) {
      var row = new Array(c).fill(-1);
      var a = (r * 2 + (r % 2)) % c;
      row[a] = idx++;
      if (r % 3 === 0 && idx < count) {
        var b = (a + 2) % c; if (b === a) b = (a + 1) % c;
        row[b] = idx++;
      }
      rows.push(row);
    }
    return rows;
  }
  function colsFor() { var w = innerWidth; return w >= 1024 ? 4 : w >= 640 ? 3 : 2; }

  function build() {
    cols = colsFor();
    grid.style.setProperty('--cols', cols);
    grid.innerHTML = '';
    var items = Array.prototype.slice.call(tpl.content.children);
    cards = [];
    buildLayout(items.length, cols).forEach(function (row) {
      row.forEach(function (idx, c) {
        if (idx < 0) { var e = document.createElement('div'); e.className = 'cell empty'; grid.appendChild(e); return; }
        var cell = items[idx].cloneNode(true);
        var card = cell.firstElementChild;
        card.style.transformOrigin = c < cols / 2 ? 'right bottom' : 'left bottom';
        grid.appendChild(cell);
        cards.push({ cell: cell, card: card, top: 0, h: 0, s: -1 });
      });
    });
    measure();
  }

  function measure() {
    vh = innerHeight;
    cards.forEach(function (o) { o.top = o.cell.offsetTop + grid.offsetTop; o.h = o.cell.offsetHeight; o.s = -1; });
    maxScroll = Math.max(0, wrap.offsetHeight - vh);
    spacer.style.height = (vh + maxScroll + 2 * vh) + 'px';
    outroOffset = innerWidth < 640 ? 132 : 166;
    lastSy = -1;
  }

  /* ---------- video: sources, load gate ---------- */
  function pickSources() {
    var portrait = canvas.clientHeight > canvas.clientWidth;
    var want = portrait ? 'tall' : 'wide';
    if (vidL.dataset.mode !== want) {
      vidL.dataset.mode = want;
      vidL.src = portrait ? vidL.dataset.tall : vidL.dataset.wide;
      vidL.poster = portrait ? vidL.dataset.posterTall : vidL.dataset.posterWide;
      vidL.load();
    }
  }
  function revealCanvas() { canvas.classList.add('ready'); }
  (function loadGate() {
    var n = 0, done = false;
    var ok = function () { if (!done && ++n >= 2) { done = true; revealCanvas(); } };
    [vidL, vidR].forEach(function (v) {
      if (v.readyState >= 2) ok(); else v.addEventListener('loadeddata', ok, { once: true });
    });
    setTimeout(function () { if (!done) { done = true; revealCanvas(); } }, 3500);
  })();

  function show(side) {
    vidL.style.display = side === 'left' ? 'block' : 'none';
    vidR.style.display = side === 'right' ? 'block' : 'none';
  }

  /* ---------- desktop: scrub by cursor X ---------- */
  var cursorX = innerWidth / 2, active = 'right';
  if (!touch) addEventListener('mousemove', function (e) { cursorX = e.clientX; }, { passive: true });

  function scrub() {
    if (touch || window.scrollY > vh) return;
    var W = canvas.clientWidth || innerWidth, c = W / 2, dz = Math.max(30, W * 0.05);
    var side = active, prog = 0;
    if (cursorX < c - dz) { side = 'right'; prog = (c - dz - cursorX) / (c - dz); }
    else if (cursorX > c + dz) { side = 'left'; prog = (cursorX - (c + dz)) / (W - (c + dz)); }
    if (side !== active) { active = side; show(side); }
    var v = side === 'right' ? vidR : vidL, other = side === 'right' ? vidL : vidR;
    var dur = v.duration;
    if (!isFinite(dur) || dur <= 0) return;
    var target = prog > 0 ? clamp(prog, 0, 1) * (dur - 0.05) : 0;
    /* only seek once the previous seek has finished — keeps scrubbing smooth */
    if (!v.seeking && Math.abs(v.currentTime - target) > 0.012) v.currentTime = target;
    if (!other.seeking && other.currentTime > 0.02) other.currentTime = 0;
  }

  /* ---------- touch / tablet: alternate autoplay ---------- */
  function startAutoplay() {
    var play = function (side) {
      show(side);
      var v = side === 'left' ? vidL : vidR;
      try { v.currentTime = 0; } catch (e) {}
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    };
    vidL.addEventListener('ended', function () { play('right'); });
    vidR.addEventListener('ended', function () { play('left'); });
    play('left');
  }

  /* ---------- circle symbol (throttled to 80 ms) ---------- */
  var SYMS = ['6', '10', '%', '/', '^^', '$'], lastSym = 0;
  function tickSym() {
    var now = performance.now();
    if (now - lastSym > 80) { lastSym = now; sym.textContent = SYMS[(Math.random() * SYMS.length) | 0]; }
  }

  /* ---------- per-frame render ---------- */
  var lastSy = -1;
  function render(sy) {
    var maxY = vh + maxScroll, eff = Math.min(sy, maxY), offset = vh - eff;

    if (sy <= vh) {
      panel.style.transform = 'translate3d(0,' + (vh - sy) + 'px,0)';
      wrap.style.transform = 'translate3d(0,0,0)';
    } else {
      panel.style.transform = 'translate3d(0,0,0)';
      wrap.style.transform = 'translate3d(0,' + (-(eff - vh)) + 'px,0)';
    }

    /* video stage is hidden once the panel has fully covered it */
    var hidden = sy > vh;
    canvas.style.visibility = hidden ? 'hidden' : 'visible';
    caption.classList.toggle('p2', sy > vh * 0.55 && sy <= vh * 1.15);
    caption.classList.toggle('p3', sy > vh * 1.15);

    var p = clamp((sy - maxY) / Math.max(1, vh - 100), 0, 1);
    grid.style.pointerEvents = p < 0.5 ? 'auto' : 'none';

    for (var i = 0; i < cards.length; i++) {
      var o = cards[i], top = o.top + offset, bottom = top + o.h, s = 0;
      if (!(bottom <= 0 || top >= vh)) {
        var enter = Math.min(1, (vh - top) / (vh * 0.6));
        var exit = Math.min(1, bottom / (vh * 0.4));
        s = Math.max(0, Math.min(enter, exit));
      }
      s = Math.round(s * 1000) / 1000;
      if (s !== o.s) {
        o.s = s;
        o.card.style.transform = 'scale(' + s + ')';
        if (o.card.tagName === 'A') { o.card.tabIndex = s > 0.5 ? 0 : -1; }
      }
    }

    /* outro */
    /* product info steps aside while cards scroll beneath it, returns for the outro */
    var away = sy < vh * 0.9 ? 1 : clamp(1 - (sy - vh * 0.9) / (vh * 0.3), 0, 1);
    infoIn.style.opacity = Math.max(away, clamp(p * 2, 0, 1));
    overlay.style.opacity = p;
    info.style.transform = 'translate3d(0,' + (-p * outroOffset) + 'px,0)';
    buy.style.transform = 'scale(' + p + ')';
    buy.style.pointerEvents = p > 0.9 ? 'auto' : 'none';
    buy.tabIndex = p > 0.9 ? 0 : -1;
    foot.style.opacity = p;
  }

  function frame() {
    var sy = window.scrollY || document.documentElement.scrollTop || 0;
    if (sy !== lastSy) {
      render(sy);
      if (lastSy !== -1) tickSym();
      lastSy = sy;
    }
    scrub();
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */
  function boot() {
    show('right');
    pickSources();
    build();
    if (touch && !reduce) startAutoplay();
    requestAnimationFrame(frame);
  }
  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      pickSources();
      if (colsFor() !== cols) build(); else measure();
    }, 120);
  });
  addEventListener('load', measure);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
