/* IndiaSquare — street map, open-now, profile mini-maps, Getting Here map. */
(function () {
  'use strict';
  var C = window.ISQMAP || {};
  var TZ = C.tz || 'America/New_York';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------------- open now (computed in the street's timezone) */
  function now() {
    var o = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    } catch (e) { var d = new Date(); return { d: d.getDay(), m: d.getHours() * 60 + d.getMinutes() }; }
    return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday), m: (+o.hour % 24) * 60 + +o.minute };
  }
  function mins(s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; }
  function fmt(s) {
    var m = mins(s) % 1440;
    if (m === 0) return 'midnight';
    if (m === 720) return 'noon';
    var h = Math.floor(m / 60), mi = m % 60;
    return (h % 12 || 12) + (mi ? ':' + ('0' + mi).slice(-2) : '') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function state(H) {
    if (!H) return null;
    var n = now(), i, s, o, c;
    var y = H[KEYS[(n.d + 6) % 7]] || [];
    for (i = 0; i < y.length; i++) { o = mins(y[i][0]); c = mins(y[i][1]); if (c <= o && n.m < c) return { open: true, until: y[i][1], soon: c - n.m <= 60 }; }
    var t = H[KEYS[n.d]] || [];
    for (i = 0; i < t.length; i++) {
      o = mins(t[i][0]); c = mins(t[i][1]); if (c <= o) c += 1440;
      if (n.m >= o && n.m < c) return { open: true, until: t[i][1], soon: c - n.m <= 60 };
    }
    for (var k = 0; k < 8; k++) {
      s = (H[KEYS[(n.d + k) % 7]] || []).slice().sort(function (a, b) { return mins(a[0]) - mins(b[0]); });
      for (i = 0; i < s.length; i++) {
        if (k > 0 || mins(s[i][0]) > n.m) return { open: false, next: s[i][0], day: k === 0 ? '' : (k === 1 ? 'tomorrow' : NAMES[(n.d + k) % 7]) };
      }
    }
    return { open: false };
  }
  function label(st) {
    if (!st) return ['Hours not listed', 'unk'];
    if (st.open) return [(st.soon ? 'Closing soon' : 'Open now') + ' · until ' + fmt(st.until), st.soon ? 'soon' : 'open'];
    return ['Closed' + (st.next ? ' · opens ' + fmt(st.next) + (st.day ? ' ' + st.day : '') : ''), 'closed'];
  }
  function paint(root) {
    $$('[data-hours]', root).forEach(function (el) {
      var H = null; try { H = JSON.parse(el.getAttribute('data-hours')); } catch (e) {}
      var st = state(H), L = label(st);
      el.textContent = L[0];
      el.className = el.className.replace(/\bis-(open|soon|closed|unk)\b/g, '').trim() + ' is-' + L[1];
      el.setAttribute('data-open', st && st.open ? '1' : '0');
    });
    var tbl = $('.isq-hours');
    if (tbl) { var d = KEYS[now().d]; $$('tr', tbl).forEach(function (r) { r.classList.toggle('is-today', r.getAttribute('data-day') === d); }); }
  }
  paint();

  if (!window.L) return;

  function tiles(map) {
    var t = C.tiles || {};
    L.tileLayer(t.url || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: t.attr || '&copy; OpenStreetMap contributors', subdomains: t.sub || 'abc', maxZoom: 19, detectRetina: true }).addTo(map);
  }
  function strip(map) {
    if (!C.strip) return;
    L.polyline(C.strip, { color: '#DD3399', weight: 14, opacity: 0.16, lineCap: 'round', interactive: false }).addTo(map);
    L.polyline(C.strip, { color: '#DD3399', weight: 3, opacity: 0.55, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(map);
  }
  function wheelOnFocus(map, el) {
    map.scrollWheelZoom.disable();
    el.addEventListener('click', function () { map.scrollWheelZoom.enable(); });
    el.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });
  }
  var GROUPS = C.groups || {};
  function bizIcon(b) {
    var g = (b.groups || ['services'])[0], col = (GROUPS[g] || ['', '#5C7A26'])[1];
    var feat = b.tier === 'featured';
    return L.divIcon({ className: 'isq-pin-wrap', html: '<span class="isq-pin' + (feat ? ' is-feat' : '') + '" style="--c:' + col + '"><b>' + (feat ? '★' : esc((b.name || '?').charAt(0))) + '</b></span>', iconSize: [30, 40], iconAnchor: [15, 38], popupAnchor: [0, -34] });
  }
  var PT = { parking: ['#0099DD', 'P'], transit: ['#994499', 'T'], bike: ['#88AA44', 'B'], accessibility: ['#DD3399', '♿'] };
  function placeIcon(p) {
    var t = PT[p.type] || PT.parking;
    return L.divIcon({ className: 'isq-pin-wrap', html: '<span class="isq-sq" style="--c:' + t[0] + '">' + t[1] + '</span>', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -14] });
  }
  function bizPopup(b) {
    return '<div class="isq-pop"><strong><a href="' + esc(b.url) + '">' + esc(b.name) + '</a></strong><div class="isq-pop-cat">' + esc(b.cat) + '</div>' +
      '<span class="isq-open" data-hours="' + esc(JSON.stringify(b.hours || null)) + '"></span>' +
      (b.cross ? '<div class="isq-pop-addr">' + esc(b.cross) + '</div>' : '') + '<div class="isq-pop-addr">' + esc(b.addr) + '</div>' +
      '<div class="isq-pop-acts"><a href="' + esc(b.url) + '" class="is-main">Profile</a><a href="' + esc(b.dir) + '" target="_blank" rel="noopener">Directions</a>' +
      (b.phone ? '<a href="tel:' + esc(String(b.phone).replace(/[^0-9+]/g, '')) + '">Call</a>' : '') + '</div></div>';
  }
  function placePopup(p) {
    var t = PT[p.type] || PT.parking;
    return '<div class="isq-pop"><strong>' + esc(p.name) + '</strong><div class="isq-pop-cat" style="color:' + t[0] + '">' + esc(p.type) + '</div>' +
      (p.hours ? '<div class="isq-pop-addr"><b>Hours:</b> ' + esc(p.hours) + '</div>' : '') + (p.rates ? '<div class="isq-pop-addr"><b>Rates:</b> ' + esc(p.rates) + '</div>' : '') +
      '<div class="isq-pop-acts"><a href="https://www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lng + '" target="_blank" rel="noopener" class="is-main">Directions</a>' +
      (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(p.link_label || 'More') + '</a>' : '') + '</div></div>';
  }
  function json(id) { var el = document.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } }

  /* ---------------- directory: street map + filters */
  var mapEl = document.getElementById('isq-map');
  var D = json('isq-dir-json');
  if (mapEl && D) {
    var map = L.map(mapEl, { zoomControl: true, tap: true });
    if (+C.zoom) map.setView(C.center, +C.zoom); else map.fitBounds(L.latLngBounds(C.strip).pad(0.08));
    tiles(map); strip(map); wheelOnFocus(map, mapEl);
    var bizLayer = L.layerGroup().addTo(map), placeLayer = L.layerGroup().addTo(map), markers = {};
    D.items.forEach(function (b) {
      if (b.lat == null) return;
      var m = L.marker([b.lat, b.lng], { icon: bizIcon(b), title: b.name, riseOnHover: true, zIndexOffset: b.tier === 'featured' ? 500 : 0 }).bindPopup(bizPopup(b), { maxWidth: 260 });
      m.on('popupopen', function (e) { paint(e.popup.getElement()); hi(b.id); });
      markers[b.id] = m; m.addTo(bizLayer);
    });
    (D.places || []).forEach(function (p) { if (p.lat != null && p.type !== 'accessibility') L.marker([p.lat, p.lng], { icon: placeIcon(p), title: p.name }).bindPopup(placePopup(p)).addTo(placeLayer); });

    var q = $('#dq'), cat = $('#dcat'), open = $('#dopen'), lay = $('#dlayer'), group = '';
    var cards = $$('.isq-biz'), chips = $$('[data-group]'), list = $('#dir-list');
    var count = $('#dir-count'), empty = $('#dir-empty');
    function hi(id) {
      cards.forEach(function (c) { c.classList.toggle('is-hi', +c.getAttribute('data-id') === id); });
      var c = $('.isq-biz[data-id="' + id + '"]');
      if (c && list && getComputedStyle(list).overflowY === 'auto') list.scrollTo({ top: c.offsetTop - list.offsetTop - 12, behavior: 'smooth' });
    }
    function sync() {
      var p = new URLSearchParams(location.search);
      ['q', 'group', 'bcat', 'open'].forEach(function (k) { p.delete(k); });
      if (q.value.trim()) p.set('q', q.value.trim());
      if (group) p.set('group', group);
      if (cat.value) p.set('bcat', cat.value);
      if (open.checked) p.set('open', '1');
      var s = p.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
    }
    function apply(noSync) {
      paint(list);
      var s = q.value.trim().toLowerCase(), n = 0, subs = { on: 0, off: 0 };
      cards.forEach(function (c) {
        var ok = (!group || (' ' + c.getAttribute('data-groups') + ' ').indexOf(' ' + group + ' ') > -1) &&
          (!cat.value || c.getAttribute('data-cat-of') === cat.value) &&
          (!s || c.getAttribute('data-biz').indexOf(s) > -1) &&
          (!open.checked || ($('.isq-open', c) || {}).getAttribute('data-open') === '1');
        c.hidden = !ok;
        var m = markers[c.getAttribute('data-id')];
        if (m) { if (ok) bizLayer.addLayer(m); else bizLayer.removeLayer(m); }
        if (ok) { n++; subs[c.getAttribute('data-pin') ? 'on' : 'off']++; }
      });
      $$('[data-sub]').forEach(function (h) { h.hidden = !subs[h.getAttribute('data-sub')]; });
      count.textContent = n; empty.hidden = n > 0;
      if (!noSync) sync();
    }
    function setGroup(g) {
      group = g;
      chips.forEach(function (x) { var on = x.getAttribute('data-group') === g; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      apply();
    }
    function fit() {
      var pts = []; bizLayer.eachLayer(function (m) { pts.push(m.getLatLng()); });
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.15), { maxZoom: 18 });
    }
    q.addEventListener('input', function () { apply(); });
    cat.addEventListener('change', function () { apply(); });
    open.addEventListener('change', function () { apply(); });
    chips.forEach(function (b) { b.addEventListener('click', function () { setGroup(b.getAttribute('data-group')); }); });
    lay.addEventListener('change', function () { if (lay.checked) map.addLayer(placeLayer); else map.removeLayer(placeLayer); });
    $('#dir-fit').addEventListener('click', fit);
    $('#dir-clear').addEventListener('click', function () { q.value = ''; cat.value = ''; open.checked = false; setGroup(''); });
    function locate(id) {
      var m = markers[id]; if (!m) return;
      if (window.innerWidth < 900) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 18), { animate: true }); m.openPopup();
    }
    cards.forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        if (c.getAttribute('data-pin')) locate(+c.getAttribute('data-id'));
      });
      c.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); locate(+c.getAttribute('data-id')); } });
    });
    var p0 = new URLSearchParams(location.search);
    if (p0.get('q')) q.value = p0.get('q');
    if (p0.get('bcat')) { cat.value = p0.get('bcat'); }
    if (p0.get('open') === '1') open.checked = true;
    if (p0.get('group') && GROUPS[p0.get('group')]) setGroup(p0.get('group')); else apply(true);
    setInterval(function () { apply(true); }, 60000);
  } else {
    setInterval(function () { paint(); }, 60000);
  }

  /* ---------------- profile mini-maps */
  $$('.isq-minimap').forEach(function (el) {
    var lat = +el.getAttribute('data-lat'), lng = +el.getAttribute('data-lng');
    if (!lat) return;
    var m = L.map(el, { zoomControl: false, attributionControl: true, dragging: !L.Browser.mobile, tap: false }).setView([lat, lng], 17);
    tiles(m); strip(m); wheelOnFocus(m, el);
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    var b = { name: el.getAttribute('data-name'), groups: [el.getAttribute('data-group') || 'services'], tier: el.getAttribute('data-tier') };
    L.marker([lat, lng], { icon: bizIcon(b), title: b.name, keyboard: false }).addTo(m);
    try { (JSON.parse(el.getAttribute('data-near') || '[]')).forEach(function (n) {
      L.marker([n.lat, n.lng], { icon: L.divIcon({ className: 'isq-pin-wrap', html: '<span class="isq-dotpin"></span>', iconSize: [12, 12], iconAnchor: [6, 6] }), title: n.name }).bindTooltip(esc(n.name)).on('click', function () { location.href = n.url; }).addTo(m);
    }); } catch (e) {}
  });

  /* ---------------- Getting Here map */
  var gEl = document.getElementById('isq-gh-map'), G = json('isq-gh-json');
  if (gEl && G) {
    var gm = L.map(gEl).setView([40.7338, -74.0640], 16);
    tiles(gm); strip(gm); wheelOnFocus(gm, gEl);
    var byType = {}, pm = {}, pts = [];
    G.places.forEach(function (p) {
      if (p.lat == null) return;
      var mk = L.marker([p.lat, p.lng], { icon: placeIcon(p), title: p.name }).bindPopup(placePopup(p));
      (byType[p.type] = byType[p.type] || L.layerGroup().addTo(gm)).addLayer(mk);
      pm[p.id] = mk; pts.push([p.lat, p.lng]);
    });
    (G.items || []).forEach(function (b) { L.marker([b.lat, b.lng], { icon: bizIcon(b), title: b.name }).bindPopup(bizPopup(b)).on('popupopen', function (e) { paint(e.popup.getElement()); }).addTo(gm); });
    (C.strip || []).forEach(function (p) { pts.push(p); });
    if (pts.length) gm.fitBounds(L.latLngBounds(pts).pad(0.12));
    var pchips = $$('[data-ptype]');
    pchips.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-ptype');
        pchips.forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        Object.keys(byType).forEach(function (k) { if (!t || k === t) gm.addLayer(byType[k]); else gm.removeLayer(byType[k]); });
        $$('[data-ptype-of]').forEach(function (g) { g.hidden = !!t && g.getAttribute('data-ptype-of') !== t; });
      });
    });
    $$('[data-place]').forEach(function (c) {
      var go = function () { var mk = pm[c.getAttribute('data-place')]; if (!mk) return; gEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); gm.setView(mk.getLatLng(), 17); mk.openPopup(); };
      c.addEventListener('click', function (e) { if (!e.target.closest('a')) go(); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === c) go(); });
    });
  }
})();
