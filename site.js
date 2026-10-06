/* Greygate Strategy presentation — shared behaviour (vanilla JS, no build step) */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- tiny persistence helper (works on file:// and hosted) ---------- */
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('gg-strategy:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('gg-strategy:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- page ready (drives CSS entrance transitions) ---------- */
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('ready'); }); });

  /* ---------- custom cursor (desktop pointer only) ---------- */
  if (fine) {
    root.classList.add('fine');
    var cur = $('#cursor');
    if (cur) {
      var x = -100, y = -100, queued = false;
      var paint = function () {
        cur.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
        queued = false;
      };
      addEventListener('mousemove', function (e) {
        x = e.clientX; y = e.clientY; cur.classList.add('on');
        if (!queued) { queued = true; requestAnimationFrame(paint); }
      }, { passive: true });
      document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
      document.addEventListener('pointerover', function (e) {
        var t = e.target;
        cur.classList.toggle('hover', !!(t.closest && t.closest('a,button,[role="checkbox"],[contenteditable="true"]')));
      });
    }
  }

  /* ---------- menu ---------- */
  var burger = $('.burger'), menu = $('#menu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    if (menu) {
      menu.setAttribute('aria-hidden', String(!open));
      if (open) { var first = $('a', menu); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50); }
    }
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target === menu) setMenu(false); });
  }

  /* ---------- page-to-page fade ---------- */
  function go(href) {
    root.classList.add('leaving');
    setTimeout(function () { location.href = href; }, reduce ? 0 : 260);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin && location.protocol !== 'file:') return;
    if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'file:') return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    if (url.pathname === location.pathname && !url.hash) { setMenu(false); window.scrollTo(0, 0); return; }
    go(a.href);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('leaving'); });

  /* ---------- keyboard: ← → move through the agenda, Esc goes up ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t.closest && t.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'Escape') {
      if (root.classList.contains('menu-open')) { setMenu(false); if (burger) burger.focus(); }
      else if (document.body.dataset.up) go(document.body.dataset.up);
      return;
    }
    if (root.classList.contains('menu-open')) return;
    var link = null;
    if (e.key === 'ArrowRight') link = $('a[rel="next"]');
    if (e.key === 'ArrowLeft') link = $('a[rel="prev"]');
    if (link) { e.preventDefault(); go(link.href); }
  });

  /* ---------- reveal on scroll ---------- */
  var rv = $$('.rv');
  if (rv.length) {
    if (reduce || !('IntersectionObserver' in window)) { rv.forEach(function (n) { n.classList.add('in'); }); }
    else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rv.forEach(function (n, i) { n.style.transitionDelay = ((i % 4) * 60) + 'ms'; io.observe(n); });
    }
  }

  /* ---------- hero image: gentle scroll parallax ---------- */
  var heroImg = $('.hero-media img');
  if (heroImg && !reduce) {
    var ticking = false;
    var par = function () {
      var sy = window.scrollY;
      if (sy < innerHeight * 1.2) heroImg.style.transform = 'scale(1.1) translate3d(0,' + (sy * 0.05).toFixed(1) + 'px,0)';
      ticking = false;
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
  }

  /* ---------- header fade: off whenever the white finale is under the header ---------- */
  var topfade = $('#topfade'), finaleEl = $('.finale');
  if (topfade && finaleEl) {
    var tf = false;
    var chk = function () { topfade.classList.toggle('off', finaleEl.getBoundingClientRect().top < 90); tf = false; };
    addEventListener('scroll', function () { if (!tf) { tf = true; requestAnimationFrame(chk); } }, { passive: true });
    chk();
  }

  /* ---------- persisted checkboxes (e.g. "what leadership leaves with") ---------- */
  $$('.check[data-k]').forEach(function (c) {
    var k = c.dataset.k;
    var on = !!store.get('check:' + k);
    c.setAttribute('aria-checked', String(on));
    var toggle = function () {
      on = !on; c.setAttribute('aria-checked', String(on)); store.set('check:' + k, on);
    };
    c.addEventListener('click', toggle);
    c.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
  });

  /* ---------- decision & action log (Appendix C) ---------- */
  var logEl = $('#log');
  if (logEl) {
    var body = $('tbody', logEl);
    var COLS = ['d', 'o', 'dl', 's'];
    var rows = store.get('log') || [];
    while (rows.length < 6) rows.push({ d: '', o: '', dl: '', s: '' });
    var save = function () { store.set('log', rows); };
    var render = function () {
      body.innerHTML = '';
      rows.forEach(function (r, i) {
        var tr = document.createElement('tr');
        var n = document.createElement('td'); n.textContent = i + 1; tr.appendChild(n);
        COLS.forEach(function (c) {
          var td = document.createElement('td');
          td.contentEditable = 'true'; td.spellcheck = false; td.dataset.c = c;
          td.setAttribute('aria-label', c === 'd' ? 'Decision or action, row ' + (i + 1) : c === 'o' ? 'Owner, row ' + (i + 1) : c === 'dl' ? 'Deadline, row ' + (i + 1) : 'Status, row ' + (i + 1));
          td.textContent = r[c] || '';
          td.addEventListener('input', function () { r[c] = td.textContent; save(); });
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    };
    render();
    var add = $('#log-add'), copy = $('#log-copy'), clear = $('#log-clear');
    if (add) add.addEventListener('click', function () { rows.push({ d: '', o: '', dl: '', s: '' }); save(); render(); });
    if (clear) clear.addEventListener('click', function () {
      if (confirm('Clear every row of the Decision & Action Log in this browser?')) {
        rows = []; while (rows.length < 6) rows.push({ d: '', o: '', dl: '', s: '' }); save(); render();
      }
    });
    if (copy) copy.addEventListener('click', function () {
      var txt = ['No.\tDecision / Action\tOwner\tDeadline\tStatus'].concat(rows.map(function (r, i) {
        return [i + 1, r.d, r.o, r.dl, r.s].join('\t');
      })).join('\n');
      var done = function () { var o = copy.textContent; copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = o; }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
      else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
    });
  }
})();
