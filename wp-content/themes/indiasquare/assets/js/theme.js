/* IndiaSquare theme script */
(function () {
  var D = window.ISQ || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var store = function (type) { try { var s = window[type]; s.setItem('_isq', '1'); s.removeItem('_isq'); return s; } catch (e) { return null; } };

  /* ---------------- live schedule, countdown, local times */
  var sessions = D.sessions || [];
  var pre = (D.pre || 0) * 60000;
  function fmtTime(ms, tz) {
    try { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch (e) { return new Date(ms).toLocaleTimeString(); }
  }
  function state() {
    var now = Date.now(), next = null;
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (now >= s.s - pre && now <= s.e) return { live: D.mode !== 'off', s: s };
      if (!next && s.s > now) next = s;
    }
    return { live: D.mode === 'live', s: next };
  }
  function dayDiff(ms) {
    var k = function (t) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: D.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t); } catch (e) { var d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); } };
    var p = function (s) { var a = s.split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); };
    return Math.round((p(k(ms)) - p(k(Date.now()))) / 864e5);
  }
  function label() {
    var st = state();
    if (st.live) return 'Live now';
    if (!st.s) return 'Celebrated';
    var d = dayDiff(st.s.s);
    var t = fmtTime(st.s.s, D.tz) + ' ' + (D.tzAbbr || '');
    return d > 1 ? 'Up next · ' + d + ' days to go' : d === 1 ? 'Tomorrow night · ' + t : 'Tonight · ' + t;
  }
  var localTz = '';
  try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  function tick() {
    var l = label(), st = state();
    $$('[data-countdown]').forEach(function (e) { e.textContent = l; });
    $$('[data-live-badge]').forEach(function (e) { e.hidden = !st.live; });
    $$('[data-live-text]').forEach(function (e) { e.textContent = st.live ? 'LIVE NOW' : 'LIVE ON EVENT NIGHTS'; });
    $$('[data-live-pill]').forEach(function (e) { e.classList.toggle('is-live', !!st.live); });
    $$('[data-stream-chip]').forEach(function (e) {
      var over = !st.s && !st.live, txt;
      if (st.live) txt = 'Streaming live now — watch';
      else if (over) txt = 'Live stream returns next Navratri';
      else {
        var d = dayDiff(st.s.s);
        var t = fmtTime(st.s.s, D.tz) + ' ' + (D.tzAbbr || '');
        txt = d > 1 ? 'Streaming live in ' + d + ' days' : d === 1 ? 'Streaming live tomorrow · ' + t : 'Streaming live tonight · ' + t;
      }
      e.textContent = txt;
    });
  }
  if (sessions.length || D.mode === 'live') { tick(); setInterval(tick, 30000); }
  if (localTz && D.tz && localTz !== D.tz) {
    $$('[data-local-time]').forEach(function (e) { e.textContent = 'Your time: ' + new Date(+e.getAttribute('data-local-time')).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }); });
    $$('[data-tz-local]').forEach(function (e) { e.textContent = 'Your times are shown below each date.'; });
  }

  /* ---------------- live player */
  var player = $('#isq-player');
  function fsExit() {
    if (!player) return;
    player.classList.remove('isq-fs-on'); document.body.classList.remove('isq-lock', 'isq-fs-mode');
  }
  $$('[data-fs]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!player) return;
      var req = player.requestFullscreen || player.webkitRequestFullscreen;
      if (req) {
        try { var r = req.call(player); if (r && r.catch) r.catch(function () { player.classList.add('isq-fs-on'); document.body.classList.add('isq-lock', 'isq-fs-mode'); }); return; } catch (e) {}
      }
      player.classList.add('isq-fs-on'); document.body.classList.add('isq-lock', 'isq-fs-mode'); // iPhone: on-page full screen
    });
  });
  $$('[data-fs-exit]').forEach(function (b) { b.addEventListener('click', fsExit); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fsExit(); });
  /* share: native share sheet on phones, otherwise jump to the share buttons */
  var ns = $('[data-native-share]');
  if (ns && navigator.share) {
    ns.hidden = false;
    ns.addEventListener('click', function () { navigator.share({ title: document.title, text: ns.getAttribute('data-text'), url: ns.getAttribute('data-url') }).catch(function () {}); });
  }
  $$('[data-share-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (navigator.share && ns) { navigator.share({ title: document.title, text: ns.getAttribute('data-text'), url: ns.getAttribute('data-url') }).catch(function () {}); return; }
      var box = document.getElementById('share');
      if (box) { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); box.style.boxShadow = '0 0 0 4px #C82A85'; setTimeout(function () { box.style.boxShadow = ''; }, 1600); }
    });
  });
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), done = function () { var o = b.textContent; b.textContent = 'Link copied ✓'; setTimeout(function () { b.textContent = o; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else { prompt('Copy this link', t); }
    });
  });

  /* ---------------- scroll reveal + nav */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .12 });
    $$('main section').slice(1).forEach(function (sct) { sct.classList.add('rv'); io.observe(sct); });
  }
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) { $$('.rise').forEach(function (el) { el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise'); }); } });
  $$('.v2-nav a').forEach(function (a) { a.addEventListener('click', function () { var t = document.getElementById('navt'); if (t) t.checked = false; }); });

  /* ---------------- gallery tabs */
  var tabs = $$('[data-tab]');
  function pick(name) {
    tabs.forEach(function (x) { var on = x.getAttribute('data-tab') === name; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-tab')); }); });
  var qs = new URLSearchParams(location.search);
  if (tabs.length && qs.get('tab')) pick(qs.get('tab'));

  /* ---------------- directory filter */
  var q = document.getElementById('dq');
  if (q && !document.getElementById('isq-map')) {
    var cat = 'All', cards = $$('[data-biz]'), chips = $$('[data-cat]');
    var count = document.getElementById('dir-count'), empty = document.getElementById('dir-empty');
    var apply = function () {
      var s = q.value.trim().toLowerCase(), n = 0;
      cards.forEach(function (c) { var ok = (cat === 'All' || c.getAttribute('data-cat-of') === cat) && (!s || c.getAttribute('data-biz').indexOf(s) > -1); c.hidden = !ok; if (ok) n++; });
      if (count) count.textContent = n; if (empty) empty.hidden = n > 0;
    };
    q.addEventListener('input', apply);
    chips.forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-cat'); chips.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); apply(); }); });
    var clr = document.getElementById('dir-clear');
    var pre0 = new URLSearchParams(location.search).get('bcat');
    if (pre0) chips.forEach(function (b) { if (b.getAttribute('data-cat') === pre0) b.click(); });
    if (clr) clr.addEventListener('click', function () { q.value = ''; cat = 'All'; chips.forEach(function (x) { var on = x.getAttribute('data-cat') === 'All'; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }); apply(); });
  }

  /* ---------------- donation amount chips (page + popup, WPForms or built-in) */
  $$('[aria-label="Choose an amount"]').forEach(function (group) {
    var scope = group.parentElement;
    var achips = $$('[data-amt]', group);
    var input = function () { return $('.isq-amount input', scope) || $('input.isq-amount', scope); };
    var setBtn = function (v) {
      var b = $('.isq-form-donate button[type=submit]', scope);
      if (!b) return;
      var span = $('span', b), txt = 'Donate $' + (v || '') + ' securely';
      if (span) span.textContent = txt; else b.textContent = txt;
      b.setAttribute('data-alt-text', 'Sending…');
    };
    var set = function (v, fromInput) {
      var i = input();
      if (i && !fromInput) { i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }
      achips.forEach(function (x) { var on = x.getAttribute('data-amt') === String(v); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      setBtn(v);
    };
    achips.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-amt')); }); });
    var i0 = input();
    if (i0) { if (!i0.value) i0.value = 101; set(i0.value, true); i0.addEventListener('input', function () { set(i0.value, true); }); }
  });

  /* ---------------- modals */
  var lastFocus = null;
  function openModal(m) {
    if (!m) return false;
    lastFocus = document.activeElement;
    m.hidden = false; document.body.classList.add('isq-lock');
    var f = $('input:not([type=hidden]):not([tabindex="-1"]), button.chip.on, button', $('.isq-modal-box', m) || m);
    setTimeout(function () { try { (f || m).focus({ preventScroll: true }); } catch (e) {} }, 60);
    return true;
  }
  function closeModal(m) {
    m.hidden = true;
    if (!$$('.isq-modal').some(function (x) { return !x.hidden; })) document.body.classList.remove('isq-lock');
    $$('iframe', m).forEach(function (f) { if (m.id === 'isq-video-modal') f.remove(); });
    if (m.onclosed) m.onclosed();
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  $$('.isq-modal').forEach(function (m) { $$('[data-close]', m).forEach(function (c) { c.addEventListener('click', function () { closeModal(m); }); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.isq-modal').forEach(function (m) { if (!m.hidden) closeModal(m); }); });
  var donateModal = document.getElementById('isq-donate-modal'), cbModal = document.getElementById('isq-callback-modal');
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-open], a[href$="#donate-popup"], a[href$="#callback"]') : null;
    if (!t) return;
    var which = t.getAttribute('data-open') || (/#callback$/.test(t.getAttribute('href') || '') ? 'callback' : 'donate');
    var m = which === 'callback' ? cbModal : donateModal;
    if (m && openModal(m)) e.preventDefault();
  });
  var sent = qs.get('isq_sent') || qs.get('isq_form');
  if (sent === 'callback' && cbModal && (location.hash.indexOf('popup') > -1)) openModal(cbModal);
  if (sent === 'donate' && donateModal && (location.hash.indexOf('popup') > -1)) openModal(donateModal);
  if (donateModal && (qs.get('donate') === '1' || location.hash === '#donate-popup')) openModal(donateModal);
  else if (donateModal && D.popup && D.popup.enabled && D.popup.auto && !sent) {
    var f = D.popup.freq, key = 'isqDonatePopup', ok = true, now = Date.now();
    var ss = store('sessionStorage'), ls = store('localStorage');
    if (f === 'session' && ss) ok = !ss.getItem(key);
    if ((f === 'day' || f === 'week') && ls) { var last = +ls.getItem(key) || 0; ok = now - last > (f === 'day' ? 864e5 : 6048e5); }
    if (ok) setTimeout(function () {
      if ($$('.isq-modal').some(function (x) { return !x.hidden; })) return;
      openModal(donateModal);
      if (ss) ss.setItem(key, '1'); if (ls) ls.setItem(key, String(now));
    }, (D.popup.delay || 0) * 1000);
  }

  /* ---------------- video archive */
  var vm = document.getElementById('isq-video-modal');
  $$('.isq-vcard').forEach(function (b) {
    b.addEventListener('click', function () {
      var list = $('.isq-video-list', vm); list.innerHTML = '';
      $('#isq-video-title').textContent = b.getAttribute('data-title');
      JSON.parse(b.getAttribute('data-videos') || '[]').forEach(function (src) {
        var f = document.createElement('iframe'); f.src = src; f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media; web-share'; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allowFullscreen = true; f.loading = 'lazy'; f.title = b.getAttribute('data-title'); list.appendChild(f);
      });
      openModal(vm);
    });
  });

  /* ---------------- sticky header: compact + shadow once the page scrolls */
  var hdr = $('.isq-hdr');
  if (hdr) {
    var stuck = function () { hdr.classList.toggle('is-stuck', (window.scrollY || window.pageYOffset) > 40); };
    window.addEventListener('scroll', stuck, { passive: true }); stuck();
    // Close the mobile menu after picking a link.
    $$('.v2-nav a', hdr).forEach(function (a) { a.addEventListener('click', function () { var t = document.getElementById('navt'); if (t) t.checked = false; }); });
  }

  /* ---------------- photo lightbox + sponsor ad viewer (prev/next, swipe, arrow keys) */
  var lb = document.getElementById('isq-lightbox');
  if (lb) {
    var lbImg = $('.isq-lb-img', lb), lbCap = $('.isq-lb-cap', lb), lbPrev = $('.isq-lb-prev', lb), lbNext = $('.isq-lb-next', lb);
    var set = [], idx = 0, pausedMarquee = null;
    var show = function (i) {
      if (!set.length) return;
      idx = (i + set.length) % set.length;
      lbImg.src = set[idx].src; lbImg.alt = set[idx].alt;
      lbCap.textContent = set[idx].cap + (set.length > 1 ? '  ·  ' + (idx + 1) + ' / ' + set.length : '');
      lbPrev.hidden = lbNext.hidden = set.length < 2;
    };
    var openSet = function (items, i, marquee) {
      set = items; show(i);
      if (marquee) { pausedMarquee = marquee; marquee.classList.add('is-paused'); }
      openModal(lb);
    };
    lb.onclosed = function () {
      if (pausedMarquee) { pausedMarquee.classList.remove('is-paused'); pausedMarquee = null; }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    };
    lbPrev.addEventListener('click', function () { show(idx - 1); });
    lbNext.addEventListener('click', function () { show(idx + 1); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden || set.length < 2) return;
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 45 && set.length > 1) show(idx + (dx < 0 ? 1 : -1));
    });
    // Gallery photos: every photo in the same album/panel opens as one set (prev / next / swipe / arrow keys).
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('[data-lightbox]') : null;
      if (!a) return;
      e.preventDefault();
      var scope = a.closest('[data-panel]') || a.closest('section') || document.body, items = [], at = 0, seen = {};
      $$('[data-lightbox]', scope).forEach(function (x) {
        if (x.closest('[hidden]')) return;
        var href = x.getAttribute('href'); if (!href || seen[href]) return; seen[href] = 1;
        var im = $('img', x) || {}, fc = $('figcaption', x);
        if (x === a) at = items.length;
        items.push({ src: href, alt: im.alt || '', cap: (fc && fc.textContent.trim()) || im.alt || '' });
      });
      openSet(items, at);
    });
    // Sponsor ads everywhere (home marquee, grand sponsors, sponsors page, gallery souvenir tab).
    var capOf = function (img) { return (img.alt || '').replace(/^Sponsor ad:\s*/i, '').replace(/\s+ad$/i, ''); };
    document.addEventListener('click', function (e) {
      var ad = e.target.closest ? e.target.closest('.v2-ad') : null;
      if (!ad || !$('img', ad) || (e.target.closest('a') && !e.target.closest('a').classList.contains('v2-ad'))) return;
      e.preventDefault();
      var scope = ad.closest('section') || document.body, seen = {}, items = [], at = 0, src = $('img', ad).currentSrc || $('img', ad).src;
      $$('.v2-ad img', scope).forEach(function (im) {
        var s = im.currentSrc || im.src; if (seen[s]) return; seen[s] = 1;
        if (s === src) at = items.length;
        items.push({ src: s, alt: im.alt || '', cap: capOf(im) });
      });
      openSet(items, at, ad.closest('.v2-marquee'));
    });
  }
})();
