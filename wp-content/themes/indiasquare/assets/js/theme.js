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
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var nativeShare = function () {
    var u = ns.getAttribute('data-url'), t = ns.getAttribute('data-text');
    return navigator.share({ title: ns.getAttribute('data-title') || document.title, text: t + ' ' + u, url: u }).catch(function () {});
  };
  if (ns && navigator.share && touch) {
    ns.hidden = false;
    ns.addEventListener('click', nativeShare);
  }
  $$('[data-share-open]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (navigator.share && ns && touch) { nativeShare(); return; }
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
      var n = parseFloat(v), ok = isFinite(n) && n >= 1 && n <= 50000;
      var span = $('span', b), txt = ok ? 'Donate $' + (Math.round(n * 100) / 100) + ' securely' : 'Donate securely';
      if (span) span.textContent = txt; else b.textContent = txt;
      b.setAttribute('data-alt-text', 'Sending…');
    };
    var set = function (v, fromInput) {
      var i = input();
      // Form already sent (payment step showing): the chips change the amount on the payment button.
      var pay = $('[data-pay-tpl]', scope.closest('.isq-modal-box, section, .isq-form') || scope);
      if (pay && !i) {
        pay.setAttribute('href', pay.getAttribute('data-pay-tpl').replace(/\{amount\}/g, encodeURIComponent(v)));
        var amt = $('.isq-pay-amt', pay); if (amt) amt.textContent = ' · $' + v;
      }
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

  /* ---------------- donation: go straight to the payment page after the form is sent */
  var autopayDone = false;
  var autopay = function () {
    if (autopayDone) return;
    var a = $('[data-autopay]'); if (!a) return;
    autopayDone = true;
    setTimeout(function () { window.location.assign(a.getAttribute('href')); }, 1200);
  };
  autopay();
  if ('MutationObserver' in window) new MutationObserver(autopay).observe(document.body, { childList: true, subtree: true });

  /* ---------------- WPForms segmented plans: put the price on the right like the built-in cards */
  $$('.isq-seg-field li label').forEach(function (l) {
    if (l.querySelector('.isq-seg-price')) return;
    var t = l.textContent, i = t.lastIndexOf(' — '); if (i < 0) return;
    var n = l.lastChild; if (!n || n.nodeType !== 3) return;
    var txt = n.textContent, j = txt.lastIndexOf(' — '); if (j < 0) return;
    n.textContent = txt.slice(0, j);
    var nm = document.createElement('span'); nm.className = 'isq-seg-name'; l.insertBefore(nm, n); nm.appendChild(n);
    var p = document.createElement('span'); p.className = 'isq-seg-price'; p.textContent = txt.slice(j + 3); l.appendChild(p);
  });

  /* ---------------- donation popup: side image column takes the banner's own shape */
  $$('.isq-pop-artimg').forEach(function (im) {
    var fit = function () {
      if (!im.naturalWidth) return;
      var r = Math.max(0.45, Math.min(1.1, im.naturalWidth / im.naturalHeight));
      var box = im.closest('.isq-modal-box'); if (box) box.style.setProperty('--r', r.toFixed(4));
    };
    if (im.complete) fit(); else im.addEventListener('load', fit);
  });

  /* ---------------- form checks: trim spaces, block whitespace-only, symbols in names, bad phones, negative amounts */
  var RE = {
    person: /^[A-Za-z\u00C0-\u024F\u0900-\u097F][A-Za-z\u00C0-\u024F\u0900-\u097F .'\u2019,-]*$/,
    letters2: /[A-Za-z\u00C0-\u024F\u0900-\u097F].*[A-Za-z\u00C0-\u024F\u0900-\u097F]/,
    word: /[A-Za-z0-9\u00C0-\u024F\u0900-\u097F].*[A-Za-z0-9\u00C0-\u024F\u0900-\u097F]/,
    letter: /[A-Za-z\u00C0-\u024F\u0900-\u097F]/,
    phone: /^[+()\-.\s\d]+$/,
    price: /^(\$?\s?\d{1,3}(,?\d{3})*(\.\d{1,2})?(\s?(\/\s?\w+|obo))?|free|negotiable|call|best offer)$/i
  };
  var formKey = function (f) {
    var c = f.closest('.wpforms-container'), m = c && /isq-wpf-(\w+)/.exec(c.className);
    if (m) return m[1];
    var h = f.querySelector('input[name="isq_form"]'); return h ? h.value : '';
  };
  var fieldKey = function (el) {
    var c = el.closest('.wpforms-field'), m = c && /(?:^|\s)isq-f-(\w+)/.exec(c.className);
    if (m) return m[1];
    m = /^isq\[(\w+?)(?:_(first|last))?\]/.exec(el.name || ''); return m ? m[1] : '';
  };
  var ruleFor = function (form, key, el) {
    if (!key || el.type === 'email' || el.type === 'checkbox' || el.type === 'file' || el.tagName === 'SELECT') return '';
    if (el.closest('.wpforms-field-name') || /_(first|last)\]$/.test(el.name || '') || ['name', 'contact', 'authorizing', 'signature'].indexOf(key) > -1 || (form === 'sponsor' && key === 'title')) return 'person';
    if (key === 'phone') return 'phone';
    if (key === 'amount') return 'amount';
    if (key === 'price') return 'price';
    if (el.type === 'url' || key === 'website') return 'url';
    return 'text';
  };
  var check = function (rule, v, req, el) {
    v = v.replace(/\s+/g, ' ').trim();
    if (!v) return req ? 'This field is required.' : '';
    if (rule === 'person' && (!RE.person.test(v) || !RE.letters2.test(v))) return 'Please use letters only (spaces, hyphens and apostrophes are fine).';
    if (rule === 'phone') { var d = v.replace(/\D/g, ''); if (!RE.phone.test(v) || d.length < 10 || d.length > 15) return 'Please enter a valid phone number (10–15 digits).'; }
    if (rule === 'amount') { var n = parseFloat(v), min = Math.max(1, parseFloat(el.getAttribute('min')) || 1); if (!isFinite(n) || n < min || n > 50000) return 'Please enter an amount between $' + min + ' and $50,000.'; }
    if (rule === 'price' && !RE.price.test(v)) return 'Please enter a price like $1,200, or “Free” / “Negotiable”.';
    if (rule === 'url' && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v)) return 'Please enter a valid website address.';
    if (rule === 'text' && (!RE.word.test(v) || !RE.letter.test(v))) return 'Please enter real text, not only numbers or symbols.';
    return '';
  };
  var showErr = function (el, msg) {
    var wrap = el.closest('.wpforms-field-row-block') || el.closest('.wpforms-field') || el.parentElement;
    var old = wrap.querySelector('.isq-ferr'); if (old) old.remove();
    el.classList.toggle('isq-invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (!msg) return;
    var em = document.createElement('em'); em.className = 'isq-ferr'; em.setAttribute('role', 'alert'); em.textContent = msg;
    el.insertAdjacentElement('afterend', em);
  };
  var fieldsOf = function (f) { return $$('input[type=text], input[type=tel], input[type=number], input[type=url], input:not([type]), textarea', f).filter(function (el) { return !el.closest('.isq-hp') && !el.closest('[data-field-type]:not([class*="isq-f-"])') && !el.disabled && el.offsetParent !== null; }); };
  var validateForm = function (f) {
    var fk = formKey(f), first = null;
    fieldsOf(f).forEach(function (el) {
      el.value = el.value.replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/g, '');
      var rule = ruleFor(fk, fieldKey(el), el); if (!rule) return;
      var req = el.required || el.classList.contains('wpforms-field-required');
      var msg = check(rule, el.value, req, el);
      showErr(el, msg); if (msg && !first) first = el;
    });
    if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return !first;
  };
  var ourForm = function (f) { return f && (f.classList.contains('isq-native') || !!f.closest('.isq-form') || !!f.closest('[class*="isq-wpf-"]')); };
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!ourForm(f)) return;
    if (!validateForm(f)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.wpforms-submit, button[type=submit], input[type=submit]'); if (!b) return;
    var f = b.form; if (!ourForm(f)) return;
    if (!validateForm(f)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('focusout', function (e) {
    var el = e.target; if (!el.matches || !el.matches('input, textarea') || !ourForm(el.form)) return;
    if (['text', 'tel', 'url', 'number', 'textarea', ''].indexOf(el.type || '') < 0 && el.tagName !== 'TEXTAREA') return;
    el.value = el.value.replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/g, '');
    if (el.classList.contains('isq-invalid')) { var r = ruleFor(formKey(el.form), fieldKey(el), el); if (r) showErr(el, check(r, el.value, el.required || el.classList.contains('wpforms-field-required'), el)); }
  });
  document.addEventListener('input', function (e) { var el = e.target; if (el.classList && el.classList.contains('isq-invalid')) showErr(el, ''); });
  // Helpful keyboards / limits.
  $$('.isq-f-phone input, input[name="isq[phone]"]').forEach(function (el) { el.setAttribute('inputmode', 'tel'); el.setAttribute('autocomplete', 'tel'); if (!el.maxLength || el.maxLength < 0 || el.maxLength > 20) el.maxLength = 20; });
  $$('.isq-f-amount input, input.isq-amount, input[name="isq[amount]"]').forEach(function (el) { if (!el.min || +el.min < 1) el.min = 1; el.max = 50000; el.step = 'any'; });

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
