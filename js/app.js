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
  const REGION_SIZES = { m: 22, l: 34, xl: 52 }; // biggest a region name may get
  // Symbols drawn inside pins (24x24 icons).
  const SYMBOLS = {
    dot: ['Dot', 'M12 4a8 8 0 1 1-.01 0z'],
    castle: ['Castle', 'M3 21V9h3v2h2V9h2v2h4V9h2v2h2V9h3v12h-7v-4a2 2 0 0 0-4 0v4z'],
    tower: ['Tower', 'M7 21V9H5V3h3v2h2V3h4v2h2V3h3v6h-2v12zm4-8v3h2v-3z'],
    house: ['House', 'M2 11.5 12 3l10 8.5h-3V21h-5v-6h-4v6H5v-9.5z'],
    tent: ['Camp', 'M12 3 1 21h8l3-6 3 6h8z'],
    tavern: ['Tavern', 'M4 5h12v3h2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-2v3H4zm12 5v6h2a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1z'],
    shop: ['Shop', 'M9 2h6l-2 3.2A7.5 7.5 0 0 1 19.5 13c0 5-3.3 9-7.5 9s-7.5-4-7.5-9A7.5 7.5 0 0 1 11 5.2z'],
    temple: ['Temple', 'M12 1 2 7h20zM4 9h3v9H4zm6.5 0h3v9h-3zM17 9h3v9h-3zM2 19h20v3H2z'],
    skull: ['Skull', 'M12 2a8.5 8.5 0 0 0-8.5 8.5c0 3 1.4 5.3 3.5 6.6V21h10v-3.9c2.1-1.3 3.5-3.6 3.5-6.6A8.5 8.5 0 0 0 12 2zM6.8 11a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0zm6 0a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0z'],
    swords: ['Battle', 'M3 2h4l9 9-2 2-9-9zm18 0h-4l-9 9 2 2 9-9zM5 15l4 4-2 2-1-1-2 2-1-1 2-2-1-1zm14 0-4 4 2 2 1-1 2 2 1-1-2-2 1-1z'],
    shield: ['Fort', 'M12 2 3.5 5v6.5c0 5.2 3.6 9.3 8.5 10.5 4.9-1.2 8.5-5.3 8.5-10.5V5z'],
    crown: ['Capital', 'M2 7l5.5 4.5L12 4l4.5 7.5L22 7l-2.5 12h-15z'],
    anchor: ['Harbor', 'M12 2a2.5 2.5 0 0 1 1 4.8V8h3v2h-3v9a6 6 0 0 0 5.5-5H16l3.5-4.5L23 14h-2.5A8.5 8.5 0 0 1 3.5 14H1l3.5-4.5L8 14H5.5A6 6 0 0 0 11 19v-9H8V8h3V6.8A2.5 2.5 0 0 1 12 2z'],
    ship: ['Ship', 'M2 15h20l-3.5 6h-13zM11 2h2v12h-2zm3 2 6 9h-6zm-4 1-5 8h5z'],
    tree: ['Forest', 'M12 1 5 11h4l-4 6h6v5h2v-5h6l-4-6h4z'],
    mountain: ['Mountain', 'M1 21 9 7l4 6.5 3-4.5 7 12z'],
    cave: ['Cave', 'M1 21C1 11 6 4 12 4s11 7 11 17h-7c0-4-1.8-7-4-7s-4 3-4 7z'],
    fire: ['Campfire', 'M12 1c3.5 4.5 6 7 6 10.5a6 6 0 0 1-12 0c0-2.3 1.2-3.8 2.5-5 0 2.3 1 3.5 2.3 3.5 0-3.5-1-6 1.2-9zM3 19.5l18-2.5v2L3 22zm18 0L3 17v2l18 3z'],
    star: ['Star', 'M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.4L12 17.8 5.4 21.8l1.8-7.4L1.5 9.5 9 8.9z'],
    flag: ['Flag', 'M5 2h2v20H5zm3 1h12l-3 4.5 3 4.5H8z'],
    key: ['Key', 'M7.5 7a5 5 0 1 0 4.6 7H15v2.5h2.5V14h2v2.5H22V10h-9.9A5 5 0 0 0 7.5 7zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z'],
    gem: ['Treasure', 'M6 3h12l5 6.5L12 22 1 9.5z'],
    potion: ['Potion', 'M9 2h6v2h-1v4.6c3.2 1 5.5 3.8 5.5 7A7.5 7.5 0 0 1 4.5 15.6c0-3.2 2.3-6 5.5-7V4H9z'],
    book: ['Library', 'M3 4c3.2-1.2 6.5-1 9 1 2.5-2 5.8-2.2 9-1v16c-3.2-1.2-6.5-1-9 1-2.5-2-5.8-2.2-9-1z'],
    eye: ['Mystery', 'M12 5C5.5 5 1 12 1 12s4.5 7 11 7 11-7 11-7-4.5-7-11-7zm0 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z'],
    portal: ['Portal', 'M12 2c4.4 0 7 4.5 7 10s-2.6 10-7 10-7-4.5-7-10 2.6-10 7-10zm0 3c-2.4 0-4 3.1-4 7s1.6 7 4 7 4-3.1 4-7-1.6-7-4-7z']
  };
  const SYMBOL_COLORS = ['#141414', '#ffffff', ...PIN_COLORS];
  // Sticker library (drawings in images/stickers/). They're drawn in this ink color, which can be swapped.
  const STICKERS_ON = false; // set to true to turn the Stickers tab on (also upload images/stickers/)
  const STICKER_INK = '#e6dcc3';
  const STICKERS = [
    ['great-old-one', 'The Great Old One'], ['kraken-arms', 'Kraken arms'], ['deep-one', 'Deep one'],
    ['watching-eye', 'The watching eye'], ['shoggoth', 'Shoggoth'], ['elder-sign', 'Elder sign'],
    ['sunken-spires', 'Sunken spires'], ['sea-serpent', 'Sea serpent'], ['tentacle-moon', 'Tentacled moon'],
    ['hand-from-the-deep', 'Hand from the deep']
  ];
  const INK_COLORS = [STICKER_INK, '#ffffff', '#9fd8b0', '#7fd1c9', '#e05a5a', '#b48cff', '#e8b04a', '#141414'];
  const STICKER_ZOOM = 11; // a sticker's size is measured at this zoom; it grows and shrinks with the map
  const clampScale = (v) => { const n = num(v); return n == null ? 1 : Math.min(3, Math.max(0.4, n)); };
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
      quests: [],
      fog: [],
      stickers: [],
      monsters: []
    };
    for (const m of arr(d.monsters)) {
      if (!m) continue;
      const score = (v) => Math.min(30, Math.max(1, Math.round(num(v) || 10)));
      out.monsters.push({
        id: str(m.id) || uid(), name: str(m.name), meta: str(m.meta), image: safeImageSrc(m.image),
        ac: str(m.ac), hp: str(m.hp), speed: str(m.speed),
        str: score(m.str), dex: score(m.dex), con: score(m.con), int: score(m.int), wis: score(m.wis), cha: score(m.cha),
        saves: str(m.saves), skills: str(m.skills), resist: str(m.resist), senses: str(m.senses), languages: str(m.languages), cr: str(m.cr),
        traits: str(m.traits), actions: str(m.actions), reactions: str(m.reactions), legendary: str(m.legendary), notes: str(m.notes),
        revealed: !!m.revealed
      });
    }
    for (const s of arr(d.stickers)) {
      if (!s || num(s.lng) == null || num(s.lat) == null) continue;
      const lib = STICKERS.some(([k]) => k === s.lib) ? s.lib : '';
      const image = lib ? '' : safeImageSrc(s.image);
      if (!lib && !image) continue;
      out.stickers.push({
        id: str(s.id) || uid(), lib, image, lng: num(s.lng), lat: num(s.lat),
        size: Math.min(600, Math.max(20, num(s.size) || 140)),
        rotation: Math.min(180, Math.max(-180, num(s.rotation) || 0)),
        opacity: Math.min(1, Math.max(0.15, num(s.opacity) == null ? 1 : num(s.opacity))),
        color: safeColor(s.color, STICKER_INK), flip: !!s.flip
      });
    }
    for (const r of arr(d.regions)) {
      if (!r) continue;
      const points = arr(r.points).filter((p) => Array.isArray(p) && num(p[0]) != null && num(p[1]) != null).map((p) => [num(p[0]), num(p[1])]);
      if (points.length < 3) continue;
      out.regions.push({
        id: str(r.id) || uid(), name: str(r.name), description: str(r.description),
        color: safeColor(r.color, '#9b6dff'), font: validFont(r.font, 'Cinzel'),
        size: REGION_SIZES[r.size] ? r.size : 'l', coast: r.coast !== false, rough: r.rough !== false, points, shape: normShape(r.shape),
        labelAt: Array.isArray(r.labelAt) && num(r.labelAt[0]) != null && num(r.labelAt[1]) != null ? [num(r.labelAt[0]), num(r.labelAt[1])] : null,
        labelScale: clampScale(r.labelScale)
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
        symbol: SYMBOLS[l.symbol] ? l.symbol : '', symbolColor: safeColor(l.symbolColor, ''), scale: clampScale(l.scale),
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
        lng: num(q.lng), lat: num(q.lat), revealed: !!q.revealed, scale: clampScale(q.scale)
      });
    }
    for (const f of arr(d.fog)) {
      if (!f) continue;
      // Fog is a painted shape; older fog drawn with corner clicks is converted.
      const points = arr(f.points).filter((p) => Array.isArray(p) && num(p[0]) != null && num(p[1]) != null).map((p) => [num(p[0]), num(p[1])]);
      const shape = normShape(f.shape) || (points.length >= 3 ? [[[...points, points[0]]]] : null);
      out.fog.push({ id: str(f.id) || uid(), name: str(f.name), active: f.active !== false, shape });
    }
    return out;
  }
  // A region's coast-traced outline: [polygon[ring[[lng,lat]...]]], or null.
  function normShape(s) {
    if (!Array.isArray(s)) return null;
    const out = [];
    for (const poly of s) {
      if (!Array.isArray(poly)) continue;
      const rings = [];
      for (const ring of poly) {
        if (!Array.isArray(ring)) continue;
        const pts = ring.filter((p) => Array.isArray(p) && num(p[0]) != null && num(p[1]) != null).map((p) => [num(p[0]), num(p[1])]);
        if (pts.length >= 4) rings.push(pts);
      }
      if (rings.length) out.push(rings);
    }
    return out.length ? out : null;
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
      { id: 'fog-haze', type: 'line', source: 'fog', filter: ['==', ['get', 'active'], true], paint: { 'line-color': '#1e1e24', 'line-width': 90, 'line-blur': 80, 'line-opacity': 0.55 } },
      { id: 'fog-edge', type: 'line', source: 'fog', filter: ['==', ['get', 'active'], true], paint: { 'line-color': '#1c1c21', 'line-width': 34, 'line-blur': 28, 'line-opacity': 0.9 } },
      { id: 'fog-fill', type: 'fill', source: 'fog', filter: ['==', ['get', 'active'], true], paint: { 'fill-pattern': 'fog-tex', 'fill-opacity': 0.98 } },
      { id: 'fog-line', type: 'line', source: 'fog', layout: { visibility: 'none' }, paint: { 'line-color': '#c9c3b5', 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': ['case', ['get', 'active'], 0.8, 0.4] } }
    );
    layers.push(
      { id: 'regions-line', type: 'line', source: 'regions', paint: { 'line-color': ['get', 'color'], 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [3, 2] } },
      { id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#e8b04a', 'fill-opacity': 0.14 } },
      { id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#e8b04a', 'line-width': 2 } },
      { id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#e8b04a', 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 } }
    );
    // Region outlines go under the fog; the drawing preview stays on top of everything.
    const rl = layers.findIndex((l) => l.id === 'regions-line'), fe = layers.findIndex((l) => l.id === 'fog-haze');
    layers.splice(fe, 0, layers.splice(rl, 1)[0]);
    return { version: 8, sources: { base: source, regions: { type: 'geojson', data: empty }, fog: { type: 'geojson', data: empty }, draft: { type: 'geojson', data: empty } }, layers };
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
  const byFog = (id) => data.fog.find((f) => f.id === id);
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
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: 'none', className: 'loc-popup', focusAfterOpen: false });
    popup.on('close', () => { popupKey = null; highlight(null); });
    map.on('load', () => { styleReady = true; fitSize(); renderFog(); renderRegions(); });
    map.on('styleimagemissing', (e) => { if (e.id === 'fog-tex' && !map.hasImage('fog-tex')) map.addImage('fog-tex', fogTexture()); });
    if (window.ResizeObserver) new ResizeObserver(() => fitSize()).observe(map.getContainer());
    lockZoom();
    window.addEventListener('resize', fitSize);
    map.on('click', onMapClick);
    map.on('dblclick', (e) => { if (mode && (mode.type === 'region' || mode.type === 'brush')) { e.preventDefault(); if (mode.type === 'region') finishRegion(); } });
    map.on('mousedown', brushDown); map.on('touchstart', brushDown);
    map.on('mousemove', brushMove); map.on('touchmove', brushMove);
    map.on('mouseup', brushUp); map.on('touchend', brushUp);
    window.addEventListener('mouseup', brushUp);
    map.getContainer().addEventListener('mouseleave', () => { const c = $('#brush-cursor'); if (c) c.style.display = 'none'; });
    map.on('zoom', () => { fitRegionLabels(); fitStickers(); });
    map.on('resize', () => { lockZoom(); fitRegionLabels(); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', fitRegionLabels);
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
    startParty();
    const unseen = unseenQuests().length;
    if (unseen) toast(`${unseen} new quest${unseen === 1 ? '' : 's'} in your logbook`, 'quest', 9000, () => toggleLog(true, 'quests'));
    checkHash();
  }

  // If the page was opened in a hidden tab, the map can start at a tiny default size: fix it.
  function fitSize() {
    if (!map) return;
    const c = map.getContainer(), cv = map.getCanvas();
    if (Math.abs(c.clientWidth - cv.clientWidth) > 2 || Math.abs(c.clientHeight - cv.clientHeight) > 2) map.resize();
    lockZoom();
  }
  // Never let anyone zoom out past the area from your screenshot, whatever their screen size.
  function lockZoom() {
    const c = map.getContainer();
    if (!c.clientWidth || !c.clientHeight) return;
    const a = maplibregl.MercatorCoordinate.fromLngLat(LOCK_BOUNDS[0]), b = maplibregl.MercatorCoordinate.fromLngLat(LOCK_BOUNDS[1]);
    const zw = Math.log2(c.clientWidth / (512 * Math.abs(b.x - a.x)));
    const zh = Math.log2(c.clientHeight / (512 * Math.abs(b.y - a.y)));
    map.setMinZoom(Math.max(zw, zh));
  }

  // ===== Fog of war =====
  // A soft, smoky texture (made on the fly) so fog stands out from the dark map.
  function fogTexture() {
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#18181c';
    g.fillRect(0, 0, S, S);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 80, a = 0.025 + rnd() * 0.05;
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const grd = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grd.addColorStop(0, `rgba(190,190,205,${a})`);
        grd.addColorStop(1, 'rgba(190,190,205,0)');
        g.fillStyle = grd;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
    const img = g.getImageData(0, 0, S, S);
    return { width: S, height: S, data: new Uint8Array(img.data.buffer) };
  }
  const activeFog = () => data.fog.filter((f) => f.active);
  function inRing(ring, x, y) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // Is this spot hidden from players?
  const inShape = (shape, x, y) => !!shape && shape.some((poly) => inRing(poly[0], x, y) && !poly.slice(1).some((hole) => inRing(hole, x, y)));
  const fogged = (lng, lat) => !editing && activeFog().some((f) => inShape(f.shape, lng, lat));
  function renderFog() {
    if (!styleReady) return;
    map.getSource('fog').setData({
      type: 'FeatureCollection',
      features: data.fog.filter((f) => f.shape).map((f) => ({ type: 'Feature', properties: { id: f.id, active: f.active }, geometry: { type: 'MultiPolygon', coordinates: f.shape } }))
    });
    applyFogLook();
  }
  // Players see thick fog with soft edges; you see it see-through with an outline.
  function applyFogLook() {
    try {
      map.setPaintProperty('fog-fill', 'fill-opacity', editing ? 0.55 : 0.98);
      map.setPaintProperty('fog-edge', 'line-opacity', editing ? 0 : 0.9);
      map.setPaintProperty('fog-haze', 'line-opacity', editing ? 0 : 0.55);
      map.setLayoutProperty('fog-line', 'visibility', editing ? 'visible' : 'none');
    } catch (e) {
      map.once('idle', applyFogLook); // the map was busy; try again in a moment
    }
  }

  function renderAll() {
    renderFog();
    renderStickers();
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
      toast('New quest: ' + (q.title || 'Untitled quest') + ' (tap to open)', 'quest', 15000, () => toggleLog(true, 'quests'));
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
    document.body.classList.toggle('has-title', show);
    if (show) {
      loadFont(data.titleFont);
      t.textContent = data.title;
      t.style.fontFamily = fontStack(data.titleFont);
    }
  }

  // ===== Pins (places & settlements) =====
  const symbolOf = (loc) => (SYMBOLS[loc.symbol] ? loc.symbol : (loc.kind === 'settlement' ? 'castle' : 'dot'));
  const symbolSvg = (key, size, color) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${SYMBOLS[key][1]}" fill="${color}" fill-rule="evenodd"/></svg>`;
  const pinSize = (loc) => { const s = loc.scale || 1, big = loc.kind === 'settlement'; return [Math.round((big ? 36 : 30) * s), Math.round((big ? 48 : 40) * s)]; };
  function pinSvg(color, sym, symColor, w, h) {
    return `<svg viewBox="0 0 30 40" width="${w}" height="${h}" aria-hidden="true">` +
      `<path d="M15 1.5C7.5 1.5 1.5 7.4 1.5 14.8 1.5 24.8 15 38.5 15 38.5S28.5 24.8 28.5 14.8C28.5 7.4 22.5 1.5 15 1.5z" fill="${color}" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/>` +
      `<g transform="translate(7.2 6.8) scale(.65)"><path d="${SYMBOLS[sym][1]}" fill="${symColor}" fill-rule="evenodd"/></g></svg>`;
  }

  function addMarker(loc) {
    const big = loc.kind === 'settlement';
    const [w, h] = pinSize(loc);
    const b = el('button', 'pin' + (big ? ' pin-big' : ''));
    b.type = 'button';
    b.dataset.key = 'loc:' + loc.id;
    b.style.width = w + 'px';
    b.style.height = h + 'px';
    b.setAttribute('aria-label', loc.name || 'Untitled place');
    b.innerHTML = pinSvg(safeColor(loc.color || data.defaults.color), symbolOf(loc), safeColor(loc.symbolColor, '#141414'), w, h);
    const label = el('span', 'pin-label' + (big ? ' always' : ''), loc.name || 'Untitled place');
    if (big) {
      const f = loc.titleFont || data.defaults.titleFont;
      loadFont(f);
      label.style.fontFamily = fontStack(f);
      label.style.fontSize = Math.round(Math.min(20, Math.max(10, 12.5 * (loc.scale || 1)))) + 'px';
    } else {
      label.style.bottom = (h + 6) + 'px';
    }
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
    data.locations.filter((l) => !fogged(l.lng, l.lat)).forEach(addMarker);
    highlight(popupKey || (pageLocId ? 'loc:' + pageLocId : null));
  }
  function highlight(key) {
    document.querySelectorAll('.pin, .qmarker').forEach((b) => b.classList.toggle('selected', !!key && b.dataset.key === key));
  }

  // ===== Quest markers =====
  function renderQuestMarkers() {
    for (const m of qmarkers.values()) m.remove();
    qmarkers.clear();
    data.quests.filter((q) => q.lng != null && q.lat != null && (editing || (q.revealed && q.status === 'active')) && !fogged(q.lng, q.lat)).forEach((q) => {
      const b = el('button', 'qmarker' + (q.revealed ? '' : ' hidden-q') + (q.status !== 'active' ? ' closed' : ''), '!');
      b.type = 'button';
      b.dataset.key = 'quest:' + q.id;
      const d = Math.round(28 * (q.scale || 1));
      Object.assign(b.style, { width: d + 'px', height: d + 'px', fontSize: Math.round(17 * (q.scale || 1)) + 'px', lineHeight: (d - 4) + 'px' });
      b.setAttribute('aria-label', 'Quest: ' + (q.title || 'Untitled quest'));
      const ql = el('span', 'pin-label', q.title || 'Untitled quest');
      ql.style.bottom = (d + 6) + 'px';
      b.appendChild(ql);
      b.addEventListener('click', (e) => { e.stopPropagation(); if (editing) selectQuest(q.id); else openQuestPopup(q); });
      const m = new maplibregl.Marker({ element: b, anchor: 'center', draggable: editing }).setLngLat([q.lng, q.lat]).addTo(map);
      m.on('dragend', () => { const p = m.getLngLat(); q.lng = round6(p.lng); q.lat = round6(p.lat); changed(); });
      qmarkers.set(q.id, m);
    });
  }

  // ===== Stickers (drawn above the fog, so players always see them) =====
  const smarkers = new Map();
  const svgCache = new Map();
  const byStickerId = (id) => data.stickers.find((s) => s.id === id);
  async function stickerSrc(s) {
    if (!s.lib) return resolveImage(safeImageSrc(s.image));
    let txt = svgCache.get(s.lib);
    if (!txt) {
      txt = await (await fetch(`images/stickers/${s.lib}.svg`)).text();
      svgCache.set(s.lib, txt);
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt.split(STICKER_INK).join(safeColor(s.color, STICKER_INK)));
  }
  function sizeSticker(s, wrap) {
    const px = Math.min(3000, s.size * Math.pow(2, map.getZoom() - STICKER_ZOOM));
    wrap.style.width = wrap.style.height = Math.round(px) + 'px';
  }
  function addSticker(s) {
    const wrap = el('div', 'sticker');
    wrap.dataset.key = 'sticker:' + s.id;
    const img = el('img');
    img.alt = '';
    img.draggable = false;
    img.style.opacity = s.opacity;
    img.style.transform = `rotate(${s.rotation}deg)${s.flip ? ' scaleX(-1)' : ''}`;
    stickerSrc(s).then((src) => { img.src = src; }).catch(() => {});
    wrap.appendChild(img);
    sizeSticker(s, wrap);
    const m = new maplibregl.Marker({ element: wrap, anchor: 'center', draggable: editing }).setLngLat([s.lng, s.lat]).addTo(map);
    if (editing) {
      wrap.addEventListener('click', (e) => { e.stopPropagation(); showStickerForm(s); });
      m.on('dragend', () => { const p = m.getLngLat(); s.lng = round6(p.lng); s.lat = round6(p.lat); changed(); });
    }
    smarkers.set(s.id, { m, wrap, s });
  }
  function renderStickers() {
    for (const { m } of smarkers.values()) m.remove();
    smarkers.clear();
    if (!STICKERS_ON) return;
    data.stickers.forEach(addSticker);
    markSticker(currentView === 'sticker' ? selectedId : null);
  }
  function updateSticker(s) {
    const old = smarkers.get(s.id);
    if (old) old.m.remove();
    smarkers.delete(s.id);
    addSticker(s);
    markSticker(s.id);
  }
  function fitStickers() {
    for (const { wrap, s } of smarkers.values()) sizeSticker(s, wrap);
  }
  function markSticker(id) {
    for (const [sid, { wrap }] of smarkers) wrap.classList.toggle('selected', sid === id);
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
  // Rough, hand-drawn-looking border: each straight edge gets fractal wiggles (same every time for a region).
  function seededRandom(text) {
    let h = 2166136261;
    for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  }
  const roughCache = new Map();
  function roughRing(points, seed) {
    const key = seed + JSON.stringify(points);
    if (roughCache.has(key)) return roughCache.get(key);
    const rnd = seededRandom(seed);
    const k = Math.cos(points[0][1] * Math.PI / 180);
    const out = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      let seg = [a, b];
      let amp = Math.hypot((b[0] - a[0]) * k, b[1] - a[1]) * 0.11;
      for (let lvl = 0; lvl < 6; lvl++) {
        const next = [seg[0]];
        for (let j = 0; j < seg.length - 1; j++) {
          const p = seg[j], q = seg[j + 1];
          const dx = (q[0] - p[0]) * k, dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
          const off = (rnd() - 0.5) * 2 * amp;
          next.push([(p[0] + q[0]) / 2 + (-dy / len) * off / k, (p[1] + q[1]) / 2 + (dx / len) * off]);
          next.push(q);
        }
        seg = next;
        amp *= 0.52;
      }
      seg.pop();
      out.push(...seg);
    }
    out.push(out[0]);
    const v = out.map((p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5]);
    roughCache.set(key, v);
    return v;
  }
  const outlineRing = (r) => (r.rough ? roughRing(r.points, r.id) : [...r.points, r.points[0]]);
  const regionPolys = (r) => (r.shape ? r.shape : [[outlineRing(r)]]);
  const regionGeom = (r) => ({ type: 'MultiPolygon', coordinates: regionPolys(r) });
  function ringArea(ring) {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    return Math.abs(a / 2);
  }
  function ringBox(ring) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of ring) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  }
  // The roomiest spot inside the biggest piece of the region (so the name sits on land, not in a bay).
  function labelPoint(poly) {
    const [x0, y0, x1, y1] = ringBox(poly[0]);
    const k = Math.cos((y0 + y1) / 2 * Math.PI / 180);
    const inside = (x, y) => {
      let c = false;
      for (const r of poly) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const edgeDist = (x, y) => {
      let d = Infinity;
      for (const r of poly) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const ax = r[j][0] * k, ay = r[j][1], bx = r[i][0] * k, by = r[i][1], px = x * k;
        const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (y - ay) * dy) / len)) : 0;
        d = Math.min(d, Math.hypot(px - ax - t * dx, y - ay - t * dy));
      }
      return d;
    };
    let best = null, bestD = -1;
    const N = 22;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = x0 + (x1 - x0) * i / N, y = y0 + (y1 - y0) * j / N;
      if (!inside(x, y)) continue;
      const d = edgeDist(x, y);
      if (d > bestD) { bestD = d; best = [x, y]; }
    }
    return best || centroid(poly[0].slice(0, -1));
  }
  const labelCache = new Map();
  function regionLabelPos(r) {
    const key = r.rough + JSON.stringify(r.shape || r.points);
    const hit = labelCache.get(r.id);
    if (hit && hit.key === key) return hit;
    const poly = regionPolys(r).reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
    const v = { key, pt: labelPoint(poly), box: ringBox(poly[0]) };
    labelCache.set(r.id, v);
    return v;
  }
  const labelMeta = new Map();
  function renderRegions() {
    for (const m of rlabels.values()) m.remove();
    rlabels.clear();
    labelMeta.clear();
    const list = data.regions.filter((r) => r.points.length >= 3);
    if (styleReady) {
      map.getSource('regions').setData({
        type: 'FeatureCollection',
        features: list.map((r) => ({ type: 'Feature', properties: { id: r.id, color: r.color }, geometry: regionGeom(r) }))
      });
    }
    list.forEach((r) => {
      if (!r.name.trim()) return;
      loadFont(r.font);
      const d = el('div', 'region-label', r.name);
      d.style.fontFamily = fontStack(r.font);
      d.style.color = r.color;
      const pos = regionLabelPos(r);
      const at = r.labelAt || pos.pt;
      if (fogged(at[0], at[1])) return;
      const mk = new maplibregl.Marker({ element: d, anchor: 'center', draggable: editing }).setLngLat(at).addTo(map);
      if (editing) {
        d.title = 'Drag to move the name';
        d.addEventListener('click', (e) => { e.stopPropagation(); selectRegion(r.id); });
        mk.on('dragend', () => {
          const p = mk.getLngLat();
          r.labelAt = [round6(p.lng), round6(p.lat)];
          changed();
          if (currentView === 'region' && selectedId === r.id) showRegionForm(r);
        });
      }
      rlabels.set(r.id, mk);
      labelMeta.set(r.id, { d, r, box: pos.box });
    });
    fitRegionLabels();
  }
  // Size each region's name to fit inside the region at the current zoom.
  const measureCtx = document.createElement('canvas').getContext('2d');
  function fitRegionLabels() {
    if (!map) return;
    for (const { d, r, box } of labelMeta.values()) {
      const a = map.project([box[0], box[3]]), b = map.project([box[2], box[1]]);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      const text = r.name.toUpperCase();
      measureCtx.font = `700 100px ${fontStack(r.font)}`;
      const per1 = measureCtx.measureText(text).width / 100 + 0.2 * text.length; // width per 1px of font size (incl. letter spacing)
      const size = Math.min((w * 0.82) / per1, h * 0.42, REGION_SIZES[r.size]) * (r.labelScale || 1);
      d.style.display = size < 7 ? 'none' : '';
      d.style.fontSize = Math.max(7, size).toFixed(1) + 'px';
    }
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
    }), pinSize(loc)[1] + 2);
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
    }), Math.round(14 * (q.scale || 1)) + 4);
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
    if (fogged(e.lngLat.lng, e.lngLat.lat)) { popup.remove(); return; }
    const hit = styleReady && map.queryRenderedFeatures(e.point, { layers: ['regions-fill'] })[0];
    const region = hit && byRegion(hit.properties.id);
    if (region) {
      if (editing) { selectRegion(region.id, e.lngLat); return; }
      openRegionPopup(region, e.lngLat);
      return;
    }
    popup.remove();
    if (editing && /^(pin|quest|region|sticker)$/.test(currentView)) backToList();
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
    const beasts = data.monsters.filter((m) => m.revealed);
    const tabs = [['quests', `Quests${unseen.size ? ' (' + unseen.size + ' new)' : ''}`], ['people', 'People']];
    if (beasts.length) tabs.push(['bestiary', 'Bestiary']);
    tabs.push(['notes', 'My notes']);
    if (logTab === 'bestiary' && !beasts.length) logTab = 'quests';
    lb.appendChild(tabBar(tabs, logTab, (id) => { logTab = id; renderLog(); }));
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
    } else if (logTab === 'bestiary') {
      beasts.forEach((m) => body.appendChild(statBlock(m)));
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

  // ===== Live party: who has the map open right now =====
  // Uses a free public message relay (no sign-up). Each device keeps its own name and color;
  // the DM (in #edit) can rename anyone, and the change reaches that player's device.
  const RELAY_URL = 'wss://broker.hivemq.com:8884/mqtt';
  const RELAY_LIB = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
  const ME_KEY = 'campaign-map.me:' + SITE_KEY, PARTY_OPEN_KEY = 'campaign-map.partyOpen';
  const ONLINE_MS = 120000;
  const roomHash = (() => { let h = 2166136261; for (const c of location.host + location.pathname.replace(/index\.html$/, '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); })();
  const ROOM = 'campaignmap-v1/' + roomHash;
  let relay = null, me = null, relayState = 'connecting', partyEdit = null, kickedUntil = 0;
  const party = new Map();
  const kicked = new Map(); // id -> { name, until } (what the DM sees)
  const KICK_MS = 24 * 3600 * 1000;
  const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24);
  const initialOf = (n) => (cleanName(n).match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase();
  const inkOn = (hex) => { const v = parseInt(hex.slice(1), 16); const l = (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; return l > 0.6 ? '#141414' : '#ffffff'; };
  function loadMe() {
    const m = lsGet(ME_KEY, null);
    if (m && typeof m.id === 'string' && m.id) return { id: m.id, name: cleanName(m.name), color: safeColor(m.color, PIN_COLORS[0]) };
    const n = { id: uid(), name: '', color: PIN_COLORS[Math.floor(Math.random() * PIN_COLORS.length)] };
    lsSet(ME_KEY, n);
    return n;
  }
  function startParty() {
    me = loadMe();
    renderParty();
    renderDice(true);
    if (!me.name) openPartyEditor(me);
    const s = document.createElement('script');
    s.src = RELAY_LIB;
    s.onload = connectRelay;
    s.onerror = () => { relayState = 'offline'; renderParty(); };
    document.head.appendChild(s);
    setInterval(renderParty, 20000);
  }
  function connectRelay() {
    if (!window.mqtt) { relayState = 'offline'; renderParty(); return; }
    const myTopic = `${ROOM}/p/${me.id}`;
    try {
      relay = mqtt.connect(RELAY_URL, {
        clientId: 'cm_' + me.id + '_' + Math.random().toString(36).slice(2, 7),
        clean: true, keepalive: 30, reconnectPeriod: 5000, connectTimeout: 12000,
        will: { topic: myTopic, payload: '', retain: true, qos: 0 }
      });
    } catch (e) { relayState = 'offline'; renderParty(); return; }
    relay.on('connect', () => {
      relayState = 'live';
      relay.subscribe([`${ROOM}/p/+`, `${ROOM}/rename/${me.id}`, `${ROOM}/dice/log`, `${ROOM}/kick/+`]);
      announce();
      renderParty();
    });
    relay.on('message', onRelayMessage);
    relay.on('offline', () => { relayState = 'offline'; renderParty(); });
    relay.on('reconnect', () => { relayState = 'connecting'; renderParty(); });
    setInterval(announce, 30000);
    window.addEventListener('pagehide', () => { try { relay.publish(myTopic, '', { retain: true }); relay.end(true); } catch (e) { /* closing */ } });
  }
  function announce() {
    if (!relay || !relay.connected || isKicked()) return;
    relay.publish(`${ROOM}/p/${me.id}`, JSON.stringify({ id: me.id, name: me.name, color: me.color, dm: editing, ts: Date.now() }), { retain: true });
  }
  function onRelayMessage(topic, payload) {
    const txt = payload.toString();
    if (topic === `${ROOM}/dice/log`) { if (!isKicked() && txt) onDiceMessage(txt); return; }
    if (topic.startsWith(`${ROOM}/kick/`)) { onKickMessage(topic.split('/').pop(), txt); return; }
    if (topic === `${ROOM}/rename/${me.id}`) {
      if (!txt) return;
      try {
        const r = JSON.parse(txt);
        const before = me.name;
        if (typeof r.name === 'string' && cleanName(r.name)) me.name = cleanName(r.name);
        if (r.color) me.color = safeColor(r.color, me.color);
        lsSet(ME_KEY, me);
        relay.publish(topic, '', { retain: true }); // used it, so clear it
        announce();
        renderParty();
        if (me.name !== before) toast('Your DM changed your name to ' + me.name + '.', 'info', 6000);
      } catch (e) { /* bad message */ }
      return;
    }
    const id = topic.split('/').pop();
    if (id === me.id || isKicked()) return;
    if (!txt) { party.delete(id); renderParty(); return; }
    try {
      const p = JSON.parse(txt);
      if (!p || p.id !== id) return;
      party.set(id, { id, name: cleanName(p.name), color: safeColor(p.color, PIN_COLORS[0]), dm: !!p.dm, ts: num(p.ts) || 0 });
      renderParty();
    } catch (e) { /* bad message */ }
  }
  // --- Kicking: the DM removes a player from the live session (party list and dice) ---
  const isKicked = () => !editing && kickedUntil > Date.now();
  function onKickMessage(id, txt) {
    let k = null;
    try { k = txt ? JSON.parse(txt) : null; } catch (e) { k = null; }
    const until = k && num(k.until) ? num(k.until) : 0;
    if (until > Date.now()) kicked.set(id, { name: cleanName(k.name) || 'Unnamed', until }); else kicked.delete(id);
    if (id === me.id) {
      const was = isKicked();
      kickedUntil = until;
      if (isKicked() && !was) {
        try { relay.publish(`${ROOM}/p/${me.id}`, '', { retain: true }); } catch (e) { /* ignore */ }
        party.clear();
        toast('The DM removed you from this session. You can still look at the map.', 'warn', 12000);
      } else if (!isKicked() && was) {
        toast('The DM let you back into the session.', 'ok', 6000);
        announce();
        // fetch the current party and dice again
        try { relay.unsubscribe([`${ROOM}/p/+`, `${ROOM}/dice/log`], () => relay.subscribe([`${ROOM}/p/+`, `${ROOM}/dice/log`])); } catch (e) { /* ignore */ }
      }
      renderDice();
    }
    renderParty();
  }
  function kickPlayer(p) {
    if (!editing || !relay || !relay.connected) { toast('Can’t reach the live service, so nobody can be kicked right now.', 'warn'); return; }
    relay.publish(`${ROOM}/kick/${p.id}`, JSON.stringify({ name: p.name, until: Date.now() + KICK_MS }), { retain: true });
    relay.publish(`${ROOM}/p/${p.id}`, '', { retain: true });
    party.delete(p.id);
    partyEdit = null;
    toast(`${p.name || 'That player'} was removed from the session.`, 'ok');
    renderParty();
  }
  function unkickPlayer(id) {
    if (relay && relay.connected) relay.publish(`${ROOM}/kick/${id}`, '', { retain: true });
    kicked.delete(id);
    renderParty();
  }

  function avatar(p, size) {
    const a = el('span', 'avatar', initialOf(p.name));
    a.style.background = p.color;
    a.style.color = inkOn(p.color);
    if (size) { a.style.width = a.style.height = size + 'px'; a.style.fontSize = Math.round(size * 0.45) + 'px'; }
    return a;
  }
  function renderParty() {
    const box = $('#party');
    if (!box || !me) return;
    const now = Date.now();
    const others = [...party.values()].filter((p) => now - p.ts < ONLINE_MS && !(kicked.has(p.id) && kicked.get(p.id).until > now))
      .sort((a, b) => (b.dm - a.dm) || a.name.localeCompare(b.name));
    if (isKicked()) {
      box.innerHTML = '';
      box.classList.remove('collapsed');
      const h = el('div', 'party-head');
      h.appendChild(el('span', 'party-dot offline'));
      h.appendChild(el('span', 'party-title', 'Removed from session'));
      box.appendChild(h);
      box.appendChild(el('div', 'party-note', 'The DM removed you from the live session. You can still look at the map.'));
      return;
    }
    const all = [{ ...me, dm: editing, you: true }, ...others];
    const open = lsGet(PARTY_OPEN_KEY, true);
    box.innerHTML = '';
    box.classList.toggle('collapsed', !open);
    const head = el('button', 'party-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(open));
    const dot = el('span', 'party-dot ' + relayState);
    dot.title = relayState === 'live' ? 'Live' : relayState === 'offline' ? 'Offline: can’t reach the live service' : 'Connecting…';
    head.appendChild(dot);
    if (open) head.appendChild(el('span', 'party-title', `Party · ${all.length} online`));
    else { const stack = el('span', 'party-stack'); all.slice(0, 6).forEach((p) => stack.appendChild(avatar(p, 26))); if (all.length > 6) stack.appendChild(el('span', 'party-more', '+' + (all.length - 6))); head.appendChild(stack); }
    head.appendChild(el('span', 'party-chev', open ? '▴' : '▾'));
    head.onclick = () => { lsSet(PARTY_OPEN_KEY, !open); partyEdit = null; renderParty(); };
    box.appendChild(head);
    if (!open) return;
    const list = el('div', 'party-list');
    all.forEach((p) => {
      const row = el('button', 'party-row' + (p.you ? ' you' : ''));
      row.type = 'button';
      row.appendChild(avatar(p));
      row.appendChild(el('span', 'party-name' + (p.name ? '' : ' empty'), p.name || (p.you ? 'Set your name' : 'Unnamed')));
      if (p.dm) row.appendChild(el('span', 'party-tag dm', 'DM'));
      if (p.you) row.appendChild(el('span', 'party-tag', 'you'));
      const canEdit = p.you || editing;
      row.disabled = !canEdit;
      if (canEdit) row.title = p.you ? 'Change your name and color' : 'Change this player’s name and color';
      row.onclick = () => openPartyEditor(p.you ? me : party.get(p.id));
      list.appendChild(row);
      if (partyEdit && partyEdit.id === p.id) list.appendChild(partyEditorForm(p.you ? me : party.get(p.id)));
    });
    if (relayState === 'offline') list.appendChild(el('div', 'party-note', 'Can’t reach the live service right now, so only you are shown. It keeps trying.'));
    if (editing) {
      const out = [...kicked.entries()].filter(([, k]) => k.until > now);
      if (out.length) {
        list.appendChild(el('div', 'party-note', 'Kicked from the session:'));
        out.forEach(([id, k]) => {
          const r = el('div', 'party-kicked');
          r.appendChild(el('span', 'party-name', k.name));
          r.appendChild(btn('Let back in', 'small', () => unkickPlayer(id)));
          list.appendChild(r);
        });
      }
    }
    box.appendChild(list);
    fillDiceControls();
  }
  function openPartyEditor(p) {
    if (!p) return;
    lsSet(PARTY_OPEN_KEY, true);
    partyEdit = partyEdit && partyEdit.id === p.id ? null : { id: p.id };
    renderParty();
    const inp = $('#party .party-edit input');
    if (inp) { inp.focus(); inp.select(); }
  }
  function partyEditorForm(p) {
    const f = el('form', 'party-edit');
    const isMe = p.id === me.id;
    let color = p.color;
    const inp = el('input');
    inp.maxLength = 24;
    inp.placeholder = isMe ? 'Your name' : 'Player name';
    inp.value = p.name;
    inp.autocomplete = 'off';
    f.appendChild(inp);
    const sw = el('div', 'party-swatches');
    PIN_COLORS.forEach((c) => {
      const b = el('button', 'sw' + (c === color ? ' on' : ''));
      b.type = 'button'; b.style.background = c; b.title = c;
      b.onclick = () => { color = c; sw.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b)); };
      sw.appendChild(b);
    });
    f.appendChild(sw);
    const row = el('div', 'party-edit-btns');
    if (!isMe && editing) {
      const k = btn('Kick', 'small danger', async () => {
        if (!(await ask(`Remove ${p.name || 'this player'} from the session? They won’t appear in the party or be able to roll dice until you let them back in.`, 'Kick', 'Cancel'))) return;
        kickPlayer(p);
      });
      k.style.marginRight = 'auto';
      row.appendChild(k);
    }
    row.appendChild(btn('Cancel', 'small ghost', () => { partyEdit = null; renderParty(); }));
    const save = btn('Save', 'small primary');
    save.type = 'submit';
    row.appendChild(save);
    f.appendChild(row);
    f.onsubmit = (e) => {
      e.preventDefault();
      const name = cleanName(inp.value);
      if (!name) { inp.focus(); toast('Enter a name first.', 'warn'); return; }
      if (isMe) {
        me.name = name; me.color = color; lsSet(ME_KEY, me); announce();
      } else if (editing) {
        // Ask that player's device to change; it keeps the change on their device.
        if (relay && relay.connected) relay.publish(`${ROOM}/rename/${p.id}`, JSON.stringify({ name, color }), { retain: true });
        const cur = party.get(p.id);
        if (cur) { cur.name = name; cur.color = color; }
        toast(`Renamed to ${name}. It updates on their screen in a moment.`, 'ok');
      }
      partyEdit = null;
      renderParty();
    };
    return f;
  }

  // ===== Dice roller (bottom left): a shared, read-only feed of rolls =====
  const DICE = [4, 6, 8, 10, 12, 20];
  const DICE_LOG_MAX = 60, DICE_OPEN_KEY = 'campaign-map.diceOpen', HIDDEN_KEY = 'campaign-map.hiddenRolls:' + SITE_KEY;
  let diceLog = [], diceSides = 20, diceCount = 1, diceMod = 0, diceFor = '', diceHidden = false, diceUnread = 0;
  function rollDie(n) {
    const a = new Uint32Array(1), lim = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim);
    return (x % n) + 1;
  }
  const diceLabel = (count, sides, mod) => `${count}d${sides}${mod ? (mod > 0 ? '+' : '') + mod : ''}`;
  function cleanRoll(x) {
    if (!x || typeof x.id !== 'string') return null;
    const sides = DICE.includes(+x.sides) ? +x.sides : 0;
    if (!sides) return null;
    const results = arr(x.results).map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= sides).slice(0, 20);
    if (!results.length) return null;
    const mod = Math.max(-99, Math.min(99, Math.round(num(x.mod) || 0)));
    return {
      id: x.id.slice(0, 40), byId: str(x.byId).slice(0, 40), by: cleanName(x.by) || 'Someone', color: safeColor(x.color, PIN_COLORS[0]),
      dm: !!x.dm, forName: cleanName(x.forName), forColor: safeColor(x.forColor, ''), sides, count: results.length, mod, results,
      total: results.reduce((s, v) => s + v, 0) + mod, ts: num(x.ts) || 0, revealed: !!x.revealed
    };
  }
  function mergeRolls(list) {
    const byKey = new Map(diceLog.map((x) => [x.id, x]));
    let added = 0;
    for (const raw of list) {
      const x = cleanRoll(raw);
      if (!x || byKey.has(x.id)) continue;
      byKey.set(x.id, x);
      added++;
    }
    diceLog = [...byKey.values()].sort((a, b) => a.ts - b.ts).slice(-DICE_LOG_MAX);
    return added;
  }
  function publishRolls() {
    if (relay && relay.connected) relay.publish(`${ROOM}/dice/log`, JSON.stringify(diceLog), { retain: true });
  }
  function onDiceMessage(txt) {
    let list = [];
    try { list = JSON.parse(txt); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    const added = mergeRolls(list);
    if (!added) return;
    if (!lsGet(DICE_OPEN_KEY, false)) diceUnread += added;
    renderDice(true);
  }
  function doRoll() {
    if (isKicked()) { toast('You were removed from the session, so you can’t roll.', 'warn'); return; }
    const results = Array.from({ length: diceCount }, () => rollDie(diceSides));
    const target = editing && diceFor ? party.get(diceFor) : null;
    const e = {
      id: uid(), byId: me.id, by: me.name || 'Someone', color: me.color, dm: editing,
      forName: target ? target.name : '', forColor: target ? target.color : '', sides: diceSides, count: diceCount, mod: diceMod,
      results, total: results.reduce((s, v) => s + v, 0) + diceMod, ts: Date.now(), revealed: false
    };
    if (editing && diceHidden) {
      // Hidden rolls never leave your device until you reveal them.
      const h = lsGet(HIDDEN_KEY, []);
      h.push(e);
      lsSet(HIDDEN_KEY, h.slice(-40));
      renderDice(true);
      return;
    }
    mergeRolls([e]);
    publishRolls();
    renderDice(true);
  }
  function revealRoll(id) {
    const h = lsGet(HIDDEN_KEY, []);
    const e = h.find((x) => x.id === id);
    if (!e) return;
    lsSet(HIDDEN_KEY, h.filter((x) => x.id !== id));
    mergeRolls([Object.assign({}, e, { revealed: true, ts: Date.now() })]);
    publishRolls();
    renderDice(true);
  }
  function discardRoll(id) {
    lsSet(HIDDEN_KEY, lsGet(HIDDEN_KEY, []).filter((x) => x.id !== id));
    renderDice();
  }
  function rollLine(e, hidden) {
    const row = el('div', 'roll' + (hidden ? ' hidden-roll' : ''));
    row.appendChild(avatar({ name: e.forName || e.by, color: e.forName ? (e.forColor || e.color) : e.color }, 26));
    const body = el('div', 'roll-body');
    const who = el('div', 'roll-who');
    if (e.forName) {
      who.appendChild(el('b', null, e.by));
      who.appendChild(document.createTextNode(' rolled for '));
      who.appendChild(el('b', null, e.forName));
    } else {
      who.appendChild(el('b', null, e.by));
      who.appendChild(document.createTextNode(' rolled'));
    }
    who.appendChild(document.createTextNode(' ' + diceLabel(e.count, e.sides, e.mod)));
    if (e.revealed) who.appendChild(el('span', 'roll-tag', 'revealed'));
    if (hidden) who.appendChild(el('span', 'roll-tag dm', 'hidden'));
    body.appendChild(who);
    const res = el('div', 'roll-res');
    e.results.forEach((v) => {
      const d = el('span', 'roll-die', String(v));
      if (e.sides === 20 && v === 20) d.classList.add('crit');
      if (e.sides === 20 && v === 1) d.classList.add('fumble');
      res.appendChild(d);
    });
    if (e.mod) res.appendChild(el('span', 'roll-mod', (e.mod > 0 ? '+ ' : '− ') + Math.abs(e.mod)));
    res.appendChild(el('span', 'roll-total', '= ' + e.total));
    body.appendChild(res);
    if (hidden) {
      const acts = el('div', 'roll-acts');
      acts.appendChild(btn('Reveal', 'small primary', () => revealRoll(e.id)));
      acts.appendChild(btn('Discard', 'small ghost', () => discardRoll(e.id)));
      body.appendChild(acts);
    }
    row.appendChild(body);
    return row;
  }
  function renderDice(scroll) {
    const box = $('#dice');
    if (!box || !me) return;
    if (isKicked()) { box.innerHTML = ''; return; }
    const open = lsGet(DICE_OPEN_KEY, false);
    box.classList.toggle('open', open);
    if (!open) {
      box.innerHTML = '';
      box.appendChild(diceHead(false));
      return;
    }
    if (!box.querySelector('.dice-log')) buildDiceShell(box);
    const log = box.querySelector('.dice-log');
    const atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    log.innerHTML = '';
    if (!diceLog.length) log.appendChild(el('div', 'dice-empty', 'No rolls yet. Pick a die below and roll.'));
    diceLog.forEach((e) => log.appendChild(rollLine(e, false)));
    if (editing) {
      const h = lsGet(HIDDEN_KEY, []);
      if (h.length) {
        log.appendChild(el('div', 'dice-sep', 'Your hidden rolls (only you can see these)'));
        h.forEach((e) => log.appendChild(rollLine(e, true)));
      }
    }
    if (scroll || atEnd) log.scrollTop = log.scrollHeight;
    fillDiceControls();
  }
  // Same header as the Party panel: click it to open or close.
  function diceHead(open) {
    const head = el('button', 'party-head dice-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(open));
    head.appendChild(el('span', 'party-title', 'Dice rolls'));
    if (!open && diceUnread) head.appendChild(el('span', 'dice-badge', String(diceUnread)));
    head.appendChild(el('span', 'party-chev', open ? '▴' : '▾'));
    head.onclick = () => { lsSet(DICE_OPEN_KEY, !open); if (!open) diceUnread = 0; renderDice(true); };
    return head;
  }
  function buildDiceShell(box) {
    box.innerHTML = '';
    box.appendChild(diceHead(true));
    box.appendChild(el('div', 'dice-log'));
    const c = el('div', 'dice-controls');
    const dice = el('div', 'dice-row dice-pick');
    DICE.forEach((n) => {
      const b = el('button', 'die', 'd' + n);
      b.type = 'button';
      b.dataset.sides = n;
      b.onclick = () => { diceSides = n; fillDiceControls(); };
      dice.appendChild(b);
    });
    c.appendChild(dice);
    const row = el('div', 'dice-row');
    const cnt = el('div', 'dice-count');
    cnt.appendChild(btn('−', 'small', () => { diceCount = Math.max(1, diceCount - 1); fillDiceControls(); }));
    cnt.appendChild(el('span', 'dice-n'));
    cnt.appendChild(btn('+', 'small', () => { diceCount = Math.min(20, diceCount + 1); fillDiceControls(); }));
    row.appendChild(cnt);
    const modL = el('label', 'dice-mod', 'Mod');
    const mod = el('input');
    mod.type = 'number'; mod.min = '-99'; mod.max = '99'; mod.step = '1'; mod.value = String(diceMod);
    mod.oninput = () => { diceMod = Math.max(-99, Math.min(99, Math.round(+mod.value || 0))); fillDiceControls(); };
    modL.appendChild(mod);
    row.appendChild(modL);
    const roll = btn('Roll', 'primary dice-roll', () => doRoll());
    row.appendChild(roll);
    c.appendChild(row);
    const dm = el('div', 'dice-row dice-dm');
    const forL = el('label', 'dice-for', 'Roll for');
    const sel = el('select');
    sel.onchange = () => { diceFor = sel.value; };
    forL.appendChild(sel);
    dm.appendChild(forL);
    const hl = el('label', 'dice-hide');
    const hc = el('input');
    hc.type = 'checkbox';
    hc.onchange = () => { diceHidden = hc.checked; fillDiceControls(); };
    hl.appendChild(hc);
    hl.appendChild(document.createTextNode(' Hidden'));
    dm.appendChild(hl);
    c.appendChild(dm);
    box.appendChild(c);
  }
  function fillDiceControls() {
    const box = $('#dice');
    if (!box || !box.querySelector('.dice-controls')) return;
    box.querySelectorAll('.die').forEach((b) => b.classList.toggle('on', +b.dataset.sides === diceSides));
    box.querySelector('.dice-n').textContent = String(diceCount);
    box.querySelector('.dice-roll').textContent = (editing && diceHidden ? 'Roll hidden ' : 'Roll ') + diceLabel(diceCount, diceSides, diceMod);
    const dm = box.querySelector('.dice-dm');
    dm.hidden = !editing;
    if (editing) {
      const sel = dm.querySelector('select');
      const now = Date.now();
      const players = [...party.values()].filter((p) => now - p.ts < ONLINE_MS && p.name);
      sel.innerHTML = '';
      sel.add(new Option('Myself', ''));
      players.forEach((p) => sel.add(new Option(p.name, p.id)));
      if (!players.some((p) => p.id === diceFor)) diceFor = '';
      sel.value = diceFor;
      dm.querySelector('input[type=checkbox]').checked = diceHidden;
    }
  }

  // ===== Editor =====
  const PANEL_HTML = `
    <div class="ed-head"><div class="ed-title">Map editor</div><div class="ed-status" id="ed-status"></div></div>
    <div class="ed-actions"><button type="button" class="btn accent" id="ed-publish">Publish</button></div>
    <div class="ed-tabs"><button type="button" data-tab="list">Pins</button><button type="button" data-tab="regions">Regions</button><button type="button" data-tab="quests">Quests</button><button type="button" data-tab="fog">Fog</button><button type="button" data-tab="stickers">Stickers</button><button type="button" data-tab="monsters">Monsters</button><button type="button" data-tab="settings">Settings</button></div>
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
    if (!STICKERS_ON) panel.querySelector('[data-tab="stickers"]').remove();
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
    announce(); renderParty(); renderDice();
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
    announce(); renderParty(); renderDice();
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
    else if (tab === 'fog') showFog();
    else if (tab === 'stickers') showStickers();
    else if (tab === 'monsters') showMonsters();
    else if (tab === 'settings') showSettings();
    else showList();
  }
  function backToList() {
    popup.remove();
    if (currentView === 'quest') showQuests();
    else if (currentView === 'region') showRegions();
    else if (currentView === 'fogarea') showFog();
    else if (currentView === 'sticker') showStickers();
    else showList();
  }
  function refreshView() {
    if (currentView === 'pin' && byId(selectedId)) selectPin(selectedId);
    else if (currentView === 'quest' && byQuest(selectedId)) showQuestForm(byQuest(selectedId));
    else if (currentView === 'region' && byRegion(selectedId)) showRegionForm(byRegion(selectedId));
    else if (currentView === 'fogarea' && byFog(selectedId)) showFogForm(byFog(selectedId));
    else if (currentView === 'sticker' && byStickerId(selectedId)) showStickerForm(byStickerId(selectedId));
    else if (currentView === 'monster' && byMonster(selectedId)) showMonsterForm(byMonster(selectedId));
    else if (currentView === 'monsters' || currentView === 'monster') showMonsters();
    else if (currentView === 'stickers' || currentView === 'sticker') showStickers();
    else if (currentView === 'fog' || currentView === 'fogarea' || currentView === 'brush') showFog();
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
    if (m.type === 'brush') {
      map.dragPan.enable();
      const c = $('#brush-cursor');
      if (c) c.style.display = 'none';
    }
    updateDraft();
    if (silent) return;
    if (m.type === 'brush') { showFog(); return; }
    if (m.type === 'quest' && byQuest(m.id)) showQuestForm(byQuest(m.id));
    else if (m.target === 'fog') { if (m.editId && byFog(m.editId)) showFogForm(byFog(m.editId)); else showFog(); }
    else if (m.type === 'region' && m.editId && byRegion(m.editId)) showRegionForm(byRegion(m.editId));
    else if (m.type === 'region') showRegions();
  }
  function handleModeClick(ll) {
    const p = [round6(ll.lng), round6(ll.lat)];
    if (mode.type === 'brush') return;
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
    const target = mode.target;
    cancelMode(true);
    if (target === 'fog') {
      let f = editId && byFog(editId);
      const shape = [[[...pts, pts[0]]]];
      if (f) f.shape = shape;
      else { f = { id: uid(), name: 'Fog ' + (data.fog.length + 1), active: true, shape }; data.fog.push(f); }
      renderFog(); changed(); showFogForm(f);
      return;
    }
    let r = editId && byRegion(editId);
    if (r) { r.points = pts; r.shape = null; }
    else {
      r = { id: uid(), name: 'New region', description: '', color: '#9b6dff', font: 'Cinzel', size: 'l', coast: true, rough: true, points: pts, shape: null };
      data.regions.push(r);
    }
    renderRegions(); changed(); showRegionForm(r);
    const n = $('#rf-name'); if (n) { n.focus(); n.select(); }
    if (r.coast) traceCoast(r);
  }

  // --- Coastline tracing: cut the water out of a region ---
  let clipperLoading = null;
  function loadClipper() {
    if (window.polygonClipping) return Promise.resolve(window.polygonClipping);
    if (!clipperLoading) {
      clipperLoading = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js';
        s.onload = () => res(window.polygonClipping);
        s.onerror = () => { clipperLoading = null; rej(new Error('couldn’t load the shape tool')); };
        document.head.appendChild(s);
      });
    }
    return clipperLoading;
  }
  async function traceCoast(r) {
    const id = r.id;
    $('#veil').textContent = 'Tracing the coastline…';
    $('#veil').hidden = false;
    try {
      const pc = await loadClipper();
      const bb = ringBox(r.points);
      // Make sure the whole area is on screen so its map data is loaded.
      map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 40, animate: false, maxZoom: 15 });
      await Promise.race([new Promise((res) => map.once('idle', res)), new Promise((res) => setTimeout(res, 5000))]);
      map.triggerRepaint();
      const water = [];
      for (const f of map.querySourceFeatures('base', { sourceLayer: 'water' })) {
        const g = f.geometry;
        const polys = g && g.type === 'Polygon' ? [g.coordinates] : g && g.type === 'MultiPolygon' ? g.coordinates : [];
        for (const p of polys) {
          const b = ringBox(p[0]);
          if (b[2] >= bb[0] && b[0] <= bb[2] && b[3] >= bb[1] && b[1] <= bb[3]) water.push(p);
        }
      }
      const outline = [outlineRing(r)];
      let shape = water.length ? pc.difference(outline, ...water) : null;
      if (shape) {
        // Tidy up: drop slivers and tiny holes, thin out points, round coordinates.
        const total = ringArea(outline[0]);
        const tol = Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 1200;
        const thin = (ring) => {
          const outR = [ring[0]];
          for (let i = 1; i < ring.length - 1; i++) {
            const p = ring[i], q = outR[outR.length - 1];
            if (Math.abs(p[0] - q[0]) > tol || Math.abs(p[1] - q[1]) > tol) outR.push(p);
          }
          outR.push(ring[ring.length - 1]);
          return outR.map((p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5]);
        };
        shape = shape
          .filter((poly) => ringArea(poly[0]) > total * 0.004)
          .map((poly) => poly.filter((ring, i) => i === 0 || ringArea(ring) > total * 0.001).map(thin).filter((ring) => ring.length >= 4))
          .filter((poly) => poly.length);
        if (!shape.length) shape = null;
      }
      const cur = byRegion(id);
      if (!cur || !cur.coast) return;
      cur.shape = shape;
      renderRegions(); changed();
      toast(shape ? 'Coastline traced: water is left out of the region.' : 'No coastline in this area, so the shape stays as drawn.', 'ok');
    } catch (e) {
      toast('Couldn’t trace the coastline (' + e.message + '). The shape stays as drawn.', 'warn', 7000);
    } finally {
      $('#veil').hidden = true;
      $('#veil').textContent = 'Publishing…';
    }
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
  function symbolPicker(value, onPick) {
    const grid = el('div', 'sym-grid');
    Object.entries(SYMBOLS).forEach(([k, [label]]) => {
      const b = el('button', 'sym' + (k === value ? ' on' : ''));
      b.type = 'button';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.innerHTML = symbolSvg(k, 20, 'currentColor');
      b.onclick = () => { grid.querySelectorAll('.sym').forEach((x) => x.classList.remove('on')); b.classList.add('on'); onPick(k); };
      grid.appendChild(b);
    });
    return grid;
  }
  function sizeField(value, onInput) {
    const f = el('div', 'field', 'Size on the map');
    const row = el('div', 'size-row');
    const r = el('input');
    r.type = 'range'; r.min = '0.5'; r.max = '2.5'; r.step = '0.1'; r.value = String(value || 1);
    const out = el('span', 'size-val', Math.round((value || 1) * 100) + '%');
    r.oninput = () => { out.textContent = Math.round(+r.value * 100) + '%'; onInput(+r.value); };
    row.appendChild(r);
    row.appendChild(out);
    f.appendChild(row);
    return f;
  }
  function colorPicker(box, value, onPick, palette = PIN_COLORS) {
    box.innerHTML = '';
    const custom = el('input', 'sw-custom');
    const mark = (v) => box.querySelectorAll('.sw').forEach((b) => b.classList.toggle('on', b.dataset.c === v));
    palette.forEach((c) => {
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
    const loc = { id: uid(), kind: 'place', name: 'New place', description: '', lng: p[0], lat: p[1], titleFont: '', bodyFont: '', textSize: '', color: '', image: '', symbol: '', symbolColor: '', scale: 1, shops: [], npcs: [] };
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
    const sf = el('div', 'field', 'Symbol');
    sf.appendChild(symbolPicker(symbolOf(loc), (k) => { loc.symbol = k; refresh(); }));
    b.appendChild(sf);
    const sc = el('div', 'field', 'Symbol color');
    const scBox = el('div', 'swatches');
    sc.appendChild(scBox);
    colorPicker(scBox, safeColor(loc.symbolColor, '#141414'), (c) => { loc.symbolColor = c; refresh(); }, SYMBOL_COLORS);
    b.appendChild(sc);
    b.appendChild(sizeField(loc.scale, (v) => { loc.scale = v; refresh(); }));
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
  function startDrawing(editId, target) {
    setMode({ type: 'region', points: [], editId, target: target || 'region' }, 'Click to add corners · double-click or Enter to finish · Backspace undoes · Esc cancels');
    showDrawing();
  }
  function showDrawing() {
    currentView = 'drawing'; setTab(mode && mode.target === 'fog' ? 'fog' : 'regions');
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
    row.appendChild(field('Biggest name size', selectInput([['m', 'Medium'], ['l', 'Large'], ['xl', 'Huge']], r.size, (v) => { r.size = v; refresh(); })));
    b.appendChild(row);
    const ns = sizeField(r.labelScale, (v) => { r.labelScale = v; fitRegionLabels(); changed(); });
    ns.firstChild.textContent = 'Name size';
    ns.querySelector('input').min = '0.3';
    ns.querySelector('input').max = '3';
    b.appendChild(ns);
    b.appendChild(el('p', 'tip', 'Drag the name on the map to place it anywhere. At 100% it fits inside the region; it grows as you zoom in.'));
    if (r.labelAt) b.appendChild(btn('Put the name back in the middle', 'small', () => { r.labelAt = null; refresh(); showRegionForm(r); }));
    const cl = el('label', 'check');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = r.coast;
    cb.onchange = () => {
      r.coast = cb.checked;
      if (r.coast) traceCoast(r);
      else { r.shape = null; refresh(); }
    };
    cl.appendChild(cb);
    cl.appendChild(document.createTextNode(' Follow the coastline (leave out water)'));
    b.appendChild(cl);
    const rl = el('label', 'check');
    const rb = el('input');
    rb.type = 'checkbox';
    rb.checked = r.rough;
    rb.onchange = () => {
      r.rough = rb.checked;
      if (r.coast) traceCoast(r);
      else { r.shape = null; refresh(); }
    };
    rl.appendChild(rb);
    rl.appendChild(document.createTextNode(' Rough, natural border on land'));
    b.appendChild(rl);
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

  // --- Fog of war ---
  function showFog() {
    currentView = 'fog'; selectedId = null; setTab('fog'); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(btn('+ Paint new fog', 'primary list-add', () => {
      const f = { id: uid(), name: 'Fog ' + (data.fog.length + 1), active: true, shape: null };
      data.fog.push(f); changed(); startBrush(f.id, false);
    }));
    b.appendChild(btn('Fog the whole map', 'small list-add', () => {
      const [[w, s], [e, n]] = LOCK_BOUNDS;
      const f = { id: uid(), name: 'Whole map', active: true, shape: [[[[w - 0.05, s - 0.05], [e + 0.05, s - 0.05], [e + 0.05, n + 0.05], [w - 0.05, n + 0.05], [w - 0.05, s - 0.05]]]] };
      data.fog.push(f); renderAll(); changed(); showFogForm(f);
    }));
    if (data.fog.some((f) => f.shape)) b.appendChild(btn('Erase fog (reveal explored areas)', 'small list-add', () => startBrush(null, true)));
    b.appendChild(el('p', 'tip', 'Paint fog by dragging a circle brush over the map, and erase it as the party explores. Players see a dark cover that hides any pins, quests or region names under it. You see it see-through here.'));
    if (!data.fog.length) { b.appendChild(el('p', 'muted', 'No fog yet.')); return; }
    const ul = el('ul', 'pin-list');
    data.fog.forEach((f) => ul.appendChild(listButton('#55555e', f.name || 'Fog area', !f.shape ? ['hidden', 'Empty'] : f.active ? ['hidden', 'Fogged'] : ['done', 'Lifted'], () => {
      if (f.shape) { const bb = ringBox(f.shape.flatMap((p) => p[0])); map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], { padding: 60, duration: 500 }); }
      showFogForm(f);
    })));
    b.appendChild(ul);
    const row = el('div', 'btn-row');
    row.style.marginTop = '12px';
    row.appendChild(btn('Lift all fog', 'small', () => { data.fog.forEach((f) => { f.active = false; }); renderFog(); changed(); showFog(); }));
    row.appendChild(btn('Fog everything again', 'small ghost', () => { data.fog.forEach((f) => { f.active = true; }); renderFog(); changed(); showFog(); }));
    b.appendChild(row);
  }
  function showFogForm(f) {
    currentView = 'fogarea'; selectedId = f.id; setTab(null); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All fog', 'ghost small', showFog));
    b.appendChild(field('Name (only you see this)', textInput(f.name, (v) => { f.name = v; changed(); })));
    const box = el('div', 'reveal-box' + (f.active ? '' : ' on'));
    box.appendChild(el('div', null, f.active ? 'Fogged: players can’t see this area.' : 'Lifted: players can see this area.'));
    box.appendChild(btn(f.active ? 'Lift the fog' : 'Bring the fog back', f.active ? 'accent' : 'small', () => { f.active = !f.active; renderAll(); changed(); showFogForm(f); }));
    b.appendChild(box);
    const tools = el('div', 'btn-row');
    tools.appendChild(btn('Paint more fog', 'small', () => startBrush(f.id, false)));
    tools.appendChild(btn('Erase fog', 'small', () => startBrush(null, true)));
    b.appendChild(tools);
    b.appendChild(el('p', 'tip', 'Press Publish afterwards so your players see the change.'));
    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete', 'danger', async () => {
      if (!(await ask(`Delete “${f.name || 'this fog area'}”?`, 'Delete', 'Keep it'))) return;
      data.fog = data.fog.filter((x) => x !== f); renderAll(); changed(); showFog();
    }));
    foot.appendChild(btn('Done', 'primary', showFog));
    b.appendChild(foot);
  }

  // --- Stickers ---
  function newSticker(lib, image) {
    const c = map.getCenter();
    const s = { id: uid(), lib: lib || '', image: image || '', lng: round6(c.lng), lat: round6(c.lat), size: Math.round(140 * Math.pow(2, STICKER_ZOOM - map.getZoom()) * 1.4), rotation: 0, opacity: 1, color: STICKER_INK, flip: false };
    s.size = Math.min(600, Math.max(20, s.size));
    data.stickers.push(s);
    addSticker(s);
    changed();
    showStickerForm(s);
  }
  function showStickers() {
    currentView = 'stickers'; selectedId = null; setTab('stickers'); updateStatus(); popup.remove(); markSticker(null);
    const b = body();
    b.appendChild(el('p', 'tip', 'Click a sticker to drop it in the middle of the map, then drag it where you want. Stickers show above the fog, so players can always see them.'));
    const lib = el('div', 'sticker-lib');
    STICKERS.forEach(([k, label]) => {
      const t = el('button', 'sticker-pick');
      t.type = 'button';
      t.title = label;
      const im = el('img');
      im.src = `images/stickers/${k}.svg`;
      im.alt = label;
      t.appendChild(im);
      t.appendChild(el('span', null, label));
      t.onclick = () => newSticker(k);
      lib.appendChild(t);
    });
    b.appendChild(lib);
    const up = el('label', 'btn small', 'Upload your own image…');
    up.style.margin = '10px 0 0'; up.style.color = 'var(--text)';
    const file = el('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.onchange = async () => {
      const f = file.files[0];
      file.value = '';
      if (!f) return;
      try { newSticker('', await fileToDataUrl(f)); } catch (e) { toast('That file couldn’t be used as an image.', 'error'); }
    };
    up.appendChild(file);
    b.appendChild(up);
    if (data.stickers.length) {
      b.appendChild(el('div', 'sub-h', `On the map (${data.stickers.length})`));
      const ul = el('ul', 'pin-list');
      data.stickers.forEach((s) => {
        const name = s.lib ? (STICKERS.find(([k]) => k === s.lib) || [])[1] : 'Your image';
        ul.appendChild(listButton(s.color, name, null, () => { map.easeTo({ center: [s.lng, s.lat], duration: 500 }); showStickerForm(s); }));
      });
      b.appendChild(ul);
    }
  }
  function showStickerForm(s) {
    currentView = 'sticker'; selectedId = s.id; setTab(null); updateStatus(); popup.remove(); markSticker(s.id);
    const b = body();
    const redraw = () => { updateSticker(s); changed(); };
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All stickers', 'ghost small', showStickers));
    b.appendChild(el('p', 'tip', 'Drag the sticker on the map to move it.'));
    const slider = (label, min, max, step, value, fmt, onInput) => {
      const f = el('div', 'field', label);
      const row = el('div', 'size-row');
      const r = el('input');
      r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step); r.value = String(value);
      const out = el('span', 'size-val', fmt(value));
      r.oninput = () => { out.textContent = fmt(+r.value); onInput(+r.value); };
      row.appendChild(r); row.appendChild(out); f.appendChild(row);
      return f;
    };
    b.appendChild(slider('Size', 20, 600, 5, s.size, (v) => Math.round(v) + '', (v) => { s.size = v; const e = smarkers.get(s.id); if (e) sizeSticker(s, e.wrap); changed(); }));
    b.appendChild(slider('Rotation', -180, 180, 5, s.rotation, (v) => Math.round(v) + '°', (v) => { s.rotation = v; redraw(); }));
    b.appendChild(slider('Opacity', 0.15, 1, 0.05, s.opacity, (v) => Math.round(v * 100) + '%', (v) => { s.opacity = v; redraw(); }));
    if (s.lib) b.appendChild(colorField('Ink color', s.color, (c) => { s.color = c; redraw(); }));
    if (s.lib) colorPicker(b.lastChild.querySelector('.swatches'), s.color, (c) => { s.color = c; redraw(); }, INK_COLORS);
    const fl = el('label', 'check');
    const fc = el('input');
    fc.type = 'checkbox'; fc.checked = s.flip;
    fc.onchange = () => { s.flip = fc.checked; redraw(); };
    fl.appendChild(fc); fl.appendChild(document.createTextNode(' Flip left to right'));
    b.appendChild(fl);
    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete sticker', 'danger', () => {
      data.stickers = data.stickers.filter((x) => x !== s);
      const e = smarkers.get(s.id); if (e) e.m.remove(); smarkers.delete(s.id);
      changed(); showStickers();
    }));
    foot.appendChild(btn('Duplicate', 'small', () => {
      const c = Object.assign(clone(s), { id: uid(), lng: round6(s.lng + 0.01), lat: round6(s.lat - 0.006) });
      data.stickers.push(c); addSticker(c); changed(); showStickerForm(c);
    }));
    foot.appendChild(btn('Done', 'primary', showStickers));
    b.appendChild(foot);
  }

  // --- Monster Logbook: stat blocks ---
  const byMonster = (id) => data.monsters.find((m) => m.id === id);
  const abilityMod = (s) => { const v = Math.floor((s - 10) / 2); return (v >= 0 ? '+' : '−') + Math.abs(v); };
  // "Multiattack. The beast makes two attacks." -> bold-italic name, then the text.
  function statText(text) {
    const wrap = el('div', 'sb-text');
    text.split(/\n\s*\n|\n(?=[^\n]{1,60}\.\s)/).map((p) => p.trim()).filter(Boolean).forEach((p) => {
      const para = el('p');
      const m = /^([^.\n]{1,60})\.\s+([\s\S]*)$/.exec(p);
      if (m) {
        para.appendChild(el('b', 'sb-lead', m[1] + '.'));
        const rest = el('span');
        rest.innerHTML = ' ' + richText(m[2]);
        para.appendChild(rest);
      } else {
        para.innerHTML = richText(p);
      }
      wrap.appendChild(para);
    });
    return wrap;
  }
  function statBlock(m) {
    const sb = el('div', 'statblock');
    if (m.image) sb.appendChild(zoomImg(m.image, m.name, 'sb-img'));
    sb.appendChild(el('h3', 'sb-name', m.name || 'Unnamed creature'));
    if (m.meta) sb.appendChild(el('div', 'sb-meta', m.meta));
    sb.appendChild(el('div', 'sb-rule'));
    const line = (label, value) => { if (!value) return; const d = el('div', 'sb-line'); d.appendChild(el('b', null, label + ' ')); d.appendChild(document.createTextNode(value)); sb.appendChild(d); };
    line('Armor Class', m.ac); line('Hit Points', m.hp); line('Speed', m.speed);
    sb.appendChild(el('div', 'sb-rule'));
    const ab = el('div', 'sb-abilities');
    [['STR', m.str], ['DEX', m.dex], ['CON', m.con], ['INT', m.int], ['WIS', m.wis], ['CHA', m.cha]].forEach(([k, v]) => {
      const c = el('div');
      c.appendChild(el('b', null, k));
      c.appendChild(el('span', null, `${v} (${abilityMod(v)})`));
      ab.appendChild(c);
    });
    sb.appendChild(ab);
    sb.appendChild(el('div', 'sb-rule'));
    line('Saving Throws', m.saves); line('Skills', m.skills); line('Resistances / Immunities', m.resist);
    line('Senses', m.senses); line('Languages', m.languages); line('Challenge', m.cr);
    if (m.traits.trim()) { sb.appendChild(el('div', 'sb-rule')); sb.appendChild(statText(m.traits)); }
    const section = (title, text) => { if (!text.trim()) return; sb.appendChild(el('h4', 'sb-h', title)); sb.appendChild(statText(text)); };
    section('Actions', m.actions); section('Reactions', m.reactions); section('Legendary Actions', m.legendary);
    return sb;
  }
  function showMonsters() {
    currentView = 'monsters'; selectedId = null; setTab('monsters'); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(btn('+ Add monster', 'primary list-add', () => {
      const m = { id: uid(), name: 'New monster', meta: 'Medium aberration, chaotic evil', image: '', ac: '12', hp: '22 (4d8 + 4)', speed: '30 ft.', str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, saves: '', skills: '', resist: '', senses: 'passive Perception 10', languages: '', cr: '1 (200 XP)', traits: '', actions: '', reactions: '', legendary: '', notes: '', revealed: false };
      data.monsters.push(m); changed(); showMonsterForm(m);
      const n = $('#mf-name'); if (n) { n.focus(); n.select(); }
    }));
    b.appendChild(el('p', 'tip', 'Stat blocks for monsters you have on hand. Only you see them, unless you turn on “Show to players”, which adds that monster to the players’ Logbook under Bestiary.'));
    if (!data.monsters.length) { b.appendChild(el('p', 'muted', 'No monsters yet.')); return; }
    const ul = el('ul', 'pin-list');
    data.monsters.forEach((m) => ul.appendChild(listButton('#c0392b', m.name || 'Unnamed creature', m.revealed ? ['done', 'Shown'] : ['hidden', 'DM only'], () => showMonsterForm(m))));
    b.appendChild(ul);
  }
  function showMonsterForm(m) {
    currentView = 'monster'; selectedId = m.id; setTab(null); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All monsters', 'ghost small', showMonsters));
    const preview = el('div', 'sb-preview');
    const redraw = () => { preview.innerHTML = ''; preview.appendChild(statBlock(m)); changed(); };
    const vis = el('label', 'check');
    const vc = el('input');
    vc.type = 'checkbox'; vc.checked = m.revealed;
    vc.onchange = () => { m.revealed = vc.checked; changed(); };
    vis.appendChild(vc);
    vis.appendChild(document.createTextNode(' Show to players (in their Logbook)'));
    b.appendChild(vis);
    const t = (key, label, opts) => { const i = textInput(m[key], (v) => { m[key] = v; redraw(); }, opts || {}); if (key === 'name') i.id = 'mf-name'; b.appendChild(field(label, i)); };
    t('name', 'Name');
    t('meta', 'Size, type, alignment', { placeholder: 'Large aberration, chaotic evil' });
    const r1 = el('div', 'row3');
    [['ac', 'Armor Class', '15 (natural armor)'], ['hp', 'Hit Points', '45 (6d10 + 12)'], ['speed', 'Speed', '30 ft., swim 40 ft.']].forEach(([k, l, ph]) => r1.appendChild(field(l, textInput(m[k], (v) => { m[k] = v; redraw(); }, { placeholder: ph }))));
    b.appendChild(r1);
    const abil = el('div', 'row6');
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach((k) => {
      const i = el('input');
      i.type = 'number'; i.min = '1'; i.max = '30'; i.value = String(m[k]);
      i.oninput = () => { m[k] = Math.min(30, Math.max(1, Math.round(+i.value || 10))); redraw(); };
      abil.appendChild(field(k.toUpperCase(), i));
    });
    b.appendChild(abil);
    t('saves', 'Saving throws', { placeholder: 'Con +5, Wis +3' });
    t('skills', 'Skills', { placeholder: 'Perception +5, Stealth +4' });
    t('resist', 'Resistances / immunities', { placeholder: 'cold; poisoned' });
    t('senses', 'Senses', { placeholder: 'darkvision 120 ft., passive Perception 15' });
    t('languages', 'Languages', { placeholder: 'understands Deep Speech but can’t speak' });
    t('cr', 'Challenge', { placeholder: '5 (1,800 XP)' });
    b.appendChild(el('p', 'tip', 'For traits and actions, start each one with its name and a period, e.g. “Bite. Melee Weapon Attack: +6 to hit…”. One per line.'));
    t('traits', 'Traits', { multiline: true, rows: 4, placeholder: 'Amphibious. The creature can breathe air and water.' });
    t('actions', 'Actions', { multiline: true, rows: 5, placeholder: 'Multiattack. The creature makes two Tentacle attacks.\nTentacle. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.' });
    t('reactions', 'Reactions (optional)', { multiline: true, rows: 2 });
    t('legendary', 'Legendary actions (optional)', { multiline: true, rows: 3 });
    t('notes', 'DM notes (never shown to players)', { multiline: true, rows: 3, placeholder: 'Tactics, loot, where it lairs…' });
    b.appendChild(imageField(m, redraw, 'Picture (optional)'));
    b.appendChild(el('div', 'sub-h', 'Stat block'));
    b.appendChild(preview);
    preview.appendChild(statBlock(m));
    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Delete monster', 'danger', async () => {
      if (!(await ask(`Delete “${m.name || 'this monster'}”?`, 'Delete', 'Keep it'))) return;
      data.monsters = data.monsters.filter((x) => x !== m); changed(); showMonsters();
    }));
    foot.appendChild(btn('Duplicate', 'small', () => {
      const c = Object.assign(clone(m), { id: uid(), name: m.name + ' (copy)', revealed: false });
      data.monsters.push(c); changed(); showMonsterForm(c);
    }));
    foot.appendChild(btn('Done', 'primary', showMonsters));
    b.appendChild(foot);
  }

  // --- Fog brush: drag a circle over the map to paint or erase fog ---
  let brushSize = 45; // radius in screen pixels
  function startBrush(fogId, erase) {
    cancelMode(true);
    setMode({ type: 'brush', id: fogId, erase, stroke: [], painting: false, last: null },
      erase ? 'Drag over the map to erase fog · Esc or Done when finished' : 'Drag over the map to paint fog · Esc or Done when finished');
    map.dragPan.disable();
    loadClipper().catch(() => toast('Couldn’t load the brush tool. Check your internet connection.', 'error'));
    showBrushPanel();
  }
  function showBrushPanel() {
    currentView = 'brush'; setTab('fog');
    const b = body();
    const m = mode;
    b.appendChild(el('p', null, m.erase ? 'Erasing: drag over fog to clear it (this works on every fog area).' : 'Painting: drag over the map to add fog.'));
    const row = el('div', 'btn-row');
    const f = m.id && byFog(m.id);
    row.appendChild(btn('Paint', m.erase ? 'small' : 'small primary', () => startBrush((f || data.fog.find((x) => x.active) || newFogArea()).id, false)));
    row.appendChild(btn('Erase', m.erase ? 'small primary' : 'small', () => startBrush(m.id, true)));
    b.appendChild(row);
    const sf = el('div', 'field', 'Brush size');
    sf.style.marginTop = '14px';
    const sr = el('div', 'size-row');
    const r = el('input');
    r.type = 'range'; r.min = '10'; r.max = '160'; r.step = '5'; r.value = String(brushSize);
    const out = el('span', 'size-val', brushSize + 'px');
    r.oninput = () => { brushSize = +r.value; out.textContent = brushSize + 'px'; sizeCursor(); };
    sr.appendChild(r); sr.appendChild(out); sf.appendChild(sr);
    b.appendChild(sf);
    b.appendChild(el('p', 'tip', 'Zoom in for finer detail; the brush is measured on screen. You can’t pan while the brush is on, so scroll to zoom and use Done to move around.'));
    b.appendChild(btn('Done', 'primary', () => { const id = m.id; cancelMode(true); const ff = id && byFog(id); if (ff && !m.erase) showFogForm(ff); else showFog(); }));
  }
  function newFogArea() {
    const f = { id: uid(), name: 'Fog ' + (data.fog.length + 1), active: true, shape: null };
    data.fog.push(f);
    return f;
  }
  function brushCursor() {
    let c = $('#brush-cursor');
    if (!c) { c = el('div'); c.id = 'brush-cursor'; map.getContainer().appendChild(c); }
    return c;
  }
  function sizeCursor() {
    const c = brushCursor();
    c.style.width = c.style.height = brushSize * 2 + 'px';
  }
  // Each dab is a lumpy, cloud-like blob (not a perfect circle), so strokes get billowy edges.
  function dab(pt) {
    mode.last = pt;
    const ring = [];
    const waves = [2, 3, 5, 7].map((k, i) => ({ k, amp: [0.13, 0.1, 0.07, 0.05][i] * (0.6 + Math.random() * 0.8), ph: Math.random() * Math.PI * 2 }));
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const rr = brushSize * (1 + waves.reduce((s, w) => s + w.amp * Math.sin(w.k * a + w.ph), 0));
      const ll = map.unproject([pt.x + rr * Math.cos(a), pt.y + rr * Math.sin(a)]);
      ring.push([ll.lng, ll.lat]);
    }
    ring.push(ring[0]);
    mode.stroke.push([ring]);
  }
  function previewStroke() {
    if (!styleReady) return;
    map.getSource('draft').setData({ type: 'FeatureCollection', features: mode.stroke.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: p } })) });
  }
  function brushDown(e) {
    if (!mode || mode.type !== 'brush') return;
    if (e.originalEvent && e.originalEvent.button) return;
    e.preventDefault();
    mode.painting = true; mode.stroke = []; mode.last = null;
    dab(e.point); previewStroke();
  }
  function brushMove(e) {
    if (!mode || mode.type !== 'brush') return;
    const c = brushCursor();
    c.style.display = 'block';
    c.style.left = e.point.x + 'px'; c.style.top = e.point.y + 'px';
    c.classList.toggle('erase', !!mode.erase);
    if (!mode.painting) return;
    e.preventDefault();
    const p = e.point, l = mode.last, step = Math.max(3, brushSize * 0.35);
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < step) return;
    const n = Math.ceil(d / step);
    for (let i = 1; i <= n; i++) dab({ x: l.x + (p.x - l.x) * i / n, y: l.y + (p.y - l.y) * i / n });
    previewStroke();
  }
  async function brushUp() {
    if (!mode || mode.type !== 'brush' || !mode.painting) return;
    const m = mode;
    m.painting = false;
    const stroke = m.stroke;
    m.stroke = [];
    if (!stroke.length) return;
    try {
      const pc = await loadClipper();
      const paint = pc.union(...stroke);
      const tidy = (s) => {
        if (!s || !s.length) return null;
        const outS = s.map((poly) => poly.map((ring) => ring.map((p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5])).filter((ring) => ring.length >= 4)).filter((poly) => poly.length);
        return outS.length ? outS : null;
      };
      if (m.erase) {
        data.fog.forEach((f) => { if (f.shape) f.shape = tidy(pc.difference(f.shape, paint)); });
      } else {
        let f = m.id && byFog(m.id);
        if (!f) { f = newFogArea(); m.id = f.id; }
        f.shape = tidy(f.shape ? pc.union(f.shape, paint) : paint);
      }
      renderAll(); changed();
    } catch (e) {
      toast('That brush stroke didn’t work: ' + e.message, 'warn');
    } finally {
      const src = styleReady && map.getSource('draft');
      if (mode === m && src) src.setData({ type: 'FeatureCollection', features: [] });
    }
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
    const q = { id: uid(), title: 'New quest', description: '', status: 'active', giver: '', locationId: locationId || '', lng: null, lat: null, revealed: false, scale: 1 };
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

    b.appendChild(sizeField(q.scale, (v) => { q.scale = v; refresh(); }));
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
