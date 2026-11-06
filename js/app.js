/*
 * Campaign Map
 * - Everyone sees the map and can click pins to read their pop-ups.
 * - The owner opens the site with  #edit  at the end of the address to edit,
 *   then presses Publish (needs the owner's GitHub key, which only lives in the owner's browser).
 */
(() => {
  'use strict';

  // ===== Settings =====
  // The area from your screenshot. Nobody can pan or zoom out beyond it.
  const LOCK_BOUNDS = [[-80.3468, 32.6128], [-79.4618, 33.0272]];
  const CARTO_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
  const DATA_PATH = 'data/map-data.js';
  const IMAGE_DIR = 'images/';
  // Colors measured from your screenshot.
  const COLORS = {
    land: '#101010', builtUp: '#191919', marsh: '#101010', woods: '#090909', water: '#030303',
    minor: '#262626', major: '#2b2b2b', main: '#323232', highway: '#424242'
  };
  const PIN_COLORS = ['#e8b04a', '#d64545', '#ff7a2f', '#3fbf7f', '#2ec4b6', '#4a90e2', '#9b6dff', '#e8e2d0'];
  // Google Fonts offered in the editor. [name, has a bold weight, fallback]
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
  const DEFAULTS = { titleFont: 'Cinzel', bodyFont: 'Spectral', textSize: 'm', color: '#e8b04a' };
  const POPUP_OFFSET = {
    center: [0, -20], top: [0, 6], 'top-left': [0, 6], 'top-right': [0, 6],
    bottom: [0, -42], 'bottom-left': [0, -42], 'bottom-right': [0, -42], left: [16, -20], right: [-16, -20]
  };

  // ===== Small helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round6 = (n) => Math.round(n * 1e6) / 1e6;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeColor = (c, fallback = PIN_COLORS[0]) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : fallback);
  const fontInfo = (name) => FONTS.find((f) => f.name === name);
  const validFont = (name, fallback) => (fontInfo(name) ? name : fallback);
  const fontStack = (name) => { const f = fontInfo(name) || FONTS[0]; return `'${f.name}', ${f.fallback}`; };

  function safeImageSrc(src) {
    if (typeof src !== 'string') return '';
    src = src.trim();
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(src)) return src;
    if (/^https?:\/\/\S+$/i.test(src)) return src;
    if (/^[\w\-./]+$/.test(src) && !src.includes('..') && !src.startsWith('/')) return src; // e.g. images/tower.jpg
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

  // Safe mini-formatting for descriptions: **bold**, *italic*, [text](https://link), "- " bullets.
  function richText(text) {
    let h = esc(text);
    h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
    h = h.replace(/^- (.*)$/gm, '&bull; $1');
    return h.replace(/\n/g, '<br>');
  }

  function toast(msg, kind = 'info', ms = 4500) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function ask(message, yes = 'OK', no = 'Cancel') {
    return new Promise((resolve) => {
      const d = document.createElement('div');
      d.className = 'modal';
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

  // Tiny IndexedDB key/value store for drafts (room for images, unlike localStorage).
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
      locations: []
    };
    for (const l of Array.isArray(d.locations) ? d.locations : []) {
      if (!l || !isFinite(l.lng) || !isFinite(l.lat)) continue;
      out.locations.push({
        id: typeof l.id === 'string' && l.id ? l.id : uid(),
        name: String(l.name || ''),
        description: String(l.description || ''),
        lng: +l.lng, lat: +l.lat,
        titleFont: validFont(l.titleFont, ''),
        bodyFont: validFont(l.bodyFont, ''),
        textSize: SIZES[l.textSize] ? l.textSize : '',
        color: safeColor(l.color, ''),
        image: safeImageSrc(l.image)
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
      s.src = DATA_PATH + '?v=' + Date.now(); // always get the newest version
      s.onload = () => resolve(window.MAP_DATA);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  // ===== Map style (no labels, no airports, parks, buildings or other places) =====
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
    return { version: 8, sources: { base: source }, layers: baseLayers('base') };
  }

  // ===== App state =====
  let map, popup, published, data, panel = null;
  let editing = false, placing = false, busy = false;
  let popupLocId = null, currentView = 'list', selectedId = null, saveTimer = null;
  const markers = new Map();
  const imageCache = {}; // just-published images, shown from memory until the live site catches up
  const resolveImage = (src) => imageCache[src] || src;
  const byId = (id) => data.locations.find((l) => l.id === id);

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
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: 'none', offset: POPUP_OFFSET, className: 'loc-popup', focusAfterOpen: false });
    popup.on('close', () => { popupLocId = null; highlight(null); });
    map.on('click', onMapClick);
    renderMarkers();

    $('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', checkHash);
    window.campaignMap = { get map() { return map; }, get data() { return data; } }; // handy for debugging
    checkHash();
  }

  function checkHash() {
    if (location.hash === '#edit') enterEdit();
    else if (editing) exitEdit();
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
    else if (placing) stopPlacing();
    else if (popup) popup.remove();
  }

  function applyTitle() {
    document.title = data.title || 'Campaign Map';
    const el = $('#map-title');
    const show = data.showTitle && !!data.title.trim();
    el.hidden = !show;
    if (show) {
      loadFont(data.titleFont);
      el.textContent = data.title;
      el.style.fontFamily = fontStack(data.titleFont);
    }
  }

  // ===== Pins =====
  function pinSvg(color) {
    return '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true">' +
      `<path d="M15 1.5C7.5 1.5 1.5 7.4 1.5 14.8 1.5 24.8 15 38.5 15 38.5S28.5 24.8 28.5 14.8C28.5 7.4 22.5 1.5 15 1.5z" fill="${color}" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>` +
      '<circle cx="15" cy="14.6" r="5" fill="rgba(0,0,0,.5)"/></svg>';
  }

  function addMarker(loc) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pin' + (loc.id === popupLocId ? ' selected' : '');
    el.setAttribute('aria-label', loc.name || 'Untitled place');
    el.innerHTML = pinSvg(safeColor(loc.color || data.defaults.color)) + '<span class="pin-label"></span>';
    el.lastChild.textContent = loc.name || 'Untitled place';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editing) selectPin(loc.id); else openPopup(loc);
    });
    const m = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: editing })
      .setLngLat([loc.lng, loc.lat]).addTo(map);
    m.on('dragend', () => {
      const p = m.getLngLat();
      loc.lng = round6(p.lng); loc.lat = round6(p.lat);
      if (popupLocId === loc.id) popup.setLngLat(p);
      changed();
    });
    markers.set(loc.id, m);
  }
  function removeMarker(id) { const m = markers.get(id); if (m) { m.remove(); markers.delete(id); } }
  function updateMarker(loc) { removeMarker(loc.id); addMarker(loc); }
  function renderMarkers() {
    for (const m of markers.values()) m.remove();
    markers.clear();
    data.locations.forEach(addMarker);
  }
  function highlight(id) {
    for (const [mid, m] of markers) m.getElement().classList.toggle('selected', mid === id);
  }

  // ===== Pop-ups =====
  function popupContent(loc) {
    const d = data.defaults;
    const tf = loc.titleFont || d.titleFont, bf = loc.bodyFont || d.bodyFont;
    loadFont(tf); loadFont(bf);
    const wrap = document.createElement('div');
    wrap.className = 'pop';
    wrap.style.setProperty('--pin', safeColor(loc.color || d.color));
    wrap.style.setProperty('--size', (SIZES[loc.textSize || d.textSize] || 16) + 'px');
    const src = safeImageSrc(loc.image);
    if (src) {
      const img = document.createElement('img');
      img.className = 'pop-img';
      img.alt = loc.name || '';
      img.src = resolveImage(src);
      img.addEventListener('load', () => {
        if (popup.isOpen()) popup.setLngLat(popup.getLngLat()); // re-pick above/below now that it's taller
        keepPopupInView();
      });
      img.addEventListener('click', () => {
        const lb = $('#lightbox');
        lb.querySelector('img').src = img.src;
        lb.querySelector('img').alt = img.alt;
        lb.hidden = false;
      });
      wrap.appendChild(img);
    }
    const h = document.createElement('h3');
    h.className = 'pop-title';
    h.textContent = loc.name || 'Untitled place';
    h.style.fontFamily = fontStack(tf);
    h.style.fontWeight = fontInfo(tf) && fontInfo(tf).bold ? '700' : '400';
    wrap.appendChild(h);
    if (loc.description.trim()) {
      const body = document.createElement('div');
      body.className = 'pop-body';
      body.style.fontFamily = fontStack(bf);
      body.innerHTML = richText(loc.description);
      wrap.appendChild(body);
    }
    return wrap;
  }

  function openPopup(loc) {
    popupLocId = loc.id;
    const content = popupContent(loc);
    // The map is locked, so it can't always scroll out of the way: size the pop-up to the
    // bigger space above or below the pin.
    const p = map.project([loc.lng, loc.lat]);
    const room = Math.max(p.y - 56, map.getContainer().clientHeight - p.y - 22);
    content.style.maxHeight = Math.max(140, Math.min(room, 560)) + 'px';
    const img = content.querySelector('.pop-img');
    if (img) img.style.maxHeight = Math.round(Math.max(90, Math.min(220, room * 0.42))) + 'px';
    popup.setLngLat([loc.lng, loc.lat]).setDOMContent(content);
    if (!popup.isOpen()) popup.addTo(map);
    highlight(loc.id);
    requestAnimationFrame(keepPopupInView);
  }

  function keepPopupInView() {
    if (!popup || !popup.isOpen()) return;
    const el = popup.getElement();
    if (!el) return;
    const r = el.getBoundingClientRect(), c = map.getContainer().getBoundingClientRect(), pad = 10;
    let dx = 0, dy = 0;
    if (r.top < c.top + pad) dy = r.top - (c.top + pad);
    else if (r.bottom > c.bottom - pad) dy = r.bottom - (c.bottom - pad);
    if (r.left < c.left + pad) dx = r.left - (c.left + pad);
    else if (r.right > c.right - pad) dx = r.right - (c.right - pad);
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) map.panBy([dx, dy], { duration: 300 });
  }

  function onMapClick(e) {
    const t = e.originalEvent && e.originalEvent.target;
    if (t && t.closest && (t.closest('.pin') || t.closest('.maplibregl-popup'))) return;
    if (editing && placing) { placePin(e.lngLat); return; }
    popup.remove();
    if (editing && currentView === 'pin') showList();
  }

  // ===== Editor =====
  const PANEL_HTML = `
    <div class="ed-head"><div class="ed-title">Map editor</div><div class="ed-status" id="ed-status"></div></div>
    <div class="ed-actions">
      <button type="button" class="btn primary" id="ed-add">+ Add pin</button>
      <button type="button" class="btn accent" id="ed-publish">Publish</button>
    </div>
    <div class="ed-tabs"><button type="button" data-tab="list">Pins</button><button type="button" data-tab="settings">Settings</button></div>
    <div class="ed-body" id="ed-body"></div>
    <div class="ed-foot"><span class="muted small">Only you can publish changes.</span>
      <button type="button" class="btn ghost small" id="ed-exit">Exit editor</button></div>`;

  const PIN_FORM_HTML = `
    <div class="form-head"><button type="button" class="btn ghost small" id="pf-back">&larr; All pins</button></div>
    <label>Name<input id="pf-name" maxlength="140" autocomplete="off"></label>
    <label>Description<textarea id="pf-desc" rows="7"></textarea></label>
    <p class="tip">**bold** &nbsp; *italic* &nbsp; [link text](https://…) &nbsp; start a line with "- " for a bullet</p>
    <div class="row">
      <label>Title font<select id="pf-tfont"></select></label>
      <label>Text font<select id="pf-bfont"></select></label>
    </div>
    <label>Text size<select id="pf-size"><option value="">Default</option><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></select></label>
    <div class="field">Pin color<div class="swatches" id="pf-colors"></div></div>
    <div class="field">Image (optional)
      <div class="img-box" id="pf-imgbox"><img id="pf-imgprev" alt=""><button type="button" class="btn small ghost" id="pf-imgdel">Remove image</button></div>
      <div class="img-actions"><label class="btn small" style="margin:0;color:var(--text)">Upload&hellip;<input type="file" id="pf-file" accept="image/*" hidden></label>
        <input id="pf-url" placeholder="&hellip;or paste an image link (https://)" autocomplete="off"></div>
    </div>
    <div class="form-foot"><button type="button" class="btn danger" id="pf-delete">Delete pin</button><button type="button" class="btn primary" id="pf-done">Done</button></div>
    <p class="tip" style="margin-top:14px">Tip: drag the pin on the map to move it.</p>`;

  const SETTINGS_HTML = `
    <section>
      <h4>Map name</h4>
      <label>Name (also the browser tab title)<input id="st-title" maxlength="80" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="st-show"> Show the name on the map</label>
      <label>Name font<select id="st-tfont"></select></label>
    </section>
    <section>
      <h4>Defaults for pins</h4>
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
    FONTS.forEach((f) => loadFont(f.name));
    panel = document.createElement('aside');
    panel.className = 'editor';
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);
    $('#ed-add').onclick = () => (placing ? stopPlacing() : startPlacing());
    $('#ed-publish').onclick = publish;
    $('#ed-exit').onclick = () => { location.hash = ''; };
    panel.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => (b.dataset.tab === 'list' ? showList() : showSettings()); });
    map.resize();

    // Start from the newest published version (if GitHub is connected) or a saved draft.
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
      } catch (e) { /* broken draft, ignore */ }
    }
    if (!editing) return;
    popup.remove();
    renderMarkers();
    applyTitle();
    showList();
  }

  function exitEdit() {
    const hadChanges = isDirty();
    editing = false;
    stopPlacing();
    if (panel) panel.remove();
    panel = null;
    document.body.classList.remove('editing');
    data = clone(published);
    popup.remove();
    renderMarkers();
    applyTitle();
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
    if (!panel) return;
    panel.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  }

  function startPlacing() {
    placing = true;
    document.body.classList.add('placing');
    $('#hint').hidden = false;
    const b = $('#ed-add'); if (b) b.textContent = 'Cancel';
  }
  function stopPlacing() {
    placing = false;
    document.body.classList.remove('placing');
    $('#hint').hidden = true;
    const b = $('#ed-add'); if (b) b.textContent = '+ Add pin';
  }

  function placePin(ll) {
    stopPlacing();
    const loc = { id: uid(), name: 'New place', description: '', lng: round6(ll.lng), lat: round6(ll.lat), titleFont: '', bodyFont: '', textSize: '', color: '', image: '' };
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

  function showList() {
    currentView = 'list';
    selectedId = null;
    setTab('list');
    updateStatus();
    const body = $('#ed-body');
    body.innerHTML = '';
    if (!data.locations.length) {
      body.innerHTML = '<p class="muted">No pins yet. Press <b>+ Add pin</b>, then click the map.</p>';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'pin-list';
    data.locations.forEach((loc) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="dot" style="background:${safeColor(loc.color || data.defaults.color)}"></span><span></span>`;
      b.lastChild.textContent = loc.name || 'Untitled place';
      b.onclick = () => selectPin(loc.id, true);
      li.appendChild(b);
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  function fillFonts(sel, value, defaultLabel) {
    sel.innerHTML = '';
    if (defaultLabel) sel.add(new Option(defaultLabel, ''));
    FONTS.forEach((f) => {
      const o = new Option(f.name, f.name);
      o.style.fontFamily = fontStack(f.name);
      sel.add(o);
    });
    sel.value = value || (defaultLabel ? '' : FONTS[0].name);
    const paint = () => { sel.style.fontFamily = sel.value ? fontStack(sel.value) : ''; };
    paint();
    sel.addEventListener('change', paint);
  }

  function colorPicker(box, value, onPick) {
    box.innerHTML = '';
    const custom = document.createElement('input');
    const mark = (v) => box.querySelectorAll('.sw').forEach((b) => b.classList.toggle('on', b.dataset.c === v));
    PIN_COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.dataset.c = c; b.style.background = c; b.title = c;
      b.onclick = () => { custom.value = c; mark(c); onPick(c); };
      box.appendChild(b);
    });
    custom.type = 'color'; custom.className = 'sw-custom'; custom.title = 'Pick any color';
    custom.value = safeColor(value);
    custom.oninput = () => { mark(custom.value); onPick(custom.value); };
    box.appendChild(custom);
    mark(safeColor(value));
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

  function showPinForm(loc) {
    currentView = 'pin';
    selectedId = loc.id;
    setTab(null);
    updateStatus();
    const body = $('#ed-body');
    body.innerHTML = PIN_FORM_HTML;
    body.scrollTop = 0;
    const q = (id) => body.querySelector('#' + id);
    const refresh = () => { updateMarker(loc); if (popupLocId === loc.id) openPopup(loc); changed(); };

    q('pf-name').value = loc.name;
    q('pf-desc').value = loc.description;
    fillFonts(q('pf-tfont'), loc.titleFont, `Default (${data.defaults.titleFont})`);
    fillFonts(q('pf-bfont'), loc.bodyFont, `Default (${data.defaults.bodyFont})`);
    q('pf-size').value = loc.textSize;
    q('pf-name').oninput = (e) => { loc.name = e.target.value; refresh(); };
    q('pf-desc').oninput = (e) => { loc.description = e.target.value; refresh(); };
    q('pf-tfont').onchange = (e) => { loc.titleFont = e.target.value; refresh(); };
    q('pf-bfont').onchange = (e) => { loc.bodyFont = e.target.value; refresh(); };
    q('pf-size').onchange = (e) => { loc.textSize = e.target.value; refresh(); };
    colorPicker(q('pf-colors'), loc.color || data.defaults.color, (c) => { loc.color = c; refresh(); });

    const showImg = () => {
      const src = safeImageSrc(loc.image);
      q('pf-imgbox').hidden = !src;
      if (src) q('pf-imgprev').src = resolveImage(src);
      q('pf-url').value = /^https?:/i.test(src) ? src : '';
    };
    showImg();
    q('pf-file').onchange = async (e) => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { loc.image = await fileToDataUrl(f); showImg(); refresh(); } catch (err) { toast('That file couldn’t be used as an image.', 'error'); }
    };
    q('pf-url').onchange = (e) => {
      const v = e.target.value.trim();
      if (v && !/^https?:\/\/\S+$/i.test(v)) { toast('Image links need to start with https://', 'warn'); return; }
      loc.image = v; showImg(); refresh();
    };
    q('pf-imgdel').onclick = () => { loc.image = ''; showImg(); refresh(); };
    q('pf-delete').onclick = async () => {
      if (!(await ask(`Delete “${loc.name || 'this pin'}”?`, 'Delete', 'Keep it'))) return;
      data.locations = data.locations.filter((l) => l !== loc);
      removeMarker(loc.id);
      popup.remove();
      changed();
      showList();
    };
    q('pf-done').onclick = q('pf-back').onclick = () => { popup.remove(); showList(); };
  }

  function showSettings() {
    currentView = 'settings';
    selectedId = null;
    setTab('settings');
    updateStatus();
    popup.remove();
    const body = $('#ed-body');
    body.innerHTML = SETTINGS_HTML;
    const q = (id) => body.querySelector('#' + id);

    q('st-title').value = data.title;
    q('st-show').checked = data.showTitle;
    fillFonts(q('st-tfont'), data.titleFont);
    q('st-title').oninput = (e) => { data.title = e.target.value; applyTitle(); changed(); };
    q('st-show').onchange = (e) => { data.showTitle = e.target.checked; applyTitle(); changed(); };
    q('st-tfont').onchange = (e) => { data.titleFont = e.target.value; applyTitle(); changed(); };

    fillFonts(q('st-dtfont'), data.defaults.titleFont);
    fillFonts(q('st-dbfont'), data.defaults.bodyFont);
    q('st-dsize').value = data.defaults.textSize;
    q('st-dtfont').onchange = (e) => { data.defaults.titleFont = e.target.value; changed(); };
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
        if (!(await ask(`Replace the current map with the ${d.locations.length} pins in “${f.name}”?`, 'Replace', 'Cancel'))) return;
        data = d;
        renderMarkers(); applyTitle(); changed(); showSettings();
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
  async function ghApi(cfg, method, path, body, raw) {
    let res;
    try {
      res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}${path}`, {
        method,
        cache: 'no-store',
        headers: Object.assign({
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          Authorization: 'Bearer ' + cfg.token,
          'X-GitHub-Api-Version': '2022-11-28'
        }, body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined
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
  // One commit with every changed file (data file + any new images).
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

  async function publish() {
    if (busy) return;
    const cfg = ghConfig();
    if (!cfg.user || !cfg.repo || !cfg.token) {
      showSettings();
      toast('Connect GitHub under “Publishing” first (or use “Download data file”).', 'warn', 7000);
      const t = $('#gh-token');
      if (t) { t.scrollIntoView({ block: 'center' }); if (!$('#gh-user').value) $('#gh-user').focus(); else t.focus(); }
      return;
    }
    busy = true;
    $('#veil').hidden = false;
    try {
      const out = clone(data), files = [];
      for (const loc of out.locations) {
        const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(loc.image || '');
        if (!m) continue;
        const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[m[1].toLowerCase()] || 'img';
        const path = `${IMAGE_DIR}${loc.id}-${Date.now().toString(36)}.${ext}`;
        files.push({ path, base64: m[2] });
        imageCache[path] = loc.image;
        loc.image = path;
      }
      files.push({ path: DATA_PATH, text: serialize(out) });
      const n = out.locations.length;
      await ghCommit(cfg, files, `Update map (${n} pin${n === 1 ? '' : 's'})`);
      clearTimeout(saveTimer);
      published = clone(out);
      data = clone(out);
      await idb.del('draft').catch(() => {});
      renderMarkers();
      applyTitle();
      if (currentView === 'pin' && selectedId && byId(selectedId)) selectPin(selectedId);
      else if (currentView === 'settings') showSettings();
      else showList();
      toast('Published! Anyone with the link will see it within a minute or two.', 'ok', 8000);
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
