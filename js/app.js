/*
 * Campaign Map
 * - Everyone sees the map: regions, places, settlements (with shops, people and quests),
 *   quest markers, a logbook and private notes.
 * - The owner opens the site with  #edit  at the end of the address to edit, then presses
 *   Publish (needs the owner's GitHub key, which only lives in the owner's browser).
 */
(() => {
  'use strict';

  // ===== Settings =====
  const LOCK_BOUNDS = [[-80.3468, 32.6128], [-79.4618, 33.0272]]; // the area from your screenshot
  const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
  const DATA_PATH = 'data/map-data.js';
  const IMAGE_DIR = 'images/';
  const POLL_MS = 45000; // how often open maps check for your updates
  const COLORS = {
    land: '#101010', builtUp: '#191919', marsh: '#101010', woods: '#090909', water: '#030303',
    minor: '#262626', major: '#2b2b2b', main: '#323232', highway: '#424242'
  };
  const PIN_COLORS = ['#e8b04a', '#d64545', '#ff7a2f', '#3fbf7f', '#2ec4b6', '#4a90e2', '#9b6dff', '#e8e2d0'];
  const FONTS = [
    ['Cinzel', true, 'serif'], ['Cinzel Decorative', true, 'serif'], ['MedievalSharp', false, 'serif'],
    ['Uncial Antiqua', false, 'serif'], ['IM Fell English', false, 'serif'], ['Pirata One', false, 'serif'],
    ['UnifrakturMaguntia', false, 'serif'], ['Almendra', true, 'serif'], ['Metamorphous', false, 'serif'],
    ['Macondo', false, 'serif'], ['Eagle Lake', false, 'serif'], ['Spectral', true, 'serif'],
    ['EB Garamond', true, 'serif'], ['Lora', true, 'serif'], ['Crimson Text', true, 'serif'],
    ['Caveat', true, 'cursive'], ['Special Elite', false, 'monospace'], ['Inter', true, 'sans-serif'],
    ['Oswald', true, 'sans-serif']
  ].map(([name, bold, fallback]) => ({ name, bold, fallback }));
  const SIZES = { s: 14, m: 16, l: 19 };
  const REGION_SIZES = { m: 18, l: 26, xl: 36 };
  const QUEST_STATUS = { active: 'Active', done: 'Completed', failed: 'Failed' };
  const DEFAULTS = { titleFont: 'Cinzel', bodyFont: 'Spectral', textSize: 'm', color: '#e8b04a' };
  const SITE_KEY = location.pathname.replace(/[^\w]/g, '_') || 'root';

  // ===== Small helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round6 = (n) => Math.round(n * 1e6) / 1e6;
  const str = (v) => (v == null ? '' : String(v));
  const arr = (v) => (Array.isArray(v) ? v : []);
  const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : (typeof v === 'string' && v.trim() && isFinite(+v) ? +v : null);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeColor = (c, fallback = PIN_COLORS[0]) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : fallback);
  const fontInfo = (name) => FONTS.find((f) => f.name === name);
  const validFont = (name, fallback) => (fontInfo(name) ? name : fallback);
  const fontStack = (name) => { const f = fontInfo(name) || FONTS[0]; return `'${f.name}', ${f.fallback}`; };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(label, cls, onClick) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button';
    if (onClick) b.onclick = onClick;
    return b;
  }

  function safeImageSrc(src) {
    if (typeof src !== 'string') return '';
    src = src.trim();
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(src)) return src;
    if (/^https?:\/\/\S+$/i.test(src)) return src;
    if (/^[\w\-./]+$/.test(src) && !src.includes('..') && !src.startsWith('/')) return src;
    return '';
  }

  const loadedFonts = new Set();
  function loadFont(name) {
    const f = fontInfo(name);
    if (!f || loadedFonts.has(f.name)) return;
    loadedFonts.add(f.name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.name.replace(/ /g, '+') + (f.bold ? ':wght@400;700' : '') + '&display=swap';
    document.head.appendChild(link);
  }

  // Safe mini-formatting: **bold**, *italic*, [text](https://link), "- " bullets.
  function richText(text) {
    let h = esc(text);
    h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
    h = h.replace(/^- (.*)$/gm, '&bull; $1');
    return h.replace(/\n/g, '<br>');
  }

  function toast(msg, kind = 'info', ms = 4500, onClick) {
    const t = el('div', 'toast ' + kind, msg);
    if (onClick) t.addEventListener('click', () => { t.remove(); onClick(); });
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function ask(message, yes = 'OK', no = 'Cancel') {
    return new Promise((resolve) => {
      const d = el('div', 'modal');
      d.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true"><p></p><div class="modal-btns">' +
        '<button type="button" class="btn ghost" data-v="0"></button><button type="button" class="btn primary" data-v="1"></button></div></div>';
      d.querySelector('p').textContent = message;
      d.querySelector('[data-v="1"]').textContent = yes;
      d.querySelector('[data-v="0"]').textContent = no;
      d.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b && e.target !== d) return;
        d.remove();
        resolve(!!b && b.dataset.v === '1');
      });
      document.body.appendChild(d);
      d.querySelector('[data-v="1"]').focus();
    });
  }

  function openLightbox(src, alt) {
    const lb = $('#lightbox');
    lb.querySelector('img').src = src;
    lb.querySelector('img').alt = alt || '';
    lb.hidden = false;
  }
  function zoomImg(src, alt, cls) {
    const img = el('img', cls);
    img.src = resolveImage(src);
    img.alt = alt || '';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(img.src, img.alt));
    return img;
  }

  // Tiny IndexedDB store for the owner's drafts (room for images, unlike localStorage).
  const idb = {
    db: null,
    open() {
      if (!this.db) {
        this.db = new Promise((res, rej) => {
          const r = indexedDB.open('campaign-map', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      }
      return this.db;
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('kv', mode);
        const req = fn(tx.objectStore('kv'));
        tx.oncomplete = () => res(req && req.result);
        tx.onerror = () => rej(tx.error);
      });
    },
    get(k) { return this.run('readonly', (s) => s.get(k)); },
    set(k, v) { return this.run('readwrite', (s) => s.put(v, k)); },
    del(k) { return this.run('readwrite', (s) => s.delete(k)); }
  };

  // ===== Data =====
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const defs = Object.assign({}, DEFAULTS, d.defaults || {});
    const out = {
      title: typeof d.title === 'string' ? d.title : 'Campaign Map',
      showTitle: !!d.showTitle,
      titleFont: validFont(d.titleFont, 'Cinzel'),
      defaults: {
        titleFont: validFont(defs.titleFont, DEFAULTS.titleFont),
        bodyFont: validFont(defs.bodyFont, DEFAULTS.bodyFont),
        textSize: SIZES[defs.textSize] ? defs.textSize : 'm',
        color: safeColor(defs.color, DEFAULTS.color)
      },
      regions: [],
      locations: [],
      quests: []
    };
    for (const r of arr(d.regions)) {
      if (!r) continue;
      const points = arr(r.points).filter((p) => Array.isArray(p) && num(p[0]) != null && num(p[1]) != null).map((p) => [num(p[0]), num(p[1])]);
      if (points.length < 3) continue;
      out.regions.push({
        id: str(r.id) || uid(), name: str(r.name), description: str(r.description),
        color: safeColor(r.color, '#9b6dff'), font: validFont(r.font, 'Cinzel'),
        size: REGION_SIZES[r.size] ? r.size : 'l', points
      });
    }
    for (const l of arr(d.locations)) {
      if (!l || num(l.lng) == null || num(l.lat) == null) continue;
      out.locations.push({
        id: str(l.id) || uid(),
        kind: l.kind === 'settlement' ? 'settlement' : 'place',
        name: str(l.name), description: str(l.description),
        lng: num(l.lng), lat: num(l.lat),
        titleFont: validFont(l.titleFont, ''), bodyFont: validFont(l.bodyFont, ''),
        textSize: SIZES[l.textSize] ? l.textSize : '',
        color: safeColor(l.color, ''), image: safeImageSrc(l.image),
        shops: arr(l.shops).filter(Boolean).map((s) => ({
          id: str(s.id) || uid(), name: str(s.name), keeper: str(s.keeper), description: str(s.description),
          items: str(s.items), image: safeImageSrc(s.image)
        })),
        npcs: arr(l.npcs).filter(Boolean).map((n) => ({
          id: str(n.id) || uid(), name: str(n.name), role: str(n.role), description: str(n.description),
          image: safeImageSrc(n.image), hidden: !!n.hidden
        }))
      });
    }
    for (const q of arr(d.quests)) {
      if (!q) continue;
      out.quests.push({
        id: str(q.id) || uid(), title: str(q.title), description: str(q.description),
        status: QUEST_STATUS[q.status] ? q.status : 'active', giver: str(q.giver), locationId: str(q.locationId),
        lng: num(q.lng), lat: num(q.lat), revealed: !!q.revealed
      });
    }
    return out;
  }

  function serialize(d) {
    return '/* Campaign map data - edit it with the built-in editor: add #edit to the end of the site address. */\n' +
      'window.MAP_DATA = ' + JSON.stringify(d, null, 2) + ';\n';
  }
  function parseDataFile(text) {
    const i = text.indexOf('{'), j = text.lastIndexOf('}');
    if (i < 0 || j < i) throw new Error('not a map data file');
    return normalize(JSON.parse(text.slice(i, j + 1)));
  }
  function loadDataScript() {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = DATA_PATH + '?v=' + Date.now(); // always the newest version
      s.onload = () => { s.remove(); resolve(window.MAP_DATA); };
      s.onerror = () => { s.remove(); resolve(null); };
      document.head.appendChild(s);
    });
  }

  // ===== Map style (no labels, airports, parks, buildings or other places) =====
  function baseLayers(S) {
    const kinds = (k) => ['in', ['get', 'kind'], ['literal', k]];
    const detail = (k) => ['in', ['get', 'kind_detail'], ['literal', k]];
    const width = (stops) => ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()];
    const MAIN = ['trunk', 'primary', 'trunk_link', 'primary_link'];
    const road = (id, filter, color, stops) => ({
      id, type: 'line', source: S, 'source-layer': 'roads', filter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color, 'line-width': width(stops) }
    });
    const fill = (id, k, color) => ({ id, type: 'fill', source: S, 'source-layer': 'landuse', filter: kinds(k), paint: { 'fill-color': color } });
    return [
      { id: 'land', type: 'background', paint: { 'background-color': COLORS.land } },
      fill('built-up', ['residential', 'commercial', 'industrial', 'retail', 'beach', 'sand'], COLORS.builtUp),
      fill('marsh-grass', ['wetland', 'grass', 'grassland', 'meadow', 'scrub', 'heath', 'farmland', 'orchard', 'vineyard'], COLORS.marsh),
      fill('woods', ['wood', 'forest'], COLORS.woods),
      { id: 'water', type: 'fill', source: S, 'source-layer': 'water', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': COLORS.water } },
      { id: 'streams', type: 'line', source: S, 'source-layer': 'water', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': COLORS.water, 'line-width': width([[9, 0.5], [14, 2], [18, 6]]) } },
      road('roads-minor', ['all', kinds(['minor_road']), ['!', detail(['service'])]], COLORS.minor, [[11, 0.4], [13, 0.9], [15, 2.5], [18, 12]]),
      road('roads-major', ['all', kinds(['major_road']), ['!', detail(MAIN)]], COLORS.major, [[8, 0.4], [10, 0.8], [13, 1.6], [15, 4], [18, 16]]),
      road('roads-main', ['all', kinds(['major_road']), detail(MAIN)], COLORS.main, [[7, 0.4], [10, 1], [13, 2], [15, 5], [18, 18]]),
      road('roads-highway', kinds(['highway']), COLORS.highway, [[5, 0.4], [10, 1.6], [13, 3], [15, 6], [18, 22]])
    ];
  }

  async function makeStyle() {
    const res = await fetch(CARTO_STYLE);
    if (!res.ok) throw new Error('style ' + res.status);
    const carto = await res.json();
    const key = Object.keys(carto.sources).find((k) => carto.sources[k].type === 'vector');
    const source = Object.assign({}, carto.sources[key], {
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap</a> ' +
        '<a href="https://carto.com/attributions" target="_blank" rel="noopener">&copy; CARTO</a>'
    });
    const empty = { type: 'FeatureCollection', features: [] };
    const layers = baseLayers('base');
    const at = layers.findIndex((l) => l.id === 'roads-minor');
    layers.splice(at, 0, { id: 'regions-fill', type: 'fill', source: 'regions', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 } });
    layers.push(
      { id: 'regions-line', type: 'line', source: 'regions', paint: { 'line-color': ['get', 'color'], 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [3, 2] } },
      { id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#e8b04a', 'fill-opacity': 0.14 } },
      { id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#e8b04a', 'line-width': 2 } },
      { id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#e8b04a', 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 } }
    );
    return { version: 8, sources: { base: source, regions: { type: 'geojson', data: empty }, draft: { type: 'geojson', data: empty } }, layers };
  }

  // ===== App state =====
  let map, popup, published, data, panel = null, styleReady = false;
  let editing = false, busy = false, mode = null; // mode: {type:'pin'} | {type:'quest', id} | {type:'region', points, editId}
  let popupKey = null, currentView = 'list', selectedId = null, saveTimer = null;
  let pageLocId = null, pageTab = 'overview', logTab = 'quests';
  const markers = new Map(), qmarkers = new Map(), rlabels = new Map();
  const openCards = new Set();
  const imageCache = {}; // just-published images, shown from memory until the live site catches up
  const resolveImage = (src) => imageCache[src] || src;
  const byId = (id) => data.locations.find((l) => l.id === id);
  const byQuest = (id) => data.quests.find((q) => q.id === id);
  const byRegion = (id) => data.regions.find((r) => r.id === id);
  const visibleQuests = (d) => d.quests.filter((q) => q.revealed);
  const npcsFor = (loc) => loc.npcs.filter((n) => editing || !n.hidden);
  const questsFor = (loc) => data.quests.filter((q) => q.locationId === loc.id && (editing || q.revealed));

  async function init() {
    published = normalize(await loadDataScript());
    data = clone(published);
    applyTitle();
    let style;
    try {
      style = await makeStyle();
    } catch (e) {
      $('#map').innerHTML = '<div class="fatal">The map couldn’t load. Check your internet connection and refresh the page.</div>';
      return;
    }
    map = new maplibregl.Map({
      container: 'map', style, bounds: LOCK_BOUNDS, maxBounds: LOCK_BOUNDS, maxZoom: 18,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false
    });
    map.touchZoomRotate.disableRotation();
    if (map.keyboard && map.keyboard.disableRotation) map.keyboard.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: 'none', className: 'loc-popup', focusAfterOpen: false });
    popup.on('close', () => { popupKey = null; highlight(null); });
    map.on('load', () => { styleReady = true; fitSize(); renderRegions(); });
    window.addEventListener('resize', fitSize);
    map.on('click', onMapClick);
    map.on('dblclick', (e) => { if (mode && mode.type === 'region') { e.preventDefault(); finishRegion(); } });
    map.on('zoom', () => map.getContainer().classList.toggle('zoomed-in', map.getZoom() > 13.5));
    map.on('mousemove', (e) => {
      if (!styleReady || mode) return;
      const hit = map.queryRenderedFeatures(e.point, { layers: ['regions-fill'] }).length > 0;
      map.getCanvas().style.cursor = hit ? 'pointer' : '';
    });

    $('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });
    $('#log-btn').addEventListener('click', () => toggleLog());
    $('#log-btn').hidden = false;
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', checkHash);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fitSize(); poll(); } });
    setInterval(poll, POLL_MS);
    window.campaignMap = { get map() { return map; }, get data() { return data; } }; // handy for debugging

    renderAll();
    const unseen = unseenQuests().length;
    if (unseen) toast(`📜 ${unseen} new quest${unseen === 1 ? '' : 's'} in your logbook`, 'quest', 9000, () => toggleLog(true, 'quests'));
    checkHash();
  }

  // If the page was opened in a hidden tab, the map can start at a tiny default size: fix it.
  let firstFit = true;
  function fitSize() {
    if (!map) return;
    const c = map.getContainer(), cv = map.getCanvas();
    if (Math.abs(c.clientWidth - cv.clientWidth) > 2 || Math.abs(c.clientHeight - cv.clientHeight) > 2) {
      map.resize();
      if (firstFit) map.fitBounds(LOCK_BOUNDS, { animate: false });
    }
    if (c.clientWidth > 0) firstFit = false;
  }

  function renderAll() {
    renderMarkers();
    renderQuestMarkers();
    renderRegions();
    applyTitle();
    updateLogBadge();
    renderLog();
    if (pageLocId) renderPage();
  }

  // Players' maps quietly check for your updates.
  async function poll() {
    if (editing || busy || !map) return;
    const raw = await loadDataScript();
    if (!raw || editing) return;
    const fresh = normalize(raw);
    if (JSON.stringify(fresh) === JSON.stringify(published)) return;
    const before = new Set(visibleQuests(published).map((q) => q.id));
    published = fresh;
    data = clone(fresh);
    popup.remove();
    renderAll();
    visibleQuests(fresh).filter((q) => !before.has(q.id)).forEach((q) => {
      toast('📜 New quest: ' + (q.title || 'Untitled quest') + ' (tap to open)', 'quest', 15000, () => toggleLog(true, 'quests'));
    });
  }

  function checkHash() {
    if (location.hash === '#edit') enterEdit();
    else if (editing) exitEdit();
  }

  function onKey(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (mode && mode.type === 'region' && !typing) {
      if (e.key === 'Enter') { e.preventDefault(); finishRegion(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); mode.points.pop(); updateDraft(); showDrawing(); return; }
    }
    if (e.key !== 'Escape') return;
    if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
    else if (mode) cancelMode();
    else if (popup && popup.isOpen()) popup.remove();
    else if (!$('#page').hidden) closePage();
    else if (!$('#logbook').hidden) toggleLog(false);
  }

  function applyTitle() {
    document.title = data.title || 'Campaign Map';
    const t = $('#map-title');
    const show = data.showTitle && !!data.title.trim();
    t.hidden = !show;
    if (show) {
      loadFont(data.titleFont);
      t.textContent = data.title;
      t.style.fontFamily = fontStack(data.titleFont);
    }
  }

  // ===== Pins (places & settlements) =====
  function pinSvg(color, big) {
    const inner = big
      ? '<path d="M9.5 20v-8.5h2.4v2.2h2v-2.2h2.2v2.2h2v-2.2h2.4V20z" fill="rgba(0,0,0,.6)"/>'
      : '<circle cx="15" cy="14.6" r="5" fill="rgba(0,0,0,.5)"/>';
    return `<svg viewBox="0 0 30 40" width="${big ? 36 : 30}" height="${big ? 48 : 40}" aria-hidden="true">` +
      `<path d="M15 1.5C7.5 1.5 1.5 7.4 1.5 14.8 1.5 24.8 15 38.5 15 38.5S28.5 24.8 28.5 14.8C28.5 7.4 22.5 1.5 15 1.5z" fill="${color}" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>` +
      inner + '</svg>';
  }

  function addMarker(loc) {
    const big = loc.kind === 'settlement';
    const b = el('button', 'pin' + (big ? ' pin-big' : ''));
    b.type = 'button';
    b.dataset.key = 'loc:' + loc.id;
    b.setAttribute('aria-label', loc.name || 'Untitled place');
    b.innerHTML = pinSvg(safeColor(loc.color || data.defaults.color), big);
    const label = el('span', 'pin-label' + (big ? ' always' : ''), loc.name || 'Untitled place');
    if (big) { const f = loc.titleFont || data.defaults.titleFont; loadFont(f); label.style.fontFamily = fontStack(f); }
    b.appendChild(label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editing) selectPin(loc.id);
      else if (big) openPage(loc);
      else openPopup(loc);
    });
    const m = new maplibregl.Marker({ element: b, anchor: 'bottom', draggable: editing }).setLngLat([loc.lng, loc.lat]).addTo(map);
    m.on('dragend', () => {
      const p = m.getLngLat();
      loc.lng = round6(p.lng); loc.lat = round6(p.lat);
      if (popupKey === 'loc:' + loc.id) popup.setLngLat(p);
      changed();
    });
    markers.set(loc.id, m);
  }
  function removeMarker(id) { const m = markers.get(id); if (m) { m.remove(); markers.delete(id); } }
  function updateMarker(loc) { removeMarker(loc.id); addMarker(loc); highlight(popupKey); }
  function renderMarkers() {
    for (const m of markers.values()) m.remove();
    markers.clear();
    data.locations.forEach(addMarker);
    highlight(popupKey || (pageLocId ? 'loc:' + pageLocId : null));
  }
  function highlight(key) {
    document.querySelectorAll('.pin, .qmarker').forEach((b) => b.classList.toggle('selected', !!key && b.dataset.key === key));
  }

  // ===== Quest markers =====
  function renderQuestMarkers() {
    for (const m of qmarkers.values()) m.remove();
    qmarkers.clear();
    data.quests.filter((q) => q.lng != null && q.lat != null && (editing || (q.revealed && q.status === 'active'))).forEach((q) => {
      const b = el('button', 'qmarker' + (q.revealed ? '' : ' hidden-q') + (q.status !== 'active' ? ' closed' : ''), '!');
      b.type = 'button';
      b.dataset.key = 'quest:' + q.id;
      b.setAttribute('aria-label', 'Quest: ' + (q.title || 'Untitled quest'));
      b.appendChild(el('span', 'pin-label', q.title || 'Untitled quest'));
      b.addEventListener('click', (e) => { e.stopPropagation(); if (editing) selectQuest(q.id); else openQuestPopup(q); });
      const m = new maplibregl.Marker({ element: b, anchor: 'center', draggable: editing }).setLngLat([q.lng, q.lat]).addTo(map);
      m.on('dragend', () => { const p = m.getLngLat(); q.lng = round6(p.lng); q.lat = round6(p.lat); changed(); });
      qmarkers.set(q.id, m);
    });
  }

  // ===== Regions =====
  function centroid(pts) {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      const f = x0 * y1 - x1 * y0;
      a += f; x += (x0 + x1) * f; y += (y0 + y1) * f;
    }
    if (Math.abs(a) < 1e-12) return pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
    return [x / (3 * a), y / (3 * a)];
  }
  function renderRegions() {
    for (const m of rlabels.values()) m.remove();
    rlabels.clear();
    const list = data.regions.filter((r) => r.points.length >= 3);
    if (styleReady) {
      map.getSource('regions').setData({
        type: 'FeatureCollection',
        features: list.map((r) => ({ type: 'Feature', properties: { id: r.id, color: r.color }, geometry: { type: 'Polygon', coordinates: [[...r.points, r.points[0]]] } }))
      });
    }
    list.forEach((r) => {
      if (!r.name.trim()) return;
      loadFont(r.font);
      const d = el('div', 'region-label', r.name);
      d.style.fontFamily = fontStack(r.font);
      d.style.fontSize = REGION_SIZES[r.size] + 'px';
      d.style.color = r.color;
      rlabels.set(r.id, new maplibregl.Marker({ element: d, anchor: 'center' }).setLngLat(centroid(r.points)).addTo(map));
    });
  }

  // ===== Pop-ups =====
  function offsetFor(up) {
    return { center: [0, 0], top: [0, 6], 'top-left': [0, 6], 'top-right': [0, 6], bottom: [0, -up], 'bottom-left': [0, -up], 'bottom-right': [0, -up], left: [14, -up / 2], right: [-14, -up / 2] };
  }
  function card(opts) {
    const wrap = el('div', 'pop');
    wrap.style.setProperty('--pin', safeColor(opts.color, DEFAULTS.color));
    wrap.style.setProperty('--size', (SIZES[opts.size] || 16) + 'px');
    const src = safeImageSrc(opts.image);
    if (src) {
      const img = zoomImg(src, opts.title, 'pop-img');
      img.loading = 'eager';
      img.addEventListener('load', () => { if (popup.isOpen()) popup.setLngLat(popup.getLngLat()); keepPopupInView(); });
      wrap.appendChild(img);
    }
    if (opts.kicker) wrap.appendChild(el('div', 'pop-kicker', opts.kicker));
    const h = el('h3', 'pop-title', opts.title || 'Untitled');
    loadFont(opts.titleFont); loadFont(opts.bodyFont);
    h.style.fontFamily = fontStack(opts.titleFont);
    h.style.fontWeight = fontInfo(opts.titleFont) && fontInfo(opts.titleFont).bold ? '700' : '400';
    wrap.appendChild(h);
    if (opts.meta) wrap.appendChild(el('div', 'pop-meta', opts.meta));
    if (opts.description && opts.description.trim()) {
      const body = el('div', 'pop-body');
      body.style.fontFamily = fontStack(opts.bodyFont);
      body.innerHTML = richText(opts.description);
      wrap.appendChild(body);
    }
    if (opts.extra) wrap.appendChild(opts.extra);
    return wrap;
  }
  function showPopup(key, lngLat, content, up) {
    popupKey = key;
    const p = map.project(lngLat);
    const room = Math.max(p.y - up - 14, map.getContainer().clientHeight - p.y - 22);
    content.style.maxHeight = Math.max(140, Math.min(room, 560)) + 'px';
    const img = content.querySelector('.pop-img');
    if (img) img.style.maxHeight = Math.round(Math.max(90, Math.min(220, room * 0.42))) + 'px';
    popup.setOffset(offsetFor(up));
    popup.setLngLat(lngLat).setDOMContent(content);
    if (!popup.isOpen()) popup.addTo(map);
    highlight(key);
    requestAnimationFrame(keepPopupInView);
  }
  function openPopup(loc) {
    const d = data.defaults;
    let extra = null;
    if (loc.kind === 'settlement' && !editing) {
      extra = el('div', 'pop-actions');
      extra.appendChild(btn('Open ' + (loc.name || 'settlement'), 'small primary', () => openPage(loc)));
    }
    showPopup('loc:' + loc.id, [loc.lng, loc.lat], card({
      title: loc.name || 'Untitled place', kicker: loc.kind === 'settlement' ? 'Settlement' : '',
      titleFont: loc.titleFont || d.titleFont, bodyFont: loc.bodyFont || d.bodyFont,
      color: loc.color || d.color, size: loc.textSize || d.textSize, image: loc.image, description: loc.description, extra
    }), loc.kind === 'settlement' ? 50 : 42);
  }
  function questMeta(q) {
    const bits = [QUEST_STATUS[q.status]];
    if (q.giver) bits.push('From ' + q.giver);
    const l = q.locationId && byId(q.locationId);
    if (l) bits.push(l.name);
    if (editing && !q.revealed) bits.push('Hidden from players');
    return bits.join(' · ');
  }
  function openQuestPopup(q) {
    showPopup('quest:' + q.id, [q.lng, q.lat], card({
      kicker: 'Quest', title: q.title || 'Untitled quest', meta: questMeta(q),
      titleFont: data.defaults.titleFont, bodyFont: data.defaults.bodyFont, color: DEFAULTS.color,
      size: data.defaults.textSize, description: q.description
    }), 18);
  }
  function openRegionPopup(r, lngLat) {
    showPopup('region:' + r.id, lngLat, card({
      kicker: 'Region', title: r.name || 'Unnamed region', titleFont: r.font, bodyFont: data.defaults.bodyFont,
      color: r.color, size: data.defaults.textSize, description: r.description
    }), 0);
  }
  function keepPopupInView() {
    if (!popup || !popup.isOpen()) return;
    const e = popup.getElement();
    if (!e) return;
    const r = e.getBoundingClientRect(), c = map.getContainer().getBoundingClientRect(), pad = 10;
    let dx = 0, dy = 0;
    if (r.top < c.top + pad) dy = r.top - (c.top + pad);
    else if (r.bottom > c.bottom - pad) dy = r.bottom - (c.bottom - pad);
    if (r.left < c.left + pad) dx = r.left - (c.left + pad);
    else if (r.right > c.right - pad) dx = r.right - (c.right - pad);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([dx, dy], { duration: 300 });
  }

  function onMapClick(e) {
    const t = e.originalEvent && e.originalEvent.target;
    if (t && t.closest && (t.closest('.pin') || t.closest('.qmarker') || t.closest('.maplibregl-popup'))) return;
    if (editing && mode) { handleModeClick(e.lngLat); return; }
    const hit = styleReady && map.queryRenderedFeatures(e.point, { layers: ['regions-fill'] })[0];
    const region = hit && byRegion(hit.properties.id);
    if (region) {
      if (editing) { selectRegion(region.id, e.lngLat); return; }
      openRegionPopup(region, e.lngLat);
      return;
    }
    popup.remove();
    if (editing && /^(pin|quest|region)$/.test(currentView)) backToList();
  }

  // ===== Settlement page (players) =====
  function openPage(loc) {
    popup.remove();
    toggleLog(false);
    pageLocId = loc.id;
    pageTab = 'overview';
    renderPage();
  }
  function closePage() {
    pageLocId = null;
    $('#page').hidden = true;
    highlight(null);
  }
  function sheetHead(title, onClose) {
    const h = el('div', 'sheet-head');
    h.appendChild(el('div', 'sheet-title', title));
    const x = el('button', 'sheet-close', '×');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = onClose;
    h.appendChild(x);
    return h;
  }
  function tabBar(tabs, current, onPick) {
    const bar = el('div', 'tabs');
    tabs.forEach(([id, label]) => {
      const b = el('button', id === current ? 'on' : '', label);
      b.type = 'button';
      b.onclick = () => onPick(id);
      bar.appendChild(b);
    });
    return bar;
  }
  function parseItems(text) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/\s*\|\s*|\s+[-–—]\s+/);
      return parts.length > 1 ? [parts.slice(0, -1).join(' - '), parts[parts.length - 1]] : [l, ''];
    });
  }
  function prose(text, font) {
    const p = el('div', 'prose');
    p.style.fontFamily = fontStack(font);
    p.innerHTML = richText(text);
    return p;
  }
  function shopCard(s, tf, bf) {
    const c = el('div', 'card');
    if (s.image) c.appendChild(zoomImg(s.image, s.name, 'card-img'));
    const b = el('div', 'card-body');
    const h = el('h4', null, s.name || 'Unnamed shop');
    h.style.fontFamily = fontStack(tf);
    b.appendChild(h);
    if (s.keeper) b.appendChild(el('div', 'meta', 'Shopkeeper: ' + s.keeper));
    if (s.description.trim()) b.appendChild(prose(s.description, bf));
    const items = parseItems(s.items);
    if (items.length) {
      const tbl = el('table', 'items');
      items.forEach(([name, price]) => {
        const tr = el('tr');
        tr.appendChild(el('td', null, name));
        tr.appendChild(el('td', null, price));
        tbl.appendChild(tr);
      });
      b.appendChild(tbl);
    }
    c.appendChild(b);
    return c;
  }
  function npcCard(n, tf, bf) {
    const c = el('div', 'card npc');
    if (n.image) c.appendChild(zoomImg(n.image, n.name, 'npc-img'));
    const b = el('div', 'card-body');
    const h = el('h4', null, n.name || 'Unnamed');
    h.style.fontFamily = fontStack(tf);
    b.appendChild(h);
    if (n.role) b.appendChild(el('div', 'meta', n.role));
    if (n.description.trim()) b.appendChild(prose(n.description, bf));
    c.appendChild(b);
    return c;
  }
  function questCard(q, isNew) {
    const c = el('div', 'card');
    const b = el('div', 'card-body');
    const top = el('div', 'chips');
    top.appendChild(el('span', 'chip ' + q.status, QUEST_STATUS[q.status]));
    if (isNew) top.appendChild(el('span', 'chip new', 'New'));
    b.appendChild(top);
    const h = el('h4', null, q.title || 'Untitled quest');
    h.style.fontFamily = fontStack(data.defaults.titleFont);
    b.appendChild(h);
    const meta = [];
    if (q.giver) meta.push('From ' + q.giver);
    const l = q.locationId && byId(q.locationId);
    if (l) meta.push(l.name);
    if (meta.length) b.appendChild(el('div', 'meta', meta.join(' · ')));
    if (q.description.trim()) b.appendChild(prose(q.description, data.defaults.bodyFont));
    if (q.lng != null && q.status === 'active') {
      b.appendChild(btn('Show on map', 'small', () => {
        closePage(); toggleLog(false);
        map.easeTo({ center: [q.lng, q.lat], duration: 600 });
        map.once('moveend', () => openQuestPopup(q));
      }));
    }
    c.appendChild(b);
    return c;
  }
  function renderPage() {
    const pg = $('#page');
    const loc = pageLocId && byId(pageLocId);
    if (!loc || editing) { pg.hidden = true; pageLocId = null; return; }
    const d = data.defaults, tf = loc.titleFont || d.titleFont, bf = loc.bodyFont || d.bodyFont;
    loadFont(tf); loadFont(bf);
    pg.hidden = false;
    pg.innerHTML = '';
    pg.style.setProperty('--pin', safeColor(loc.color || d.color));
    pg.appendChild(sheetHead('Settlement', closePage));
    const scroll = el('div', 'sheet-scroll');
    if (loc.image) scroll.appendChild(zoomImg(loc.image, loc.name, 'page-hero'));
    const h = el('h2', 'page-title', loc.name || 'Unnamed settlement');
    h.style.fontFamily = fontStack(tf);
    scroll.appendChild(h);
    const people = npcsFor(loc), quests = questsFor(loc);
    const tabs = [['overview', 'Overview']];
    if (loc.shops.length) tabs.push(['shops', `Shops (${loc.shops.length})`]);
    if (people.length) tabs.push(['people', `People (${people.length})`]);
    if (quests.length) tabs.push(['quests', `Quests (${quests.length})`]);
    if (!tabs.some((t) => t[0] === pageTab)) pageTab = 'overview';
    scroll.appendChild(tabBar(tabs, pageTab, (id) => { pageTab = id; renderPage(); }));
    const body = el('div', 'tab-body');
    body.style.fontSize = (SIZES[loc.textSize || d.textSize] || 16) + 'px';
    if (pageTab === 'overview') {
      body.appendChild(loc.description.trim() ? prose(loc.description, bf) : el('p', 'empty', 'Nothing written about this place yet.'));
    } else if (pageTab === 'shops') {
      loc.shops.forEach((s) => body.appendChild(shopCard(s, tf, bf)));
    } else if (pageTab === 'people') {
      people.forEach((n) => body.appendChild(npcCard(n, tf, bf)));
    } else if (pageTab === 'quests') {
      const seen = new Set(lsGet('campaign-map.seen:' + SITE_KEY, []));
      quests.forEach((q) => body.appendChild(questCard(q, !seen.has(q.id))));
    }
    scroll.appendChild(body);
    pg.appendChild(scroll);
    highlight('loc:' + loc.id);
  }

  // ===== Logbook (players): quests, people met, private notes =====
  const seenKey = () => 'campaign-map.seen:' + SITE_KEY;
  const notesKey = () => 'campaign-map.notes:' + SITE_KEY;
  function unseenQuests() {
    const seen = new Set(lsGet(seenKey(), []));
    return visibleQuests(published).filter((q) => !seen.has(q.id));
  }
  function updateLogBadge() {
    const n = unseenQuests().length;
    const b = $('#log-badge');
    b.hidden = !n;
    b.textContent = n;
  }
  function toggleLog(open, tab) {
    const lb = $('#logbook');
    const show = open == null ? lb.hidden : open;
    if (tab) logTab = tab;
    lb.hidden = !show;
    if (show) { closePage(); popup && popup.remove(); renderLog(); }
  }
  function renderLog() {
    const lb = $('#logbook');
    if (lb.hidden) return;
    lb.innerHTML = '';
    lb.appendChild(sheetHead('Logbook', () => toggleLog(false)));
    const quests = visibleQuests(data);
    const unseen = new Set(unseenQuests().map((q) => q.id));
    lb.appendChild(tabBar([['quests', `Quests${unseen.size ? ' (' + unseen.size + ' new)' : ''}`], ['people', 'People'], ['notes', 'My notes']], logTab, (id) => { logTab = id; renderLog(); }));
    const scroll = el('div', 'sheet-scroll');
    const body = el('div', 'tab-body');
    if (logTab === 'quests') {
      if (!quests.length) body.appendChild(el('p', 'empty', 'No quests yet. When your DM gives you one, it shows up here.'));
      const groups = [['active', 'Active'], ['done', 'Completed'], ['failed', 'Failed']];
      groups.forEach(([st, label]) => {
        const list = quests.filter((q) => q.status === st);
        if (!list.length) return;
        body.appendChild(el('div', 'group-title', label));
        list.forEach((q) => body.appendChild(questCard(q, unseen.has(q.id))));
      });
      lsSet(seenKey(), quests.map((q) => q.id));
      updateLogBadge();
    } else if (logTab === 'people') {
      let any = false;
      data.locations.filter((l) => l.kind === 'settlement').forEach((l) => {
        const people = npcsFor(l);
        if (!people.length) return;
        any = true;
        body.appendChild(el('div', 'group-title', l.name || 'Unnamed settlement'));
        const tf = l.titleFont || data.defaults.titleFont, bf = l.bodyFont || data.defaults.bodyFont;
        loadFont(tf); loadFont(bf);
        people.forEach((n) => body.appendChild(npcCard(n, tf, bf)));
      });
      if (!any) body.appendChild(el('p', 'empty', 'Nobody yet. People you meet show up here.'));
    } else {
      const ta = el('textarea', 'notes');
      ta.placeholder = 'Write anything you want to remember: clues, names, debts, theories…';
      try { ta.value = localStorage.getItem(notesKey()) || ''; } catch (e) { /* ignore */ }
      ta.oninput = () => { try { localStorage.setItem(notesKey(), ta.value); } catch (e) { /* ignore */ } };
      body.appendChild(ta);
      body.appendChild(el('p', 'meta', 'Your notes are private. They’re saved only in this browser on this device.'));
    }
    scroll.appendChild(body);
    lb.appendChild(scroll);
  }

  // ===== Editor =====
  const PANEL_HTML = `
    <div class="ed-head"><div class="ed-title">Map editor</div><div class="ed-status" id="ed-status"></div></div>
    <div class="ed-actions"><button type="button" class="btn accent" id="ed-publish">Publish</button></div>
    <div class="ed-tabs"><button type="button" data-tab="list">Pins</button><button type="button" data-tab="regions">Regions</button><button type="button" data-tab="quests">Quests</button><button type="button" data-tab="settings">Settings</button></div>
    <div class="ed-body" id="ed-body"></div>
    <div class="ed-foot"><span class="muted small">Only you can publish changes.</span>
      <button type="button" class="btn ghost small" id="ed-exit">Exit editor</button></div>`;

  const SETTINGS_HTML = `
    <section>
      <h4>Map name</h4>
      <label>Name (also the browser tab title)<input id="st-title" maxlength="80" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="st-show"> Show the name on the map</label>
      <label>Name font<select id="st-tfont"></select></label>
    </section>
    <section>
      <h4>Defaults for pins and quests</h4>
      <div class="row">
        <label>Title font<select id="st-dtfont"></select></label>
        <label>Text font<select id="st-dbfont"></select></label>
      </div>
      <label>Text size<select id="st-dsize"><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></select></label>
      <div class="field">Pin color<div class="swatches" id="st-dcolor"></div></div>
    </section>
    <section>
      <h4>Publishing (GitHub)</h4>
      <p class="muted small">Publishing needs your GitHub key. It's kept only in this browser, so nobody else can change your map.</p>
      <label>GitHub username<input id="gh-user" autocomplete="off" spellcheck="false"></label>
      <label>Repository name<input id="gh-repo" autocomplete="off" spellcheck="false"></label>
      <label>Branch<input id="gh-branch" placeholder="main" autocomplete="off" spellcheck="false"></label>
      <label>Key (fine-grained token)<input id="gh-token" type="password" autocomplete="off" spellcheck="false"></label>
      <label class="check"><input type="checkbox" id="gh-remember"> Remember the key on this device</label>
      <div class="btn-row"><button type="button" class="btn small" id="gh-test">Test connection</button><button type="button" class="btn small ghost" id="gh-forget">Forget key</button></div>
    </section>
    <section>
      <h4>Backup</h4>
      <div class="btn-row"><button type="button" class="btn small" id="bk-down">Download data file</button>
        <label class="btn small" style="margin:0;color:var(--text)">Load data file&hellip;<input type="file" id="bk-load" accept=".js,.json" hidden></label></div>
    </section>`;

  async function enterEdit() {
    if (editing || !map) return;
    editing = true;
    document.body.classList.add('editing');
    closePage();
    toggleLog(false);
    FONTS.forEach((f) => loadFont(f.name));
    panel = el('aside', 'editor');
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);
    $('#ed-publish').onclick = publish;
    $('#ed-exit').onclick = () => { location.hash = ''; };
    panel.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { cancelMode(true); showTab(b.dataset.tab); }; });
    map.resize();

    const cfg = ghConfig();
    if (cfg.user && cfg.repo && cfg.token) {
      try { published = await ghLoadData(cfg); } catch (e) { toast('Couldn’t check GitHub for the newest version: ' + e.message + '.', 'warn', 7000); }
    }
    data = clone(published);
    let draft = null;
    try { draft = await idb.get('draft'); } catch (e) { /* no IndexedDB */ }
    if (draft && editing) {
      try {
        const d = normalize(JSON.parse(draft));
        if (JSON.stringify(d) !== JSON.stringify(published)) {
          if (await ask('You have unpublished changes saved on this device. Keep working on them?', 'Keep my changes', 'Start from the published map')) data = d;
          else await idb.del('draft').catch(() => {});
        }
      } catch (e) { /* broken draft */ }
    }
    if (!editing) return;
    popup.remove();
    renderAll();
    showList();
  }

  function exitEdit() {
    const hadChanges = isDirty();
    cancelMode(true);
    editing = false;
    if (panel) panel.remove();
    panel = null;
    document.body.classList.remove('editing');
    data = clone(published);
    popup.remove();
    renderAll();
    map.resize();
    if (hadChanges) toast('Your unpublished changes are saved on this device. Open #edit again to finish and publish.', 'info', 7000);
  }

  const isDirty = () => JSON.stringify(data) !== JSON.stringify(published);
  function updateStatus() {
    const s = $('#ed-status');
    if (!s) return;
    const dirty = isDirty();
    s.textContent = dirty ? 'Unpublished changes' : 'Everything is published';
    s.classList.toggle('dirty', dirty);
  }
  function changed() {
    updateStatus();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      idb.set('draft', JSON.stringify(data)).catch(() => toast('Couldn’t save a draft on this device. Publish soon so nothing is lost.', 'warn'));
    }, 400);
  }
  function setTab(name) {
    if (panel) panel.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  }
  function body() {
    const b = $('#ed-body');
    b.innerHTML = '';
    b.scrollTop = 0;
    return b;
  }
  function showTab(tab) {
    if (tab === 'regions') showRegions();
    else if (tab === 'quests') showQuests();
    else if (tab === 'settings') showSettings();
    else showList();
  }
  function backToList() {
    popup.remove();
    if (currentView === 'quest') showQuests();
    else if (currentView === 'region') showRegions();
    else showList();
  }
  function refreshView() {
    if (currentView === 'pin' && byId(selectedId)) selectPin(selectedId);
    else if (currentView === 'quest' && byQuest(selectedId)) showQuestForm(byQuest(selectedId));
    else if (currentView === 'region' && byRegion(selectedId)) showRegionForm(byRegion(selectedId));
    else if (currentView === 'settings') showSettings();
    else if (currentView === 'regions' || currentView === 'region') showRegions();
    else if (currentView === 'quests' || currentView === 'quest') showQuests();
    else showList();
  }

  // --- modes: placing a pin, placing a quest marker, drawing a region ---
  function setMode(m, hint) {
    mode = m;
    document.body.classList.add('placing');
    $('#hint').textContent = hint;
    $('#hint').hidden = false;
    popup.remove();
    if (m.type === 'region') { map.doubleClickZoom.disable(); updateDraft(); }
  }
  function cancelMode(silent) {
    if (!mode) return;
    const m = mode;
    mode = null;
    document.body.classList.remove('placing');
    $('#hint').hidden = true;
    if (map) map.doubleClickZoom.enable();
    updateDraft();
    if (silent) return;
    if (m.type === 'quest' && byQuest(m.id)) showQuestForm(byQuest(m.id));
    else if (m.type === 'region' && m.editId && byRegion(m.editId)) showRegionForm(byRegion(m.editId));
    else if (m.type === 'region') showRegions();
  }
  function handleModeClick(ll) {
    const p = [round6(ll.lng), round6(ll.lat)];
    if (mode.type === 'pin') { cancelMode(true); placePin(p); }
    else if (mode.type === 'quest') {
      const q = byQuest(mode.id);
      cancelMode(true);
      if (!q) return;
      q.lng = p[0]; q.lat = p[1];
      renderQuestMarkers(); changed(); showQuestForm(q);
    } else if (mode.type === 'region') {
      mode.points.push(p);
      updateDraft();
      showDrawing();
    }
  }
  function updateDraft() {
    if (!styleReady) return;
    const pts = mode && mode.type === 'region' ? mode.points : [];
    const features = pts.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } }));
    if (pts.length >= 2) features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.length >= 3 ? [...pts, pts[0]] : pts } });
    if (pts.length >= 3) features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } });
    map.getSource('draft').setData({ type: 'FeatureCollection', features });
  }
  function finishRegion() {
    if (!mode || mode.type !== 'region') return;
    // drop near-duplicate corners (double-click adds two)
    const pts = [];
    mode.points.forEach((p) => {
      const last = pts[pts.length - 1];
      if (last) { const a = map.project(last), b = map.project(p); if (Math.hypot(a.x - b.x, a.y - b.y) < 5) return; }
      pts.push(p);
    });
    if (pts.length < 3) { toast('A region needs at least 3 corners.', 'warn'); return; }
    const editId = mode.editId;
    cancelMode(true);
    let r = editId && byRegion(editId);
    if (r) r.points = pts;
    else {
      r = { id: uid(), name: 'New region', description: '', color: '#9b6dff', font: 'Cinzel', size: 'l', points: pts };
      data.regions.push(r);
    }
    renderRegions(); changed(); showRegionForm(r);
    const n = $('#rf-name'); if (n) { n.focus(); n.select(); }
  }

  // --- shared form pieces ---
  function field(label, input) {
    const l = el('label', null, label);
    l.appendChild(input);
    return l;
  }
  function textInput(value, onInput, opts = {}) {
    const i = el(opts.multiline ? 'textarea' : 'input');
    if (opts.multiline) i.rows = opts.rows || 5; else i.autocomplete = 'off';
    if (opts.placeholder) i.placeholder = opts.placeholder;
    i.value = value || '';
    i.oninput = () => onInput(i.value);
    return i;
  }
  function selectInput(options, value, onChange) {
    const s = el('select');
    options.forEach(([v, label]) => s.add(new Option(label, v)));
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  }
  function fillFonts(sel, value, defaultLabel) {
    sel.innerHTML = '';
    if (defaultLabel) sel.add(new Option(defaultLabel, ''));
    FONTS.forEach((f) => { const o = new Option(f.name, f.name); o.style.fontFamily = fontStack(f.name); sel.add(o); });
    sel.value = value || (defaultLabel ? '' : FONTS[0].name);
    const paint = () => { sel.style.fontFamily = sel.value ? fontStack(sel.value) : ''; };
    paint();
    sel.addEventListener('change', paint);
    return sel;
  }
  function fontInput(value, defaultLabel, onChange) {
    const s = fillFonts(el('select'), value, defaultLabel);
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }
  function colorPicker(box, value, onPick) {
    box.innerHTML = '';
    const custom = el('input', 'sw-custom');
    const mark = (v) => box.querySelectorAll('.sw').forEach((b) => b.classList.toggle('on', b.dataset.c === v));
    PIN_COLORS.forEach((c) => {
      const b = el('button', 'sw');
      b.type = 'button'; b.dataset.c = c; b.style.background = c; b.title = c;
      b.onclick = () => { custom.value = c; mark(c); onPick(c); };
      box.appendChild(b);
    });
    custom.type = 'color'; custom.title = 'Pick any color';
    custom.value = safeColor(value);
    custom.oninput = () => { mark(custom.value); onPick(custom.value); };
    box.appendChild(custom);
    mark(safeColor(value));
    return box;
  }
  function colorField(label, value, onPick) {
    const f = el('div', 'field', label);
    f.appendChild(colorPicker(el('div', 'swatches'), value, onPick));
    return f;
  }
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  }
  // Small images are kept as-is; big photos are shrunk to 1600px so the map stays fast.
  async function fileToDataUrl(file) {
    if (!/^image\//.test(file.type)) throw new Error('not an image');
    if (file.size <= 400 * 1024 && /^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.type)) return readAsDataURL(file);
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const g = c.getContext('2d');
    g.fillStyle = '#141414';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  }
  function imageField(obj, onChange, label = 'Image (optional)') {
    const f = el('div', 'field', label);
    const box = el('div', 'img-box');
    const prev = el('img');
    box.appendChild(prev);
    box.appendChild(btn('Remove image', 'small ghost', () => { obj.image = ''; show(); onChange(); }));
    const actions = el('div', 'img-actions');
    const up = el('label', 'btn small', 'Upload…');
    up.style.margin = '0'; up.style.color = 'var(--text)';
    const file = el('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    up.appendChild(file);
    const url = el('input');
    url.placeholder = '…or paste an image link (https://)';
    url.autocomplete = 'off';
    actions.appendChild(up); actions.appendChild(url);
    f.appendChild(box); f.appendChild(actions);
    function show() {
      const src = safeImageSrc(obj.image);
      box.hidden = !src;
      if (src) prev.src = resolveImage(src);
      url.value = /^https?:/i.test(src) ? src : '';
    }
    show();
    file.onchange = async () => {
      const fl = file.files[0];
      file.value = '';
      if (!fl) return;
      try { obj.image = await fileToDataUrl(fl); show(); onChange(); } catch (e) { toast('That file couldn’t be used as an image.', 'error'); }
    };
    url.onchange = () => {
      const v = url.value.trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) { toast('Image links need to start with https://', 'warn'); return; }
      obj.image = v; show(); onChange();
    };
    return f;
  }
  // Editable list of cards (shops, people) inside a settlement.
  function subList(container, list, noun, make, fields, onChange) {
    const wrap = el('div', 'sublist');
    container.appendChild(wrap);
    const draw = () => {
      wrap.innerHTML = '';
      list.forEach((item, idx) => {
        const d = el('details', 'card-edit');
        d.open = openCards.has(item.id);
        d.ontoggle = () => { if (d.open) openCards.add(item.id); else openCards.delete(item.id); };
        const sum = el('summary', null, (item.name || 'Unnamed ' + noun) + (item.hidden ? ' (hidden)' : ''));
        d.appendChild(sum);
        const resum = () => { sum.textContent = (item.name || 'Unnamed ' + noun) + (item.hidden ? ' (hidden)' : ''); };
        fields.forEach((fd) => {
          if (fd.type === 'image') { d.appendChild(imageField(item, onChange, fd.label)); return; }
          if (fd.type === 'check') {
            const l = el('label', 'check');
            const c = el('input'); c.type = 'checkbox'; c.checked = !!item[fd.key];
            c.onchange = () => { item[fd.key] = c.checked; resum(); onChange(); };
            l.appendChild(c); l.appendChild(document.createTextNode(' ' + fd.label));
            d.appendChild(l);
            return;
          }
          d.appendChild(field(fd.label, textInput(item[fd.key], (v) => { item[fd.key] = v; if (fd.key === 'name') resum(); onChange(); }, fd)));
        });
        d.appendChild(btn('Remove ' + noun, 'small danger', async () => {
          if (!(await ask(`Remove “${item.name || 'this ' + noun}”?`, 'Remove', 'Keep it'))) return;
          list.splice(idx, 1); draw(); onChange();
        }));
        wrap.appendChild(d);
      });
      wrap.appendChild(btn('+ Add ' + noun, 'small', () => {
        const it = make();
        list.push(it); openCards.add(it.id); draw(); onChange();
        const all = wrap.querySelectorAll('details');
        const inp = all[all.length - 1] && all[all.length - 1].querySelector('input, textarea');
        if (inp) inp.focus();
      }));
    };
    draw();
  }

  // --- Pins ---
  function placePin(p) {
    const loc = { id: uid(), kind: 'place', name: 'New place', description: '', lng: p[0], lat: p[1], titleFont: '', bodyFont: '', textSize: '', color: '', image: '', shops: [], npcs: [] };
    data.locations.push(loc);
    addMarker(loc);
    changed();
    selectPin(loc.id);
    const n = $('#pf-name');
    if (n) { n.focus(); n.select(); }
  }
  function selectPin(id, fly) {
    const loc = byId(id);
    if (!loc) return;
    if (fly) map.easeTo({ center: [loc.lng, loc.lat], duration: 500 });
    openPopup(loc);
    showPinForm(loc);
  }
  function listButton(dotColor, name, tag, onClick) {
    const li = el('li');
    const b = el('button');
    b.type = 'button';
    const dot = el('span', 'dot');
    dot.style.background = dotColor;
    b.appendChild(dot);
    b.appendChild(el('span', 'nm', name));
    if (tag) b.appendChild(el('span', 'chip ' + tag[0], tag[1]));
    b.onclick = onClick;
    li.appendChild(b);
    return li;
  }
  function showList() {
    currentView = 'list'; selectedId = null; setTab('list'); updateStatus();
    const b = body();
    b.appendChild(btn('+ Add pin', 'primary list-add', () => setMode({ type: 'pin' }, 'Click the map where the new pin goes · Esc to cancel')));
    if (!data.locations.length) { b.appendChild(el('p', 'muted', 'No pins yet.')); return; }
    const ul = el('ul', 'pin-list');
    data.locations.forEach((loc) => ul.appendChild(listButton(safeColor(loc.color || data.defaults.color), loc.name || 'Untitled place',
      loc.kind === 'settlement' ? ['settle', 'Settlement'] : null, () => selectPin(loc.id, true))));
    b.appendChild(ul);
  }
  function showPinForm(loc) {
    currentView = 'pin'; selectedId = loc.id; setTab(null); updateStatus();
    const b = body();
    const refresh = () => { updateMarker(loc); if (popupKey === 'loc:' + loc.id) openPopup(loc); changed(); };
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All pins', 'ghost small', backToList));
    const name = textInput(loc.name, (v) => { loc.name = v; refresh(); });
    name.id = 'pf-name'; name.maxLength = 140;
    b.appendChild(field('Name', name));
    b.appendChild(field('Type', selectInput([['place', 'Place (pop-up)'], ['settlement', 'Settlement (shops, people, quests)']], loc.kind, (v) => {
      loc.kind = v; refresh(); showPinForm(loc);
    })));
    b.appendChild(field(loc.kind === 'settlement' ? 'Overview' : 'Description', textInput(loc.description, (v) => { loc.description = v; refresh(); }, { multiline: true, rows: 6 })));
    b.appendChild(el('p', 'tip', '**bold**   *italic*   [link text](https://…)   start a line with "- " for a bullet'));
    const row = el('div', 'row');
    row.appendChild(field('Title font', fontInput(loc.titleFont, `Default (${data.defaults.titleFont})`, (v) => { loc.titleFont = v; refresh(); })));
    row.appendChild(field('Text font', fontInput(loc.bodyFont, `Default (${data.defaults.bodyFont})`, (v) => { loc.bodyFont = v; refresh(); })));
    b.appendChild(row);
    b.appendChild(field('Text size', selectInput([['', 'Default'], ['s', 'Small'], ['m', 'Medium'], ['l', 'Large']], loc.textSize, (v) => { loc.textSize = v; refresh(); })));
    b.appendChild(colorField('Pin color', loc.color || data.defaults.color, (c) => { loc.color = c; refresh(); }));
    b.appendChild(imageField(loc, refresh, loc.kind === 'settlement' ? 'Main picture (optional)' : 'Image (optional)'));

    if (loc.kind === 'settlement') {
      b.appendChild(el('div', 'sub-h', 'Shops'));
      subList(b, loc.shops, 'shop', () => ({ id: uid(), name: '', keeper: '', description: '', items: '', image: '' }), [
        { key: 'name', label: 'Shop name' },
        { key: 'keeper', label: 'Shopkeeper' },
        { key: 'description', label: 'Description', multiline: true, rows: 3 },
        { key: 'items', label: 'Items, one per line:  Item | price', multiline: true, rows: 4, placeholder: 'Longsword | 15 gp\nHealing potion | 50 gp' },
        { key: 'image', label: 'Shop map or picture', type: 'image' }
      ], changed);
      b.appendChild(el('div', 'sub-h', 'People met here'));
      subList(b, loc.npcs, 'person', () => ({ id: uid(), name: '', role: '', description: '', image: '', hidden: false }), [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role (e.g. Blacksmith, Mayor)' },
        { key: 'description', label: 'Description', multiline: true, rows: 3 },
        { key: 'image', label: 'Portrait', type: 'image' },
        { key: 'hidden', label: 'Hidden from players (not met yet)', type: 'check' }
      ], changed);
      const qs = data.quests.filter((q) => q.locationId === loc.id);
      b.appendChild(el('div', 'sub-h', 'Quests here'));
      if (qs.length) {
        const ul = el('ul', 'pin-list');
        qs.forEach((q) => ul.appendChild(listButton(DEFAULTS.color, q.title || 'Untitled quest', q.revealed ? [q.status, QUEST_STATUS[q.status]] : ['hidden', 'Hidden'], () => selectQuest(q.id))));
        b.appendChild(ul);
      }
      b.appendChild(btn('+ Add quest here', 'small', () => newQuest(loc.id)));
    }

    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete pin', 'danger', async () => {
      if (!(await ask(`Delete “${loc.name || 'this pin'}”?`, 'Delete', 'Keep it'))) return;
      data.locations = data.locations.filter((l) => l !== loc);
      data.quests.forEach((q) => { if (q.locationId === loc.id) q.locationId = ''; });
      removeMarker(loc.id); popup.remove(); changed(); showList();
    }));
    foot.appendChild(btn('Done', 'primary', backToList));
    b.appendChild(foot);
    b.appendChild(el('p', 'tip', 'Tip: drag the pin on the map to move it.'));
  }

  // --- Regions ---
  function showRegions() {
    currentView = 'regions'; selectedId = null; setTab('regions'); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(btn('+ Draw region', 'primary list-add', () => startDrawing()));
    if (!data.regions.length) { b.appendChild(el('p', 'muted', 'No regions yet. Regions are shaded areas with a big name, for kingdoms, forests, wastelands…')); return; }
    const ul = el('ul', 'pin-list');
    data.regions.forEach((r) => ul.appendChild(listButton(r.color, r.name || 'Unnamed region', null, () => selectRegion(r.id, null, true))));
    b.appendChild(ul);
  }
  function startDrawing(editId) {
    setMode({ type: 'region', points: [], editId }, 'Click to add corners · double-click or Enter to finish · Backspace undoes · Esc cancels');
    showDrawing();
  }
  function showDrawing() {
    currentView = 'drawing'; setTab('regions');
    const b = body();
    b.appendChild(el('p', null, 'Click around the edge of the area on the map, one corner at a time.'));
    b.appendChild(el('p', 'muted', `${mode ? mode.points.length : 0} corner${mode && mode.points.length === 1 ? '' : 's'} so far.`));
    const r = el('div', 'btn-row');
    r.appendChild(btn('Finish shape', 'primary', finishRegion));
    r.appendChild(btn('Undo corner', 'small', () => { if (mode) { mode.points.pop(); updateDraft(); showDrawing(); } }));
    r.appendChild(btn('Cancel', 'ghost small', () => cancelMode()));
    b.appendChild(r);
  }
  function selectRegion(id, lngLat, fly) {
    const r = byRegion(id);
    if (!r) return;
    const c = centroid(r.points);
    if (fly) map.easeTo({ center: c, duration: 500 });
    openRegionPopup(r, lngLat || c);
    showRegionForm(r);
  }
  function showRegionForm(r) {
    currentView = 'region'; selectedId = r.id; setTab(null); updateStatus();
    const b = body();
    const refresh = () => { renderRegions(); if (popupKey === 'region:' + r.id) openRegionPopup(r, popup.getLngLat()); changed(); };
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All regions', 'ghost small', () => { popup.remove(); showRegions(); }));
    const name = textInput(r.name, (v) => { r.name = v; refresh(); });
    name.id = 'rf-name';
    b.appendChild(field('Name', name));
    b.appendChild(field('Description (shown when players click the area)', textInput(r.description, (v) => { r.description = v; refresh(); }, { multiline: true, rows: 5 })));
    const row = el('div', 'row');
    row.appendChild(field('Label font', fontInput(r.font, null, (v) => { r.font = v; refresh(); })));
    row.appendChild(field('Label size', selectInput([['m', 'Medium'], ['l', 'Large'], ['xl', 'Huge']], r.size, (v) => { r.size = v; refresh(); })));
    b.appendChild(row);
    b.appendChild(colorField('Color', r.color, (c) => { r.color = c; refresh(); }));
    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete region', 'danger', async () => {
      if (!(await ask(`Delete the region “${r.name || 'unnamed'}”?`, 'Delete', 'Keep it'))) return;
      data.regions = data.regions.filter((x) => x !== r);
      popup.remove(); renderRegions(); changed(); showRegions();
    }));
    foot.appendChild(btn('Redraw shape', 'small', () => startDrawing(r.id)));
    foot.appendChild(btn('Done', 'primary', () => { popup.remove(); showRegions(); }));
    b.appendChild(foot);
  }

  // --- Quests ---
  function showQuests() {
    currentView = 'quests'; selectedId = null; setTab('quests'); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(btn('+ Add quest', 'primary list-add', () => newQuest('')));
    b.appendChild(el('p', 'tip', 'New quests start hidden. Press “Reveal to players” when the party gets one, and it pops up on every open map within a couple of minutes.'));
    if (!data.quests.length) { b.appendChild(el('p', 'muted', 'No quests yet.')); return; }
    const ul = el('ul', 'pin-list');
    data.quests.forEach((q) => ul.appendChild(listButton(DEFAULTS.color, q.title || 'Untitled quest', q.revealed ? [q.status, QUEST_STATUS[q.status]] : ['hidden', 'Hidden'], () => selectQuest(q.id))));
    b.appendChild(ul);
  }
  function newQuest(locationId) {
    const q = { id: uid(), title: 'New quest', description: '', status: 'active', giver: '', locationId: locationId || '', lng: null, lat: null, revealed: false };
    data.quests.push(q);
    changed();
    showQuestForm(q);
    const n = $('#qf-title'); if (n) { n.focus(); n.select(); }
  }
  function selectQuest(id) {
    const q = byQuest(id);
    if (!q) return;
    if (q.lng != null) openQuestPopup(q); else popup.remove();
    showQuestForm(q);
  }
  function showQuestForm(q) {
    currentView = 'quest'; selectedId = q.id; setTab(null); updateStatus();
    const b = body();
    const refresh = () => { renderQuestMarkers(); if (popupKey === 'quest:' + q.id && q.lng != null) openQuestPopup(q); changed(); };
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All quests', 'ghost small', () => { popup.remove(); showQuests(); }));

    const vis = el('div', 'reveal-box' + (q.revealed ? ' on' : ''));
    vis.appendChild(el('div', null, q.revealed ? 'Players can see this quest.' : 'Hidden: players can’t see this quest yet.'));
    if (!q.revealed) {
      vis.appendChild(btn('Reveal to players & publish', 'accent', async () => {
        q.revealed = true; q.status = 'active'; refresh(); showQuestForm(q);
        await publish();
      }));
    } else {
      vis.appendChild(btn('Hide again', 'small ghost', () => { q.revealed = false; refresh(); showQuestForm(q); }));
    }
    b.appendChild(vis);

    const title = textInput(q.title, (v) => { q.title = v; refresh(); });
    title.id = 'qf-title';
    b.appendChild(field('Quest title', title));
    b.appendChild(field('Details for the logbook', textInput(q.description, (v) => { q.description = v; refresh(); }, { multiline: true, rows: 6 })));
    const row = el('div', 'row');
    row.appendChild(field('Status', selectInput(Object.entries(QUEST_STATUS), q.status, (v) => { q.status = v; refresh(); })));
    row.appendChild(field('Given by', textInput(q.giver, (v) => { q.giver = v; refresh(); }, { placeholder: 'e.g. Mayor Holt' })));
    b.appendChild(row);
    const settlements = data.locations.filter((l) => l.kind === 'settlement').map((l) => [l.id, l.name || 'Unnamed settlement']);
    b.appendChild(field('From settlement', selectInput([['', '(none)'], ...settlements], q.locationId, (v) => { q.locationId = v; refresh(); })));

    const mk = el('div', 'field', 'Quest marker on the map');
    const mr = el('div', 'btn-row');
    mr.style.marginTop = '8px';
    if (q.lng == null) {
      mr.appendChild(btn('Place “!” on map', 'small', () => setMode({ type: 'quest', id: q.id }, 'Click the map where the quest marker goes · Esc to cancel')));
    } else {
      mr.appendChild(btn('Move marker', 'small', () => setMode({ type: 'quest', id: q.id }, 'Click the new spot for the quest marker · Esc to cancel')));
      mr.appendChild(btn('Remove marker', 'small ghost', () => { q.lng = null; q.lat = null; popup.remove(); refresh(); showQuestForm(q); }));
    }
    mk.appendChild(mr);
    b.appendChild(mk);

    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete quest', 'danger', async () => {
      if (!(await ask(`Delete the quest “${q.title || 'untitled'}”?`, 'Delete', 'Keep it'))) return;
      data.quests = data.quests.filter((x) => x !== q);
      popup.remove(); renderQuestMarkers(); changed(); showQuests();
    }));
    foot.appendChild(btn('Done', 'primary', () => { popup.remove(); showQuests(); }));
    b.appendChild(foot);
  }

  // --- Settings ---
  function showSettings() {
    currentView = 'settings'; selectedId = null; setTab('settings'); updateStatus(); popup.remove();
    const b = body();
    b.innerHTML = SETTINGS_HTML;
    const q = (id) => b.querySelector('#' + id);

    q('st-title').value = data.title;
    q('st-show').checked = data.showTitle;
    fillFonts(q('st-tfont'), data.titleFont);
    q('st-title').oninput = (e) => { data.title = e.target.value; applyTitle(); changed(); };
    q('st-show').onchange = (e) => { data.showTitle = e.target.checked; applyTitle(); changed(); };
    q('st-tfont').onchange = (e) => { data.titleFont = e.target.value; applyTitle(); changed(); };
    fillFonts(q('st-dtfont'), data.defaults.titleFont);
    fillFonts(q('st-dbfont'), data.defaults.bodyFont);
    q('st-dsize').value = data.defaults.textSize;
    q('st-dtfont').onchange = (e) => { data.defaults.titleFont = e.target.value; renderMarkers(); changed(); };
    q('st-dbfont').onchange = (e) => { data.defaults.bodyFont = e.target.value; changed(); };
    q('st-dsize').onchange = (e) => { data.defaults.textSize = e.target.value; changed(); };
    colorPicker(q('st-dcolor'), data.defaults.color, (c) => { data.defaults.color = c; renderMarkers(); changed(); });

    const cfg = ghConfig();
    q('gh-user').value = cfg.user; q('gh-repo').value = cfg.repo; q('gh-branch').value = cfg.branch;
    q('gh-token').value = cfg.token; q('gh-remember').checked = cfg.remember;
    const readCfg = () => ({
      user: q('gh-user').value.trim(), repo: q('gh-repo').value.trim(), branch: q('gh-branch').value.trim() || 'main',
      token: q('gh-token').value.trim(), remember: q('gh-remember').checked
    });
    ['gh-user', 'gh-repo', 'gh-branch', 'gh-token', 'gh-remember'].forEach((id) => { q(id).onchange = () => saveGhConfig(readCfg()); });
    q('gh-test').onclick = async () => {
      const c = readCfg();
      saveGhConfig(c);
      if (!c.user || !c.repo || !c.token) { toast('Fill in username, repository and key first.', 'warn'); return; }
      try {
        await ghApi(c, 'GET', `/git/ref/heads/${c.branch}`);
        toast(`Connected to ${c.user}/${c.repo} (${c.branch}). You can publish now.`, 'ok', 6000);
      } catch (e) { toast('Connection failed: ' + e.message + '.', 'error', 9000); }
    };
    q('gh-forget').onclick = () => { q('gh-token').value = ''; saveGhConfig(readCfg()); toast('Key removed from this device.', 'ok'); };
    q('bk-down').onclick = downloadData;
    q('bk-load').onchange = async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const d = parseDataFile(await f.text());
        if (!(await ask(`Replace the current map with “${f.name}” (${d.locations.length} pins, ${d.regions.length} regions, ${d.quests.length} quests)?`, 'Replace', 'Cancel'))) return;
        data = d;
        renderAll(); changed(); showSettings();
        toast('Loaded. Press Publish to make it live.', 'ok');
      } catch (err) { toast('That file isn’t a map data file.', 'error'); }
    };
  }

  function downloadData() {
    const url = URL.createObjectURL(new Blob([serialize(data)], { type: 'text/javascript' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'map-data.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Downloaded map-data.js. It belongs in the “data” folder of your site.', 'ok', 6000);
  }

  // ===== GitHub publishing =====
  const GH_KEY = 'campaign-map.github', TOKEN_KEY = 'campaign-map.token';
  function guessRepo() {
    const m = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
    if (!m) return { user: '', repo: '' };
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return { user: m[1], repo: seg && !/\.html?$/i.test(seg) ? seg : m[1] + '.github.io' };
  }
  function ghConfig() {
    let cfg = {}, token = '';
    try { cfg = JSON.parse(localStorage.getItem(GH_KEY) || '{}'); } catch (e) { /* ignore */ }
    try { token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { /* ignore */ }
    const g = guessRepo();
    return { user: cfg.user || g.user, repo: cfg.repo || g.repo, branch: cfg.branch || 'main', token, remember: cfg.remember !== false };
  }
  function saveGhConfig(c) {
    try {
      localStorage.setItem(GH_KEY, JSON.stringify({ user: c.user, repo: c.repo, branch: c.branch, remember: c.remember }));
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      if (c.token) (c.remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, c.token);
    } catch (e) { /* storage blocked */ }
  }
  function ghErrorText(status, msg) {
    const extra = msg ? ` (${msg})` : '';
    if (status === 401) return 'GitHub didn’t accept the key. It may be mistyped or expired';
    if (status === 403) return 'the key isn’t allowed to change this repository. It needs “Contents: Read and write”' + extra;
    if (status === 404) return 'repository, branch or file not found. Check the names, and that the key was given access to this repository';
    if (status === 409 || status === 422) return 'GitHub refused the update' + extra + '. Try again';
    return `GitHub error ${status}${extra}`;
  }
  async function ghApi(cfg, method, path, payload, raw) {
    let res;
    try {
      res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}${path}`, {
        method,
        cache: 'no-store',
        headers: Object.assign({
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          Authorization: 'Bearer ' + cfg.token,
          'X-GitHub-Api-Version': '2022-11-28'
        }, payload ? { 'Content-Type': 'application/json' } : {}),
        body: payload ? JSON.stringify(payload) : undefined
      });
    } catch (e) {
      throw new Error('couldn’t reach GitHub. Check your internet connection');
    }
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch (e) { /* ignore */ }
      throw new Error(ghErrorText(res.status, msg));
    }
    return raw ? res.text() : res.json();
  }
  async function ghLoadData(cfg) {
    const text = await ghApi(cfg, 'GET', `/contents/${DATA_PATH}?ref=${encodeURIComponent(cfg.branch)}`, null, true);
    return parseDataFile(text);
  }
  async function ghCommit(cfg, files, message) {
    const ref = await ghApi(cfg, 'GET', `/git/ref/heads/${cfg.branch}`);
    const head = await ghApi(cfg, 'GET', `/git/commits/${ref.object.sha}`);
    const tree = [];
    for (const f of files) {
      const blob = await ghApi(cfg, 'POST', '/git/blobs', f.text != null ? { content: f.text, encoding: 'utf-8' } : { content: f.base64, encoding: 'base64' });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const newTree = await ghApi(cfg, 'POST', '/git/trees', { base_tree: head.tree.sha, tree });
    const commit = await ghApi(cfg, 'POST', '/git/commits', { message, tree: newTree.sha, parents: [ref.object.sha] });
    await ghApi(cfg, 'PATCH', `/git/refs/heads/${cfg.branch}`, { sha: commit.sha });
  }
  // Turn every uploaded picture (pins, shops, people) into its own file.
  function extractImages(node, files) {
    if (Array.isArray(node)) { node.forEach((n) => extractImages(n, files)); return; }
    if (!node || typeof node !== 'object') return;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === 'image' && typeof v === 'string') {
        const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(v);
        if (!m) continue;
        const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[m[1].toLowerCase()] || 'img';
        const path = `${IMAGE_DIR}${node.id || uid()}-${Date.now().toString(36)}${files.length}.${ext}`;
        files.push({ path, base64: m[2] });
        imageCache[path] = v;
        node[k] = path;
      } else if (v && typeof v === 'object') extractImages(v, files);
    }
  }
  async function publish() {
    if (busy) return;
    const cfg = ghConfig();
    if (!cfg.user || !cfg.repo || !cfg.token) {
      showSettings();
      toast('Connect GitHub under “Publishing” first (or use “Download data file”).', 'warn', 7000);
      const t = $('#gh-token');
      if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); }
      return;
    }
    busy = true;
    $('#veil').hidden = false;
    try {
      const out = clone(data), files = [];
      extractImages(out, files);
      files.push({ path: DATA_PATH, text: serialize(out) });
      const n = out.locations.length;
      await ghCommit(cfg, files, `Update map (${n} pin${n === 1 ? '' : 's'}, ${out.quests.length} quests)`);
      clearTimeout(saveTimer);
      published = clone(out);
      data = clone(out);
      await idb.del('draft').catch(() => {});
      renderAll();
      refreshView();
      toast('Published! Everyone with the map open will see it within a couple of minutes.', 'ok', 8000);
    } catch (e) {
      toast('Publishing failed: ' + e.message + '.', 'error', 10000);
    } finally {
      busy = false;
      $('#veil').hidden = true;
      updateStatus();
    }
  }

  init();
})();
