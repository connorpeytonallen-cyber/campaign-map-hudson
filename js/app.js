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
  const CREDIT = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap</a> ' +
    '<a href="https://carto.com/attributions" target="_blank" rel="noopener">&copy; CARTO</a>';
  const CARTO_STYLE ='https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
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
  // Sound categories in the DM's sound board ('' = not sorted yet).
  const SOUND_CATS = [['music', 'Background Music'], ['ambience', 'Ambience'], ['physical', 'Physical Effects'], ['monsters', 'Monsters'], ['interactive', 'Interactive'], ['', 'Unsorted']];
  // Travel per day for a party of 4, in travel miles: [average, brisk, non-stop].
  const TRAVEL = {
    foot: { name: 'On foot', miles: [12, 16, 22] },
    car: { name: 'By car', miles: [30, 40, 55] },
    boat: { name: 'By boat', miles: [20, 30, 40] }
  };
  const PACES = [['Average', 8], ['Brisk', 10], ['Non-stop', 14]]; // [name, hours on the move]
  // DM-only terrain view: [id, name, colour, landuse kinds, travel note].
  const TERRAIN = [
    ['swamp', 'Swamp & marsh', '#14b8a6', ['wetland'], 'Half speed on foot; no cars. Boats only in deep channels.'],
    ['woods', 'Woods & forest', '#22c55e', ['wood', 'forest', 'nature_reserve'], 'Half speed on foot; no cars.'],
    ['fields', 'Fields & open ground', '#bef264', ['grass', 'grassland', 'meadow', 'scrub', 'heath', 'farmland', 'orchard', 'vineyard', 'park', 'golf_course', 'recreation_ground', 'garden', 'cemetery', 'dog_park', 'pitch'], 'Normal speed on foot.'],
    ['town', 'Town & city', '#f59e0b', ['residential', 'commercial', 'retail', 'school', 'college', 'university', 'hospital', 'pedestrian', 'military', 'aerodrome'], 'Roads, people, shelter and supplies.'],
    ['industry', 'Industry & docks', '#f43f5e', ['industrial', 'railway', 'runway'], 'Factories, rail yards, warehouses.'],
    ['sand', 'Beach & sand', '#fde68a', ['beach', 'sand'], 'Slow going on foot.'],
    ['water', 'Water', '#3b82f6', [], 'Boat only.']
  ];
  const TERRAIN_KEY = 'campaign-map.terrainView';
  const TRAVEL_SCALE_DEFAULT = 4; // crossing the map on foot takes about 17 days
  // Fog styles. base/wisp: [noise frequency, layers of detail, ridged (streaky)].
  const FOG_LOOKS = {
    smoke: { name: 'Smoke', base: [4, 5, false], contrast: 1.0, wisp: [3, 5, false], wispLo: 0.5, wispHi: 0.85, wispAmt: 0.55 },
    mist: { name: 'Soft mist', base: [2, 5, false], contrast: 0.55, wisp: [3, 4, false], wispLo: 0.42, wispHi: 0.9, wispAmt: 0.4 },
    storm: { name: 'Storm clouds', base: [4, 6, false], contrast: 1.7, wisp: [3, 5, true], wispLo: 0.6, wispHi: 0.95, wispAmt: 0.6 },
    tendrils: { name: 'Eldritch tendrils', base: [4, 5, false], contrast: 0.8, wisp: [6, 4, true], wispLo: 0.72, wispHi: 0.97, wispAmt: 0.85 }
  };
  const FOG_DEFAULT = { look: 'smoke', darkness: 0.8, thickness: 0.98, tint: '#24242c', speed: 2, dir: 0, pulse: true, seed: 7 };
  const FOG_TINTS = ['#24242c', '#2a3140', '#2b3a2f', '#3d2a2a', '#33293d', '#3b3526'];
  const FOG_DIRS = [[0, 'East'], [45, 'Northeast'], [90, 'North'], [135, 'Northwest'], [180, 'West'], [225, 'Southwest'], [270, 'South'], [315, 'Southeast']];
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

  function safeAudioSrc(src) {
    if (typeof src !== 'string') return '';
    src = src.trim();
    if (/^data:audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|x-m4a|aac|webm);base64,/i.test(src)) return src;
    if (/^https:\/\/\S+$/i.test(src)) return src;
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
      monsters: [],
      sounds: []
    };
    for (const s of arr(d.sounds)) {
      if (!s) continue;
      const audio = safeAudioSrc(s.audio);
      if (!audio) continue;
      out.sounds.push({
        id: str(s.id) || uid(), name: str(s.name) || 'Sound', audio, loop: !!s.loop, cat: SOUND_CATS.some(([k]) => k && k === s.cat) ? s.cat : '',
        volume: Math.min(1, Math.max(0.05, num(s.volume) == null ? 0.8 : num(s.volume)))
      });
    }
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
        labelScale: clampScale(r.labelScale),
        labelAngle: Math.min(180, Math.max(-180, Math.round(num(r.labelAngle) || 0)))
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
        throughFog: !!l.throughFog,
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
    const fs = d.fogStyle && typeof d.fogStyle === 'object' ? d.fogStyle : {};
    const rng = (v, lo, hi, def) => { v = num(v); return v == null ? def : Math.min(hi, Math.max(lo, v)); };
    out.fogStyle = {
      look: FOG_LOOKS[fs.look] ? fs.look : FOG_DEFAULT.look,
      darkness: rng(fs.darkness, 0, 1, FOG_DEFAULT.darkness),
      thickness: rng(fs.thickness, 0.7, 1, FOG_DEFAULT.thickness),
      tint: safeColor(fs.tint, FOG_DEFAULT.tint),
      speed: rng(fs.speed, 0, 10, FOG_DEFAULT.speed),
      dir: Math.round(rng(fs.dir, 0, 359, FOG_DEFAULT.dir)),
      pulse: fs.pulse == null ? FOG_DEFAULT.pulse : !!fs.pulse,
      seed: Math.round(rng(fs.seed, 1, 99999, FOG_DEFAULT.seed))
    };
    // Travel: how many miles of in-game travel one real mile on the map counts as.
    out.travel = { scale: rng(d.travel && d.travel.scale, 1, 20, TRAVEL_SCALE_DEFAULT) };
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
    const source = Object.assign({}, carto.sources[key], { attribution: '' });
    const empty = { type: 'FeatureCollection', features: [] };
    const fogData = fogCollections(); // fog is in the very first frame, so nothing peeks through while loading
    const layers = baseLayers('base');
    const at = layers.findIndex((l) => l.id === 'roads-minor');
    layers.splice(at, 0, { id: 'regions-fill', type: 'fill', source: 'regions', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 } });
    layers.push(
      { id: 'fog-haze', type: 'line', source: 'fog-soft', filter: ['==', ['get', 'active'], true], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1e1e24', 'line-width': 90, 'line-blur': 80, 'line-opacity': 0.55 } },
      { id: 'fog-edge', type: 'line', source: 'fog-soft', filter: ['==', ['get', 'active'], true], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#1c1c21', 'line-width': 34, 'line-blur': 28, 'line-opacity': 0.9 } },
      { id: 'fog-fill', type: 'fill', source: 'fog', filter: ['==', ['get', 'fill'], true], paint: { 'fill-pattern': 'fog-tex', 'fill-opacity': 0.98 } },
      { id: 'fog-wisp', type: 'fill', source: 'fog', filter: ['==', ['get', 'fill'], true], paint: { 'fill-pattern': 'fog-wisp', 'fill-opacity': 1, 'fill-opacity-transition': { duration: 0, delay: 0 } } },
      ...TERRAIN.map(([id, , color, k]) => (id === 'water'
        ? { id: 'terrain-water', type: 'fill', source: 'base', 'source-layer': 'water', filter: ['==', ['geometry-type'], 'Polygon'], layout: { visibility: 'none' }, paint: { 'fill-color': color, 'fill-opacity': 0 } }
        : { id: 'terrain-' + id, type: 'fill', source: 'base', 'source-layer': 'landuse', filter: ['in', ['get', 'kind'], ['literal', k]], layout: { visibility: 'none' }, paint: { 'fill-color': color, 'fill-opacity': 0, 'fill-outline-color': 'rgba(0,0,0,0)' } })),
      { id: 'daylight', type: 'fill', source: 'daylight', paint: { 'fill-color': '#000', 'fill-opacity': 0, 'fill-opacity-transition': { duration: 1500, delay: 0 }, 'fill-color-transition': { duration: 1500, delay: 0 } } },
      { id: 'fog-line', type: 'line', source: 'fog', filter: ['==', ['get', 'outline'], true], layout: { visibility: 'none', 'line-join': 'round' }, paint: { 'line-color': '#c9c3b5', 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': ['case', ['get', 'active'], 0.8, 0.4] } }
    );
    layers.push(
      { id: 'regions-line', type: 'line', source: 'regions', paint: { 'line-color': ['get', 'color'], 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [3, 2] } },
      { id: 'draft-fill', type: 'fill', source: 'draft', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#e8b04a', 'fill-opacity': 0.14 } },
      { id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#e8b04a', 'line-width': 2 } },
      { id: 'ruler-line', type: 'line', source: 'ruler', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#e8b04a', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } },
      { id: 'ruler-ticks', type: 'circle', source: 'ruler', filter: ['==', ['get', 'k'], 'block'], paint: { 'circle-radius': 3, 'circle-color': '#141414', 'circle-stroke-color': '#e8b04a', 'circle-stroke-width': 1.5 } },
      { id: 'ruler-days', type: 'circle', source: 'ruler', filter: ['==', ['get', 'k'], 'day'], paint: { 'circle-radius': 6, 'circle-color': '#e8b04a', 'circle-stroke-color': '#141414', 'circle-stroke-width': 2 } },
      { id: 'ruler-pts', type: 'circle', source: 'ruler', filter: ['==', ['get', 'k'], 'pt'], paint: { 'circle-radius': 4.5, 'circle-color': '#fff', 'circle-stroke-color': '#141414', 'circle-stroke-width': 1.5 } },
      { id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#e8b04a', 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 } }
    );
    // Start with only fog showing (see init): streets are switched on once the fog is in place.
    // (The DM's terrain colours share this map data but are never part of what players see.)
    const isBase = (l) => l.source === 'base' && !l.id.startsWith('terrain-');
    BASE_IDS = layers.filter(isBase).map((l) => l.id);
    for (const l of layers) {
      if (isBase(l)) l.layout = Object.assign({}, l.layout, { visibility: 'none' });
      if (l.id === 'land') l.paint = Object.assign({}, l.paint, { 'background-pattern': 'fog-tex' });
    }
    // Region outlines go under the fog; the drawing preview stays on top of everything.
    const rl = layers.findIndex((l) => l.id === 'regions-line'), fe = layers.findIndex((l) => l.id === 'fog-haze');
    layers.splice(fe, 0, layers.splice(rl, 1)[0]);
    return { version: 8, sources: { base: source, regions: { type: 'geojson', data: empty }, /* Fog tiles are only cut up to a middling zoom and simply enlarged past it, so zooming in fast never
    // waits on new fog tiles (which used to leave black squares for a moment). */ fog: { type: 'geojson', data: fogData.fog, maxzoom: 13 }, 'fog-soft': { type: 'geojson', data: fogData.soft, tolerance: 5, buffer: 256, maxzoom: 15 }, draft: { type: 'geojson', data: empty }, ruler: { type: 'geojson', data: empty }, daylight: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-179, -84], [179, -84], [179, 84], [-179, 84], [-179, -84]]] } } } }, layers };
  }

  // ===== App state =====
  let map, popup, published, data, panel = null, styleReady = false;
  let BASE_IDS = [];
  let publishedStr = '', publishedRef = null; // remembered so each check for updates is cheap
  let editing = false, busy = false, mode = null; // mode: {type:'pin'} | {type:'quest', id} | {type:'region', points, editId}
  let popupKey = null, currentView = 'list', selectedId = null, saveTimer = null;
  let pageLocId = null, pageTab = 'overview', logTab = 'character';
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
    if (map.keyboard && map.keyboard.disableRotation) map.keyboard.disableRotation();
    // Zoom buttons plus a compass (click it to point north again).
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), 'bottom-left');
    // The map data's required credit, as small text instead of the "i" button.
    map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: CREDIT }), 'bottom-left');
    setupRotate();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: 'none', className: 'loc-popup', focusAfterOpen: false });
    popup.on('close', () => { popupKey = null; highlight(null); });
    // Keep the map hidden until the fog is drawn, so a refresh never flashes the whole map.
    // The map starts as solid fog; the streets appear under it once the fog shapes are in place,
    // so a refresh never shows the hidden parts (and never a blank screen).
    map.once('style.load', () => { buildFogLook(); pushFogImages(); });
    let shown = false;
    const showBase = () => {
      if (shown) return;
      shown = true;
      try {
        map.setPaintProperty('land', 'background-pattern', undefined);
        for (const id of BASE_IDS) map.setLayoutProperty(id, 'visibility', 'visible');
      } catch (e) { shown = false; setTimeout(showBase, 200); }
    };
    map.on('sourcedata', (e) => { if (e.sourceId === 'fog' && map.isSourceLoaded('fog')) requestAnimationFrame(showBase); });
    map.on('load', () => { styleReady = true; fitSize(); renderFog(); renderRegions(); renderClock(); applyTerrain(); setTimeout(showBase, 3000); });
    map.on('styleimagemissing', (e) => { if ((e.id === 'fog-tex' || e.id === 'fog-wisp') && !map.hasImage(e.id)) { buildFogLook(); pushFogImages(); startFogAnim(); } });
    if (window.ResizeObserver) new ResizeObserver(() => fitSize()).observe(map.getContainer());
    lockZoom();
    window.addEventListener('resize', fitSize);
    map.on('click', onMapClick);
    map.on('dblclick', (e) => { if (mode && (mode.type === 'region' || mode.type === 'brush')) { e.preventDefault(); if (mode.type === 'region') finishRegion(); } });
    map.on('mousemove', rulerHover);
    map.on('moveend', () => { clearLegCache(); if (ruler.active && ruler.points.length) { drawRuler(); updateRulerReadout(); } });
    map.on('mousedown', brushDown); map.on('touchstart', brushDown);
    map.on('mousemove', brushMove); map.on('touchmove', brushMove);
    map.on('mouseup', brushUp); map.on('touchend', brushUp);
    window.addEventListener('mouseup', brushUp);
    map.getContainer().addEventListener('mouseleave', () => { const c = $('#brush-cursor'); if (c) c.style.display = 'none'; });
    // Resize region names and stickers at most once per frame while zooming.
    let zoomQueued = false;
    map.on('zoom', () => { if (zoomQueued) return; zoomQueued = true; requestAnimationFrame(() => { zoomQueued = false; fitRegionLabels(); fitStickers(); }); });
    map.on('resize', () => { lockZoom(); fitRegionLabels(); });
    map.on('rotate', lockZoom);
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => { perCache.clear(); fitRegionLabels(); });
    // Pointer cursor over regions; checked at most once per frame.
    let hoverPt = null;
    map.on('mousemove', (e) => {
      if (!styleReady || mode) return;
      if (hoverPt) { hoverPt = e.point; return; }
      hoverPt = e.point;
      requestAnimationFrame(() => {
        const p = hoverPt; hoverPt = null;
        if (!p || mode || map.isMoving()) return;
        const hit = map.queryRenderedFeatures(p, { layers: ['regions-fill'] }).length > 0;
        map.getCanvas().style.cursor = hit ? 'pointer' : '';
      });
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
    // Keep the sound control beside the party box as it opens, closes or grows.
    if (window.ResizeObserver) new ResizeObserver(placeSoundCtl).observe($('#party'));
    window.addEventListener('resize', placeSoundCtl);
    const unseen = unseenQuests().length;
    if (unseen) toast(`${unseen} new quest${unseen === 1 ? '' : 's'} in your logbook`, 'quest', 9000, () => toggleLog(true, 'quests'));
    checkHash();
  }

  // Hold the left and right mouse buttons together and drag sideways to rotate the map.
  function setupRotate() {
    const cont = map.getCanvasContainer();
    let rot = null;
    const end = () => {
      if (!rot) return;
      rot = null;
      cont.classList.remove('rotating');
      if (!(mode && mode.type === 'brush')) map.dragPan.enable();
    };
    cont.addEventListener('mousedown', (e) => {
      if ((e.buttons & 3) !== 3) return;
      rot = { x: e.clientX, bearing: map.getBearing() };
      map.dragPan.disable();
      cont.classList.add('rotating');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!rot) return;
      if ((e.buttons & 3) !== 3) { end(); return; }
      map.setBearing(rot.bearing + (e.clientX - rot.x) * 0.5);
    });
    window.addEventListener('mouseup', (e) => { if ((e.buttons & 3) !== 3) end(); });
    window.addEventListener('blur', end);
    cont.addEventListener('contextmenu', (e) => e.preventDefault());
    // Stop the browser from starting its own drag (a "picture" of the selection or an image)
    // instead of panning the map, e.g. when text in the editor was left selected.
    const mapEl = map.getContainer();
    mapEl.addEventListener('dragstart', (e) => e.preventDefault(), true);
    mapEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      const s = window.getSelection();
      if (s && !s.isCollapsed) s.removeAllRanges();
    }, true);
    // Compass: point north again.
    map.getContainer().addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('.maplibregl-ctrl-compass')) map.easeTo({ bearing: 0, duration: 400 });
    }, true);
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
    // When the map is turned, the screen's corners reach further, so it needs to be zoomed in a bit more.
    const br = map.getBearing() * Math.PI / 180, cs = Math.abs(Math.cos(br)), sn = Math.abs(Math.sin(br));
    const vw = c.clientWidth * cs + c.clientHeight * sn, vh = c.clientWidth * sn + c.clientHeight * cs;
    const zw = Math.log2(vw / (512 * Math.abs(b.x - a.x)));
    const zh = Math.log2(vh / (512 * Math.abs(b.y - a.y)));
    map.setMinZoom(Math.max(zw, zh));
  }

  // ===== Fog of war =====
  // The fog is two layers made on the fly: a thick cloudy base and a see-through layer of wisps
  // on top. They drift at different speeds and angles, so the pattern never visibly repeats.
  // You choose the look in the editor; it is published with the map.
  const FOG_S = 512, WISP_S = 384;
  const fogFx = { key: '', noiseKey: '', nb: null, nw: null, base: null, wisp: null, out: null, wout: null, ox: 0, oy: 0, wx: 0, wy: 0, t: 0, last: 0, raf: 0 };
  // Seamless (tiling) cloud noise, values 0..1. freq << (octaves-1) must divide S.
  function fogNoise(S, freq, octaves, ridged, seed) {
    let s = (seed * 7919) % 2147483647 || 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const out = new Float32Array(S * S), fade = (t) => t * t * (3 - 2 * t);
    let amp = 1, total = 0;
    for (let o = 0; o < octaves; o++) {
      const f = freq << o, cell = S / f, tab = new Float32Array(f * f);
      for (let i = 0; i < tab.length; i++) tab[i] = rnd();
      for (let y = 0; y < S; y++) {
        const gy = y / cell, y0 = Math.floor(gy), ty = fade(gy - y0), r0 = (y0 % f) * f, r1 = ((y0 + 1) % f) * f;
        for (let x = 0; x < S; x++) {
          const gx = x / cell, x0 = Math.floor(gx), tx = fade(gx - x0), c0 = x0 % f, c1 = (x0 + 1) % f;
          const a = tab[r0 + c0], b2 = tab[r0 + c1], c = tab[r1 + c0], d = tab[r1 + c1];
          const top = a + (b2 - a) * tx;
          let v = top + (c + (d - c) * tx - top) * ty;
          if (ridged) v = 1 - Math.abs(v * 2 - 1);
          out[y * S + x] += v * amp;
        }
      }
      total += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return out;
  }
  const fogCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const hexRgb = (h) => { const n = parseInt(safeColor(h, FOG_DEFAULT.tint).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  // Light fog is pale mist; dark fog is nearly black.
  function fogBaseColor(st) {
    const mw = (1 - st.darkness) * 0.55, mul = 1 - st.darkness * 0.6;
    return hexRgb(st.tint).map((v) => Math.round((v + (255 - v) * mw) * mul));
  }
  // (Re)build the fog images when the look changes. Returns true if anything changed.
  function buildFogLook() {
    const st = data.fogStyle, L = FOG_LOOKS[st.look] || FOG_LOOKS.smoke;
    const nk = st.look + ':' + st.seed;
    if (fogFx.noiseKey !== nk) {
      fogFx.nb = fogNoise(FOG_S, L.base[0], L.base[1], L.base[2], st.seed);
      fogFx.nw = fogNoise(WISP_S, L.wisp[0], L.wisp[1], L.wisp[2], st.seed * 31 + 5);
      fogFx.noiseKey = nk; fogFx.key = '';
    }
    const key = nk + ':' + st.darkness + ':' + st.tint;
    if (fogFx.key === key) return false;
    fogFx.key = key;
    if (!fogFx.base) { fogFx.base = fogCanvas(FOG_S); fogFx.wisp = fogCanvas(WISP_S); fogFx.out = fogCanvas(FOG_S); fogFx.wout = fogCanvas(WISP_S); }
    const b = fogBaseColor(st), lo = b.map((v) => v * 0.72), hi = b.map((v) => v + (255 - v) * 0.13), wc = b.map((v) => v + (255 - v) * 0.42);
    const g = fogFx.base.getContext('2d'), img = g.createImageData(FOG_S, FOG_S), px = img.data;
    for (let i = 0, n = FOG_S * FOG_S; i < n; i++) {
      const k = Math.min(1, Math.max(0, 0.5 + (fogFx.nb[i] - 0.5) * L.contrast * 2));
      px[i * 4] = lo[0] + (hi[0] - lo[0]) * k; px[i * 4 + 1] = lo[1] + (hi[1] - lo[1]) * k; px[i * 4 + 2] = lo[2] + (hi[2] - lo[2]) * k; px[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const wg = fogFx.wisp.getContext('2d'), wimg = wg.createImageData(WISP_S, WISP_S), wp = wimg.data;
    for (let i = 0, n = WISP_S * WISP_S; i < n; i++) {
      let t = Math.min(1, Math.max(0, (fogFx.nw[i] - L.wispLo) / (L.wispHi - L.wispLo)));
      t = t * t * (3 - 2 * t);
      wp[i * 4] = wc[0]; wp[i * 4 + 1] = wc[1]; wp[i * 4 + 2] = wc[2]; wp[i * 4 + 3] = t * L.wispAmt * 255;
    }
    wg.putImageData(wimg, 0, 0);
    return true;
  }
  // Copy each layer into the map at its current drift offset.
  function pushFogImages() {
    if (!map || !fogFx.base) return;
    const draw = (src, out, x, y) => {
      const S = out.width, g = out.getContext('2d', { willReadFrequently: true });
      // Whole pixels only: half-pixel copies leave a faint seam where they meet.
      const px = ((Math.round(x) % S) + S) % S, py = ((Math.round(y) % S) + S) % S;
      g.clearRect(0, 0, S, S);
      g.drawImage(src, px, py); g.drawImage(src, px - S, py); g.drawImage(src, px, py - S); g.drawImage(src, px - S, py - S);
      return g.getImageData(0, 0, S, S);
    };
    const a = draw(fogFx.base, fogFx.out, fogFx.ox, fogFx.oy), w = draw(fogFx.wisp, fogFx.wout, fogFx.wx, fogFx.wy);
    try {
      if (map.hasImage('fog-tex')) map.updateImage('fog-tex', a); else map.addImage('fog-tex', a);
      if (map.hasImage('fog-wisp')) map.updateImage('fog-wisp', w); else map.addImage('fog-wisp', w);
    } catch (e) { /* the map isn't ready yet; the next frame will try again */ }
  }
  function setWispOpacity() {
    if (!styleReady) return;
    const st = data.fogStyle, breathe = st.pulse ? 0.65 + 0.35 * Math.sin(fogFx.t * 0.7) : 1;
    try { map.setPaintProperty('fog-wisp', 'fill-opacity', (editing ? 0.35 : 1) * breathe); } catch (e) { /* busy */ }
  }
  // Go easy on slower phones and laptops, and respect "reduce motion" settings.
  const LOW_POWER = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOG_FRAME_MS = LOW_POWER ? 100 : 66; // 10 or 15 frames a second is plenty for drifting fog
  const fogMoving = () => styleReady && !REDUCED_MOTION && (data.fogStyle.speed > 0 || data.fogStyle.pulse) && data.fog.some((f) => f.active && f.shape);
  // Only animate when some fog is actually on screen.
  function fogOnScreen() {
    const b = map.getBounds(), w = b.getWest(), s = b.getSouth(), e = b.getEast(), n = b.getNorth();
    return fogBoxes.some((x) => x[0] <= e && x[2] >= w && x[1] <= n && x[3] >= s);
  }
  function startFogAnim() {
    if (fogFx.raf || !fogMoving()) return;
    fogFx.last = 0;
    fogFx.raf = requestAnimationFrame(fogTick);
  }
  function fogTick(now) {
    fogFx.raf = 0;
    if (!fogMoving()) return;
    fogFx.raf = requestAnimationFrame(fogTick);
    if (fogFx.last && now - fogFx.last < FOG_FRAME_MS) return;
    const dt = fogFx.last ? Math.min(0.25, (now - fogFx.last) / 1000) : 0;
    fogFx.last = now;
    // Pause while someone pans or zooms (keeps dragging smooth), or when no fog is in view.
    if (map.isMoving() || !fogOnScreen()) return;
    fogFx.t += dt;
    const st = data.fogStyle;
    if (st.speed > 0) {
      const v = st.speed * 5, a = st.dir * Math.PI / 180, a2 = a + 0.5;
      fogFx.ox += Math.cos(a) * v * dt; fogFx.oy -= Math.sin(a) * v * dt;
      fogFx.wx += Math.cos(a2) * v * 1.8 * dt; fogFx.wy -= Math.sin(a2) * v * 1.8 * dt;
      pushFogImages();
    }
    if (st.pulse) setWispOpacity();
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
  // Round off the sharp notches where brush strokes meet (Chaikin corner cutting).
  // The soft glow around the fog is drawn along this smoothed outline, so it can't fan out into spikes.
  function smoothRing(ring, passes) {
    let r = ring.slice(0, -1);
    for (let p = 0; p < passes && r.length > 2; p++) {
      const out = [];
      for (let i = 0; i < r.length; i++) {
        const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length];
        out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
      }
      r = out;
    }
    r.push(r[0]);
    return r;
  }
  let fogBoxes = [];
  function fogCollections() {
    const shaped = data.fog.filter((f) => f.shape), active = shaped.filter((f) => f.active);
    fogBoxes = active.map((f) => ringBox(f.shape.flatMap((p) => p[0])));
    // One seamless cover: the fogged areas merged with everything outside the map, so it all looks the same.
    const cover = { type: 'Feature', properties: { fill: true }, geometry: { type: 'MultiPolygon', coordinates: fogCover(active) } };
    return {
      fog: { type: 'FeatureCollection', features: [cover].concat(shaped.map((f) => ({ type: 'Feature', properties: { id: f.id, active: f.active, outline: true }, geometry: { type: 'MultiPolygon', coordinates: f.shape } }))) },
      soft: { type: 'FeatureCollection', features: active.map((f) => ({ type: 'Feature', properties: { active: true }, geometry: { type: 'MultiLineString', coordinates: f.shape.flatMap((poly) => poly.map((ring) => smoothRing(ring, 2))) } })) }
    };
  }
  let coverCache = { shapes: null, geom: null };
  function fogCover(active) {
    const shapes = active.map((f) => f.shape);
    if (coverCache.shapes && coverCache.shapes.length === shapes.length && coverCache.shapes.every((s, i) => s === shapes[i])) return coverCache.geom;
    const mask = outsideMask().geometry.coordinates;
    let geom = null;
    try { if (window.polygonClipping) geom = window.polygonClipping.union(mask, ...shapes); } catch (e) { geom = null; }
    if (!geom) geom = [mask].concat(...shapes); // fallback if the shape tool didn't load
    coverCache = { shapes, geom };
    return geom;
  }
  // The whole world with a hole cut out for the campaign area.
  function outsideMask() {
    const [[w, s], [e, n]] = LOCK_BOUNDS;
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [
      [[-179, -84], [179, -84], [179, 84], [-179, 84], [-179, -84]],
      [[w, s], [w, n], [e, n], [e, s], [w, s]]
    ] } };
  }
  function renderFog() {
    if (!styleReady) return;
    const c = fogCollections();
    map.getSource('fog').setData(c.fog);
    map.getSource('fog-soft').setData(c.soft);
    applyFogLook();
  }
  // Players see thick fog with soft edges; you see it see-through with an outline.
  function applyFogLook() {
    const st = data.fogStyle, c = 'rgb(' + fogBaseColor(st).join(',') + ')';
    try {
      map.setPaintProperty('fog-fill', 'fill-opacity', editing ? 0.55 : st.thickness);
      map.setPaintProperty('fog-edge', 'line-opacity', editing ? 0 : 0.9 * st.thickness);
      map.setPaintProperty('fog-haze', 'line-opacity', editing ? 0 : 0.55 * st.thickness);
      map.setPaintProperty('fog-edge', 'line-color', c);
      map.setPaintProperty('fog-haze', 'line-color', c);
      map.setLayoutProperty('fog-line', 'visibility', editing ? 'visible' : 'none');
      setWispOpacity();
    } catch (e) {
      map.once('idle', applyFogLook); // the map was busy; try again in a moment
      return;
    }
    if (buildFogLook()) pushFogImages();
    startFogAnim();
  }

  function renderAll() {
    renderSoundCtl();
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
    if (publishedRef !== published) { publishedRef = published; publishedStr = JSON.stringify(published); }
    const freshStr = JSON.stringify(fresh);
    if (freshStr === publishedStr) return;
    publishedStr = freshStr; publishedRef = fresh;
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
    if (ruler.active && ruler.points.length && !typing) { ruler.points = []; drawRuler(); showRuler(); return; }
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
    // A pin set to show through fog: players see a faded, foggy pin they can't open yet.
    const hazy = !editing && loc.throughFog && fogged(loc.lng, loc.lat);
    if (hazy) { b.classList.add('in-fog'); label.remove(); } // no name tag on the map; players click to learn the name
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (editing) selectPin(loc.id);
      else if (hazy) openFoggedPopup(loc);
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
    data.locations.filter((l) => l.throughFog || !fogged(l.lng, l.lat)).forEach(addMarker);
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
      const ang = r.labelAngle || 0;
      // Angled names turn with the map so they keep following the land; straight ones stay level.
      const mk = new maplibregl.Marker({ element: d, anchor: 'center', draggable: editing, rotation: ang, rotationAlignment: ang ? 'map' : 'viewport', pitchAlignment: 'viewport' }).setLngLat(at).addTo(map);
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
  const perCache = new Map(); // text widths, measured once per name and font
  function fitRegionLabels() {
    if (!map) return;
    for (const { d, r, box } of labelMeta.values()) {
      const a = map.project([box[0], box[3]]), b = map.project([box[2], box[1]]);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      const text = r.name.toUpperCase();
      const mk = r.font + '|' + text;
      let per1 = perCache.get(mk);
      if (per1 == null) {
        measureCtx.font = `700 100px ${fontStack(r.font)}`;
        per1 = measureCtx.measureText(text).width / 100 + 0.2 * text.length; // width per 1px of font size (incl. letter spacing)
        perCache.set(mk, per1);
      }
      // An angled name takes up a slanted box, so fit both its length and height to the region.
      const t = ((r.labelAngle || 0) * Math.PI) / 180, c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t));
      const size = Math.min((w * 0.82) / (per1 * c + 1.95 * s), h / (per1 * s * 1.22 + 2.38 * c), REGION_SIZES[r.size]) * (r.labelScale || 1);
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
  // A pin still in the fog: players learn its name, nothing more.
  function openFoggedPopup(loc) {
    const d = data.defaults;
    showPopup('loc:' + loc.id, [loc.lng, loc.lat], card({
      title: loc.name || 'Untitled place',
      titleFont: loc.titleFont || d.titleFont, bodyFont: loc.bodyFont || d.bodyFont,
      color: loc.color || d.color, size: loc.textSize || d.textSize, description: '…'
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
    if (t && t.closest && (t.closest('.pin') || t.closest('.qmarker') || t.closest('.party-token') || t.closest('.maplibregl-popup'))) return;
    if (editing && ruler.active) { rulerClick(e.lngLat); return; }
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
    const old = lb.querySelector('.sheet-scroll');
    const keepScroll = old && lb.dataset.tab === logTab ? old.scrollTop : 0;
    lb.dataset.tab = logTab;
    lb.innerHTML = '';
    lb.appendChild(sheetHead('Logbook', () => toggleLog(false)));
    const quests = visibleQuests(data);
    const unseen = new Set(unseenQuests().map((q) => q.id));
    const beasts = data.monsters.filter((m) => m.revealed);
    const tabs = [['character', 'Character'], ['vitals', 'Sanity & Hunger'], ['notes', 'My notes'], ['quests', `Quests${unseen.size ? ' (' + unseen.size + ' new)' : ''}`], ['people', 'People']];
    if (beasts.length) tabs.push(['bestiary', 'Bestiary']);
    if (logTab === 'bestiary' && !beasts.length) logTab = 'character';
    lb.appendChild(tabBar(tabs, logTab, (id) => { logTab = id; renderLog(); }));
    const scroll = el('div', 'sheet-scroll');
    const body = el('div', 'tab-body');
    if (logTab === 'character') {
      renderCharacter(body);
    } else if (logTab === 'vitals') {
      renderVitals(body);
    } else if (logTab === 'quests') {
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
    }
    scroll.appendChild(body);
    requestAnimationFrame(() => { scroll.scrollTop = keepScroll; });
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
      relay.subscribe([`${ROOM}/p/+`, `${ROOM}/rename/${me.id}`, `${ROOM}/dice/log`, `${ROOM}/kick/+`, `${ROOM}/sound`, `${ROOM}/sound/state`, `${ROOM}/abilities/${me.id}`, `${ROOM}/partypos`, `${ROOM}/clock`, `${ROOM}/vitals/${me.id}`]);
      if (editing) relay.subscribe([`${ROOM}/abilities/+`, `${ROOM}/sheet/+`, `${ROOM}/vitals/+`]);
      restorePartyPos(); restoreClock(); shareVitalsOnce();
      announce();
      resendSheetIfPending();
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
    if (topic === `${ROOM}/sound` || topic === `${ROOM}/sound/state`) { onSoundMessage(topic, txt); return; }
    if (topic.startsWith(`${ROOM}/abilities/`)) { onAbilityMessage(topic.split('/').pop(), txt); return; }
    if (topic.startsWith(`${ROOM}/sheet/`)) { onSheetMessage(topic.split('/').pop(), txt); return; }
    if (topic === `${ROOM}/clock`) { onClockMessage(txt); return; }
    if (topic.startsWith(`${ROOM}/vitals/`)) { onVitalsMessage(topic.split('/').pop(), txt); return; }
    if (topic === `${ROOM}/partypos`) { try { onPartyPosMessage(txt); } catch (e) { /* bad message */ } return; }
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
      if (!p.dm) rememberPlayer({ id, name: cleanName(p.name) });
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
      renderSoundCtl();
      if (isKicked()) stopAllLocal();
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
    if (!open) { placeSoundCtl(); return; }
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
    placeSoundCtl();
  }
  function openPartyEditor(p) {
    if (!p) return;
    lsSet(PARTY_OPEN_KEY, true);
    partyEdit = partyEdit && partyEdit.id === p.id ? null : { id: p.id };
    renderParty();
    const inp = $('#party .party-edit input');
    if (inp) { inp.focus(); inp.select(); }
  }
  // A colour wheel: angle picks the hue, distance from the middle picks how strong the colour is.
  const WHEEL_L = 60;
  function hslHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0');
    return '#' + f(0) + f(8) + f(4);
  }
  function hexHueSat(hex) {
    const [r, g, b] = hexRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return [(h * 60 + 360) % 360, Math.min(1, s)];
  }
  function colorWheel(value, onPick) {
    const wrap = el('div', 'cwheel-row');
    const wheel = el('div', 'cwheel');
    const knob = el('span', 'cwheel-knob');
    const prev = el('span', 'cwheel-prev');
    wheel.appendChild(knob);
    wrap.appendChild(wheel);
    wrap.appendChild(prev);
    const show = (hex, h, s) => {
      const a = h * Math.PI / 180;
      knob.style.left = (50 + Math.sin(a) * s * 50) + '%';
      knob.style.top = (50 - Math.cos(a) * s * 50) + '%';
      knob.style.background = hex; prev.style.background = hex; prev.title = hex;
    };
    const [h0, s0] = hexHueSat(safeColor(value, '#e8b04a'));
    show(safeColor(value, '#e8b04a'), h0, s0);
    const pick = (e) => {
      const r = wheel.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - (r.left + r.width / 2), dy = pt.clientY - (r.top + r.height / 2);
      const s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), h = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      const hex = hslHex(h, Math.round(s * 85), WHEEL_L);
      show(hex, h, s);
      onPick(hex);
    };
    let down = false;
    wheel.addEventListener('pointerdown', (e) => { down = true; wheel.setPointerCapture(e.pointerId); pick(e); e.preventDefault(); });
    wheel.addEventListener('pointermove', (e) => { if (down) pick(e); });
    wheel.addEventListener('pointerup', () => { down = false; });
    wheel.addEventListener('pointercancel', () => { down = false; });
    return wrap;
  }
  function partyEditorForm(p) {
    const f = el('form', 'party-edit');
    const isMe = p.id === me.id;
    // Remember picks while the form is open, so a party update redrawing it doesn't lose them.
    let color = (partyEdit && partyEdit.color) || p.color;
    const inp = el('input');
    inp.maxLength = 24;
    inp.placeholder = isMe ? 'Your name' : 'Player name';
    inp.value = partyEdit && partyEdit.name != null ? partyEdit.name : p.name;
    inp.autocomplete = 'off';
    inp.oninput = () => { if (partyEdit) partyEdit.name = inp.value; };
    f.appendChild(inp);
    f.appendChild(colorWheel(color, (c) => { color = c; if (partyEdit) partyEdit.color = c; }));
    const row = el('div', 'party-edit-btns');
    if (!isMe && editing) {
      const ab = btn('Abilities', 'small', () => { partyEdit = null; renderParty(); showAbilityEditor(p.id); });
      f.insertBefore(ab, row.parentNode === f ? row : null);
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
  let diceLog = [], diceSides = 20, diceCount = 1, diceMod = 0, diceFor = '', diceHidden = false, diceUnread = 0, diceClearedAt = 0, diceNextLabel = '', diceAdv = '';
  // Advantage / disadvantage: roll each die twice, keep the higher / lower.
  function rollSet(count, sides, adv) {
    const results = [], dropped = [];
    for (let i = 0; i < count; i++) {
      const a = rollDie(sides);
      if (!adv) { results.push(a); continue; }
      const b = rollDie(sides);
      const keep = adv === 'adv' ? Math.max(a, b) : Math.min(a, b);
      results.push(keep);
      dropped.push(keep === a ? b : a);
    }
    return { results, dropped };
  }
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
      total: results.reduce((s, v) => s + v, 0) + mod, ts: num(x.ts) || 0, revealed: !!x.revealed,
      label: str(x.label).replace(/\s+/g, ' ').trim().slice(0, 40),
      adv: x.adv === 'adv' || x.adv === 'dis' ? x.adv : '',
      dropped: arr(x.dropped).map(Number).filter((v) => Number.isInteger(v) && v >= 1 && v <= sides).slice(0, 20)
    };
  }
  function mergeRolls(list) {
    const byKey = new Map(diceLog.map((x) => [x.id, x]));
    let added = 0;
    for (const raw of list) {
      const x = cleanRoll(raw);
      if (!x || byKey.has(x.id) || x.ts <= diceClearedAt) continue;
      byKey.set(x.id, x);
      added++;
    }
    diceLog = [...byKey.values()].sort((a, b) => a.ts - b.ts).slice(-DICE_LOG_MAX);
    return added;
  }
  function publishRolls() {
    if (relay && relay.connected) relay.publish(`${ROOM}/dice/log`, JSON.stringify({ clearedAt: diceClearedAt, rolls: diceLog }), { retain: true });
  }
  function onDiceMessage(txt) {
    let msg;
    try { msg = JSON.parse(txt); } catch (e) { return; }
    const list = Array.isArray(msg) ? msg : arr(msg && msg.rolls);
    const cleared = !Array.isArray(msg) && msg ? num(msg.clearedAt) || 0 : 0;
    let wiped = false;
    if (cleared > diceClearedAt) {
      diceClearedAt = cleared;
      const before = diceLog.length;
      diceLog = diceLog.filter((x) => x.ts > diceClearedAt);
      wiped = diceLog.length !== before;
      if (wiped) diceUnread = 0;
    }
    const added = mergeRolls(list);
    if (wiped && !added) { renderDice(true); return; }
    if (!added) return;
    if (!lsGet(DICE_OPEN_KEY, false)) diceUnread += added;
    renderDice(true);
  }
  function doRoll() {
    if (isKicked()) { toast('You were removed from the session, so you can’t roll.', 'warn'); return; }
    const { results, dropped } = rollSet(diceCount, diceSides, diceAdv);
    const adv = diceAdv;
    diceAdv = '';
    const target = editing && diceFor ? party.get(diceFor) : null;
    const e = {
      id: uid(), byId: me.id, by: me.name || 'Someone', color: me.color, dm: editing,
      forName: target ? target.name : '', forColor: target ? target.color : '', sides: diceSides, count: diceCount, mod: diceMod,
      results, total: results.reduce((s, v) => s + v, 0) + diceMod, ts: Date.now(), revealed: false, label: diceNextLabel, adv, dropped
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
    if (e.label) who.appendChild(el('span', 'roll-label', ' · ' + e.label));
    if (e.adv) who.appendChild(el('span', 'roll-tag ' + e.adv, e.adv === 'adv' ? 'advantage' : 'disadvantage'));
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
    (e.dropped || []).forEach((v) => res.appendChild(el('span', 'roll-die dropped', String(v))));
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
      b.onclick = () => { diceSides = n; diceNextLabel = ''; fillDiceControls(); };
      dice.appendChild(b);
    });
    c.appendChild(dice);
    const row = el('div', 'dice-row');
    const cnt = el('div', 'dice-count');
    cnt.appendChild(btn('−', 'small', () => { diceCount = Math.max(1, diceCount - 1); diceNextLabel = ''; fillDiceControls(); }));
    cnt.appendChild(el('span', 'dice-n'));
    cnt.appendChild(btn('+', 'small', () => { diceCount = Math.min(20, diceCount + 1); diceNextLabel = ''; fillDiceControls(); }));
    row.appendChild(cnt);
    const modL = el('label', 'dice-mod', 'Mod');
    const mod = el('input');
    mod.type = 'number'; mod.min = '-99'; mod.max = '99'; mod.step = '1'; mod.value = String(diceMod);
    mod.oninput = () => { diceMod = Math.max(-99, Math.min(99, Math.round(+mod.value || 0))); diceNextLabel = ''; fillDiceControls(); };
    modL.appendChild(mod);
    row.appendChild(modL);
    const roll = btn('Roll', 'primary dice-roll', () => doRoll());
    row.appendChild(roll);
    c.appendChild(row);
    const advRow = el('div', 'dice-row dice-adv');
    [['', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']].forEach(([v, l]) => {
      const b = el('button', 'die adv-opt', l);
      b.type = 'button';
      b.dataset.adv = v;
      b.title = v === 'adv' ? 'Roll twice, keep the higher' : v === 'dis' ? 'Roll twice, keep the lower' : 'Roll once';
      b.onclick = () => { diceAdv = v; fillDiceControls(); };
      advRow.appendChild(b);
    });
    c.insertBefore(advRow, c.lastChild);
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
    const dm2 = el('div', 'dice-row dice-dm');
    dm2.appendChild(btn('Clear rolls', 'small ghost dice-clear', async () => {
      if (!(await ask('Clear the dice feed for everyone? Your hidden rolls stay.', 'Clear', 'Cancel'))) return;
      diceClearedAt = Date.now();
      diceLog = [];
      diceUnread = 0;
      publishRolls();
      renderDice(true);
    }));
    c.appendChild(dm2);
    box.appendChild(c);
  }
  function fillDiceControls() {
    const box = $('#dice');
    if (!box || !box.querySelector('.dice-controls')) return;
    box.querySelectorAll('.die:not(.adv-opt)').forEach((b) => b.classList.toggle('on', +b.dataset.sides === diceSides));
    box.querySelectorAll('.adv-opt').forEach((b) => b.classList.toggle('on', b.dataset.adv === diceAdv));
    box.querySelector('.dice-n').textContent = String(diceCount);
    box.querySelector('.dice-roll').textContent = (editing && diceHidden ? 'Roll hidden ' : 'Roll ') + diceLabel(diceCount, diceSides, diceMod) + (diceAdv === 'adv' ? ' (adv)' : diceAdv === 'dis' ? ' (dis)' : '') + (diceNextLabel ? ' · ' + diceNextLabel : '');
    const modIn = box.querySelector('.dice-mod input');
    if (modIn && document.activeElement !== modIn) modIn.value = String(diceMod);
    box.querySelectorAll('.dice-dm').forEach((row) => { row.hidden = !editing; });
    const dm = box.querySelector('.dice-dm');
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

  // ===== Soundboard: the DM plays sounds on everyone's map =====
  const SOUND_PREFS_KEY = 'campaign-map.sound', MAX_AUDIO_MB = 8, LOOP_STATE_MAX_AGE = 6 * 3600 * 1000;
  let soundOn = false, remoteLoops = [];
  let soundPrefs = Object.assign({ volume: 0.8, muted: false }, lsGet(SOUND_PREFS_KEY, {}));
  const loops = new Map();          // sound id -> looping Audio
  const oneShots = new Set();       // one-shot Audio elements still playing
  const activeLoopIds = new Set();  // loops the DM has running
  const soundById = (id) => data.sounds.find((s) => s.id === id) || published.sounds.find((s) => s.id === id);
  const outVol = (s) => (soundPrefs.muted ? 0 : Math.max(0, Math.min(1, s.volume * soundPrefs.volume)));
  function playLocal(id) {
    const s = soundById(id);
    if (!s || (!soundOn && !editing)) return;
    const src = resolveImage(s.audio);
    if (s.loop) {
      let a = loops.get(id);
      if (!a) { a = new Audio(src); a.loop = true; loops.set(id, a); }
      a.volume = outVol(s);
      a.play().catch(() => {});
    } else {
      const a = new Audio(src);
      a.volume = outVol(s);
      oneShots.add(a);
      a.addEventListener('ended', () => oneShots.delete(a));
      a.play().catch(() => oneShots.delete(a));
    }
  }
  function stopLocal(id) { const a = loops.get(id); if (a) { a.pause(); loops.delete(id); } }
  function stopAllLocal() {
    for (const a of loops.values()) a.pause();
    loops.clear();
    for (const a of oneShots) a.pause();
    oneShots.clear();
  }
  function applyVolumes() { for (const [id, a] of loops) { const s = soundById(id); if (s) a.volume = outVol(s); } }
  function syncLoops() {
    for (const id of [...loops.keys()]) if (!remoteLoops.includes(id)) stopLocal(id);
    for (const id of remoteLoops) if (!loops.has(id)) playLocal(id);
  }
  function sendSound(m) { if (relay && relay.connected) relay.publish(`${ROOM}/sound`, JSON.stringify(Object.assign({ ts: Date.now() }, m))); }
  function publishLoopState() {
    if (relay && relay.connected) relay.publish(`${ROOM}/sound/state`, JSON.stringify({ loops: [...activeLoopIds], ts: Date.now() }), { retain: true });
  }
  function onSoundMessage(topic, txt) {
    if (isKicked() || !txt) return;
    let m;
    try { m = JSON.parse(txt); } catch (e) { return; }
    if (topic.endsWith('/sound/state')) {
      const fresh = Date.now() - (num(m.ts) || 0) < LOOP_STATE_MAX_AGE;
      remoteLoops = fresh ? arr(m.loops).filter((x) => typeof x === 'string') : [];
      if (editing) { activeLoopIds.clear(); remoteLoops.forEach((id) => activeLoopIds.add(id)); refreshSoundRows(); }
      syncLoops();
      return;
    }
    if (editing) return; // the DM already heard it
    if (m.action === 'play' && Date.now() - (num(m.ts) || 0) < 30000) playLocal(str(m.id));
    if (m.action === 'stopall') stopAllLocal();
  }
  // DM controls
  function dmPlay(s) {
    if (!published.sounds.some((p) => p.id === s.id && p.audio === s.audio)) toast('Only you can hear this one until you Publish, because players don’t have it yet.', 'warn', 6000);
    playLocal(s.id);
    if (s.loop) { activeLoopIds.add(s.id); publishLoopState(); } else sendSound({ action: 'play', id: s.id });
    refreshSoundRows();
  }
  function dmStop(s) { stopLocal(s.id); activeLoopIds.delete(s.id); publishLoopState(); refreshSoundRows(); }
  function dmStopAll() { stopAllLocal(); activeLoopIds.clear(); publishLoopState(); sendSound({ action: 'stopall' }); refreshSoundRows(); }
  // Players' sound control (top right, under the Logbook)
  function renderSoundCtl() {
    const box = $('#sound-ctl');
    if (!box) return;
    box.innerHTML = '';
    if (editing || !published.sounds.length || isKicked()) { box.hidden = true; return; }
    box.hidden = false;
    if (!soundOn) {
      box.appendChild(btn('Enable sound', 'small', () => { soundOn = true; renderSoundCtl(); syncLoops(); }));
      placeSoundCtl();
      return;
    }
    // Speaker button folds the control away (or opens it again).
    const quiet = soundPrefs.muted || soundPrefs.volume === 0;
    const icon = el('button', 'sound-icon');
    icon.type = 'button';
    icon.title = soundPrefs.collapsed ? 'Show sound controls' : 'Hide sound controls';
    icon.setAttribute('aria-expanded', String(!soundPrefs.collapsed));
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>' +
      (quiet ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
        : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>') + '</svg>';
    icon.onclick = () => { soundPrefs.collapsed = !soundPrefs.collapsed; lsSet(SOUND_PREFS_KEY, soundPrefs); renderSoundCtl(); };
    box.appendChild(icon);
    box.classList.toggle('collapsed', !!soundPrefs.collapsed);
    if (!soundPrefs.collapsed) {
      const r = el('input');
      r.type = 'range'; r.min = '0'; r.max = '1'; r.step = '0.05'; r.value = String(soundPrefs.volume);
      r.setAttribute('aria-label', 'Volume');
      r.oninput = () => { soundPrefs.volume = +r.value; lsSet(SOUND_PREFS_KEY, soundPrefs); applyVolumes(); };
      box.appendChild(r);
      box.appendChild(btn(soundPrefs.muted ? 'Unmute' : 'Mute', 'small ghost', () => {
        soundPrefs.muted = !soundPrefs.muted; lsSet(SOUND_PREFS_KEY, soundPrefs); applyVolumes(); renderSoundCtl();
      }));
    }
    placeSoundCtl();
  }
  // The DM's clock: middle of the screen, level with the party box's top bar.
  function levelClock() {
    const c = $('#clock'), p = $('#party');
    if (!c || c.hidden || !p) return;
    const head = p.querySelector('.party-head'), face = c.querySelector('.clock-face');
    if (!head || !face) return;
    const hr = head.getBoundingClientRect();
    c.style.top = Math.round(hr.top + (hr.height - face.offsetHeight) / 2) + 'px';
  }
  // Sit just to the right of the party box, whatever its size.
  function placeSoundCtl() {
    levelClock();
    const box = $('#sound-ctl'), p = $('#party');
    if (!box || box.hidden || !p) return;
    const r = p.getBoundingClientRect();
    if (!r.width) { box.style.left = '14px'; box.style.top = '14px'; return; }
    // Line it up with the middle of the party box's top bar.
    const head = p.querySelector('.party-head'), hr = head ? head.getBoundingClientRect() : r;
    box.style.left = Math.round(r.right + 10) + 'px';
    box.style.top = Math.round(hr.top + (hr.height - box.offsetHeight) / 2) + 'px';
  }
  function readFileAsDataURL(file) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
  }
  const SOUND_CAT_KEY = 'campaign-map.soundCat';
  let soundCat = lsGet(SOUND_CAT_KEY, 'music') || 'music';
  function showSounds() {
    currentView = 'sounds'; selectedId = null; setTab('sounds'); updateStatus(); popup.remove();
    const b = body();
    const top = el('div', 'btn-row');
    const up = el('label', 'btn primary', 'Upload MP3s…');
    up.style.margin = '0'; up.style.color = '#141414';
    const file = el('input');
    file.type = 'file'; file.accept = 'audio/*,.mp3'; file.multiple = true; file.hidden = true;
    file.onchange = async () => {
      const list = [...file.files];
      file.value = '';
      for (const f of list) {
        if (f.size > MAX_AUDIO_MB * 1024 * 1024) { toast(`${f.name} is over ${MAX_AUDIO_MB} MB. Try a shorter clip or a lower quality MP3.`, 'warn', 7000); continue; }
        try {
          let url = await readFileAsDataURL(f);
          if (/^data:(application\/octet-stream|);base64,/.test(url)) url = url.replace(/^data:[^;]*;/, 'data:audio/mpeg;');
          if (!safeAudioSrc(url)) { toast(`${f.name} isn’t an audio file this map can play.`, 'warn'); continue; }
          data.sounds.push({ id: uid(), name: f.name.replace(/\.[^.]+$/, '').slice(0, 40), audio: url, loop: soundCat === 'music' || soundCat === 'ambience', volume: 0.8, cat: soundCat === 'all' ? '' : soundCat });
        } catch (e) { toast(`Couldn’t read ${f.name}.`, 'error'); }
      }
      changed();
      showSounds();
    };
    up.appendChild(file);
    top.appendChild(up);
    top.appendChild(btn('Stop all', 'small', dmStopAll));
    b.appendChild(top);
    b.appendChild(el('p', 'tip', `Press Play during the session and it plays on every open map. Loops keep going (and start for anyone who joins) until you stop them. Publish after adding sounds so players get them. Up to ${MAX_AUDIO_MB} MB per file.`));
    if (!data.sounds.length) { b.appendChild(el('p', 'muted', 'No sounds yet. Pick a category below, then upload MP3s into it.')); }
    // Category chips: show one group at a time so there's less scrolling.
    const cats = SOUND_CATS.filter(([k]) => k || data.sounds.some((s) => !s.cat));
    if (soundCat !== 'all' && !cats.some(([k]) => k === soundCat)) soundCat = 'music';
    const chips = el('div', 'sound-cats');
    [['all', 'All']].concat(cats).forEach(([k, label]) => {
      const inCat = k === 'all' ? data.sounds : data.sounds.filter((s) => s.cat === k);
      const c = btn(label + ' ' + inCat.length, 'small sound-cat' + (soundCat === k ? ' on' : '') + (inCat.some((s) => s.loop && activeLoopIds.has(s.id)) ? ' live' : ''), () => { soundCat = k; lsSet(SOUND_CAT_KEY, k); showSounds(); });
      chips.appendChild(c);
    });
    b.appendChild(chips);
    const shown = soundCat === 'all' ? data.sounds : data.sounds.filter((s) => s.cat === soundCat);
    if (data.sounds.length && !shown.length) b.appendChild(el('p', 'muted', 'Nothing in this category yet. Upload here, or move sounds in with their category menu.'));
    const list = el('div', 'sound-list');
    shown.forEach((s) => list.appendChild(soundRow(s)));
    b.appendChild(list);
    refreshSoundRows();
  }
  function soundRow(s) {
    const row = el('div', 'sound-row');
    row.dataset.id = s.id;
    const play = btn('', 'small sound-play', () => { if (s.loop && activeLoopIds.has(s.id)) dmStop(s); else dmPlay(s); });
    row.appendChild(play);
    const name = el('input', 'sound-name');
    name.value = s.name; name.maxLength = 40;
    name.oninput = () => { s.name = name.value; changed(); };
    row.appendChild(name);
    const opts = el('div', 'sound-opts');
    const ll = el('label', 'check');
    const lc = el('input');
    lc.type = 'checkbox'; lc.checked = s.loop;
    lc.onchange = () => { if (activeLoopIds.has(s.id)) dmStop(s); s.loop = lc.checked; changed(); refreshSoundRows(); };
    ll.appendChild(lc); ll.appendChild(document.createTextNode(' Loop'));
    opts.appendChild(ll);
    const cs = selectInput(SOUND_CATS.map(([k, l]) => [k, l]), s.cat || '', (v) => { s.cat = v; changed(); showSounds(); });
    cs.className = 'sound-catsel'; cs.title = 'Category';
    opts.appendChild(cs);
    const v = el('input');
    v.type = 'range'; v.min = '0.05'; v.max = '1'; v.step = '0.05'; v.value = String(s.volume);
    v.title = 'Volume';
    v.oninput = () => { s.volume = +v.value; applyVolumes(); changed(); };
    opts.appendChild(v);
    opts.appendChild(btn('Delete', 'small danger', async () => {
      if (!(await ask(`Delete the sound “${s.name}”?`, 'Delete', 'Keep it'))) return;
      dmStop(s);
      data.sounds = data.sounds.filter((x) => x !== s); changed(); showSounds();
    }));
    row.appendChild(opts);
    if (!published.sounds.some((p) => p.id === s.id && p.audio === s.audio)) row.appendChild(el('div', 'tip sound-new', 'New: Publish so players can hear it.'));
    return row;
  }
  function refreshSoundRows() {
    document.querySelectorAll('.sound-row').forEach((row) => {
      const s = data.sounds.find((x) => x.id === row.dataset.id);
      if (!s) return;
      const playing = s.loop && activeLoopIds.has(s.id);
      const b = row.querySelector('.sound-play');
      b.textContent = playing ? 'Stop' : 'Play';
      b.classList.toggle('accent', playing);
      row.classList.toggle('playing', playing);
    });
  }

  // ===== Character sheet: Decline of the East, P.R.O.W.E.S.S (saved on each player's device) =====
  const PROWESS = [
    ['power', 'Power', ['Force', 'Control', 'Impact']],
    ['reflex', 'Reflex', ['Speed', 'Performance', 'Sleight of Hand']],
    ['outlook', 'Outlook', ['Sense', 'Insight', 'Evasion']],
    ['wit', 'Wit', ['Logic', 'Memory', 'History']],
    ['endurance', 'Endurance', ['Vitality', 'Recovery', 'Tolerance']],
    ['social', 'Social', ['Intimidation', 'Persuasion', 'Composure']],
    ['serendipity', 'Serendipity', ['Luck', 'Fortune', 'Opportunity']]
  ];
  const STAT_POINTS = 28, STAT_MAX = 10;
  // Bonuses step up on odd numbers; 10 is the exception at +5.
  const statBonus = (v) => (v >= 10 ? 5 : Math.max(0, Math.floor((v - 1) / 2)));
  const fmtBonus = (b) => (b >= 0 ? '+' : '−') + Math.abs(b);
  // [group, name, {stat: bonus}, features]
  const BACKGROUNDS = [
    ['Soldier', 'Infantry', { reflex: 1, endurance: 1 }, 'Rifle Training: proficiency with bolt-action rifles; ignore basic handling penalties. Machine Gun Training: operate machine guns without movement or stability penalties. Bayonet Training: a mounted bayonet works as a melee weapon using the rifle’s base damage.'],
    ['Soldier', 'Combat Medic', { outlook: 1, wit: 1 }, 'Sidearm Training: proficiency with pistols and sidearms; drawing one doesn’t use an action. Field Treatment: when healing, roll twice and take the higher. Stabilization: attempt to stop injuries escalating during combat.'],
    ['Soldier', 'Artillerist', { power: 1, outlook: 1 }, 'Artillery Operator: proficiency with artillery, cannons and mounted weapons. Targeting Discipline: advantage on Sense checks for range, positioning and targeting. Rifle Familiarity: proficiency with bolt-action rifles.'],
    ['Industrial Worker', 'Factory Worker', { endurance: 1, reflex: 1 }, 'Quick Hands: reloading or readying equipment costs less when applicable. Enduring Hours: advantage resisting fatigue, strain and long physical stress. Work-Hardened: reduced penalties from fatigue, strain or long physical tasks.'],
    ['Industrial Worker', 'Electrician', { wit: 1, outlook: 1 }, 'Technical Familiarity: advantage on Logic checks with electrical systems. Electrical Resistance: reduced damage from electrical sources. Reactive Grounding: as a reaction to an electrical attack, try to redirect or ground it.'],
    ['Industrial Worker', 'Machine Operator', { wit: 2 }, 'Machine Savant: advantage on Logic checks with machinery. System Familiarity: an extra attempt when working mechanical devices. Mechanical Insight: spot weaknesses in machines or constructs.'],
    ['Logistical Worker', 'Courier', { reflex: 1, outlook: 1 }, 'Expert Scout: choose Urban or Rural; advantage on Sense and Memory checks there. Careful Footwork: advantage on stealth movement and avoiding traps. Route Discipline: reduced penalties on difficult terrain.'],
    ['Logistical Worker', 'Railway Operator', { power: 1, wit: 1 }, 'Operational Awareness: always aware of time, schedules and travel timing. Vehicle Combat Familiarity: advantage on checks while acting from moving vehicles. Mechanical Discipline: advantage on Logic checks with rail systems.'],
    ['Logistical Worker', 'Prohibition Smuggler', { reflex: 1, social: 1 }, 'Get In, Get Out: once per combat, Disengage as a free action. Risk Conditioning: advantage on Composure checks under pressure, pursuit or tense negotiation. Substance Familiarity: reduced addiction or withdrawal penalties.'],
    ['Performer', 'Wrestler', { power: 1, endurance: 1 }, 'Grapple Control: advantage on Force checks for grapples, holds and forced repositioning. Pinning Technique: a grappled target’s movement can drop to 0 until your next turn at no extra action. Ring Conditioning: advantage on Tolerance checks in long struggles or sustained melee.'],
    ['Performer', 'Restaurant Server', { reflex: 1, social: 1 }, 'Crowd Weaving: advantage on Performance or Evasion checks moving through crowded interiors. Attentive Read: advantage on Insight checks about emotional cues. Steady Carry: reduced penalties balancing unstable objects or delicate tasks under stress.'],
    ['Performer', 'Trapezist', { reflex: 1, serendipity: 1 }, 'Aerial Discipline: advantage on Performance checks for balance, climbing, swinging or heights. Mid-Air Recovery: once per encounter, reroll a failed Reflex movement or balance check and take the higher. Height Familiarity: reduced penalties from unstable footing, vertigo or height.'],
    ['Investigative Worker', 'Private Detective', { outlook: 1, wit: 1 }, 'Shadowing: advantage on stealth when following someone in town. Close Observation: advantage on Insight during direct questioning. Revolver Familiarity: proficiency with revolvers.'],
    ['Investigative Worker', 'Investigative Reporter', { wit: 1, social: 1 }, 'Press Authority: advantage on Persuasion when citing official documents. Deadline Drive: once per combat, reroll a failed Social check and take the higher. Quick Notes: advantage on Memory checks about things you witnessed.'],
    ['Investigative Worker', 'Government Inspector', { wit: 1, social: 1 }, 'Procedural Command: advantage on Intimidation when asserting legal authority. Structural Awareness: advantage on Logic checks with institutional systems. Sidearm Familiarity: proficiency with pistols.'],
    ['Occult & Religious Worker', 'Occult Researcher', { wit: 1, outlook: 1 }, 'Eldritch Lore: advantage on History checks about occult entities. Ritual Precision: in rituals, roll twice and take the higher. Mental Guard: advantage on Composure against supernatural fear.'],
    ['Occult & Religious Worker', 'Clergy', { social: 1, outlook: 1 }, 'Rite of Resistance: advantage resisting possession or spiritual manipulation. Steady Voice: nearby allies get advantage on one Composure check per combat. Ceremonial Training: proficiency with blunt melee weapons.'],
    ['Occult & Religious Worker', 'Gravekeeper', { outlook: 1, endurance: 1 }, 'Night Familiarity: reduced penalties from darkness. Corpse Handling: advantage on checks for cause of death. Unsettled Calm: advantage on Composure against fear.'],
    ['Medical Worker', 'Street Doctor', { wit: 1, endurance: 1 }, 'Improvised Tools: no disadvantage healing without proper equipment. Rapid Patch: once per combat, stabilize an ally as a bonus action. Sedative Knowledge: advantage on checks with toxins or anesthetics.'],
    ['Medical Worker', 'Asylum Orderly', { endurance: 1, wit: 1 }, 'Controlled Restraint: advantage on Force checks grappling unstable targets. Crisis Suppression: once per combat, as a reaction, remove fear from an ally. Sedation Handling: advantage resisting the sleep condition.'],
    ['Medical Worker', 'Field Nurse', { outlook: 1, wit: 1 }, 'Combat Treatment: when healing in combat, roll twice and take the higher. Calm Under Fire: no penalties from nearby combat while treating an ally. Medical Kit Familiarity: proficiency with medical equipment.'],
    ['Criminal Worker', 'Black Market Arms Dealer', { social: 1, reflex: 1 }, 'Weapon Familiarity: proficiency with one extra weapon category. Hidden Stock: from the first session, declare a common weapon or ammo type you have. Negotiation Edge: advantage on Persuasion in illicit deals.'],
    ['Criminal Worker', 'Safecracker', { reflex: 1, wit: 1 }, 'Lock Discipline: advantage on Sleight of Hand with locks. Quiet Entry: failed lock attempts don’t automatically make noise. Mechanical Study: advantage on Logic checks with security mechanisms.'],
    ['Criminal Worker', 'Saboteur', { reflex: 1, wit: 1 }, 'Structural Weakness: advantage on Logic checks finding machinery weaknesses. Timed Placement: thrown items don’t alert nearby enemies. Clean Escape: once per combat, Disengage free after damaging a structure.'],
    ['Coastal Worker', 'Dockworker', { power: 1, endurance: 1 }, 'Heavy Lift: advantage on Force checks with cargo. Secure Rigging: your knots and restraints take extra effort to escape. Storm Conditioned: advantage resisting wind or water instability.'],
    ['Coastal Worker', 'Ship Navigator', { outlook: 1, wit: 1 }, 'Dead Reckoning: advantage on Sense checks about direction. Sea Legs: reduced penalties fighting on unstable surfaces. Signal Familiarity: proficiency with fishing rods.'],
    ['Coastal Worker', 'Radio Operator', { wit: 1, reflex: 1 }, 'Signal Clarity: advantage on Logic checks with radio equipment. Extended Relay: longer range for standard communication devices. Emergency Broadcast: once per combat, allies ignore illusion penalties for one round.']
  ];
  const sheetKey = () => 'campaign-map.sheet:' + SITE_KEY;
  const loadSheet = () => cleanSheet(lsGet(sheetKey(), {}));
  function cleanSheet(s) {
    s = s && typeof s === 'object' ? s : {};
    const stats = {}, subs = {};
    PROWESS.forEach(([k, , list]) => {
      stats[k] = Math.min(STAT_MAX, Math.max(1, Math.round(num(s.stats && s.stats[k]) || 1)));
      list.forEach((n) => { subs[n] = Math.max(0, Math.min(10, Math.round(num(s.subs && s.subs[n]) || 0))); });
    });
    const t = (k) => str(s[k]).slice(0, 2000);
    return {
      player: t('player'), name: t('name'), background: BACKGROUNDS.some((b) => b[1] === s.background) ? s.background : '',
      affiliation: t('affiliation'), level: Math.max(1, Math.min(99, Math.round(num(s.level) || 1))), age: t('age'), height: t('height'), weight: t('weight'),
      traits: t('traits'), stats, subs,
      inventory: arr(s.inventory).filter(Boolean).slice(0, 300).map((i) => ({ id: str(i.id) || uid(), name: str(i.name).slice(0, 200), qty: str(i.qty).slice(0, 20), notes: str(i.notes).slice(0, 1000) }))
    };
  }
  // Abilities are given by the DM. Players get them over the relay and keep a copy on their device.
  const ABIL_KEY = () => 'campaign-map.abilities:' + SITE_KEY, DM_ABIL_KEY = () => 'campaign-map.dmAbilities:' + SITE_KEY;
  const KNOWN_KEY = () => 'campaign-map.knownPlayers:' + SITE_KEY;
  function cleanAbilities(a) {
    a = a && typeof a === 'object' ? a : {};
    return {
      passives: arr(a.passives).filter(Boolean).slice(0, 40).map((p) => ({ id: str(p.id) || uid(), name: str(p.name).slice(0, 60), desc: str(p.desc).slice(0, 1000) })),
      actives: arr(a.actives).filter(Boolean).slice(0, 40).map((p) => ({
        id: str(p.id) || uid(), name: str(p.name).slice(0, 60), desc: str(p.desc).slice(0, 1000),
        sides: DICE.includes(+p.sides) ? +p.sides : 0, count: Math.max(1, Math.min(20, Math.round(num(p.count) || 1))),
        mod: Math.max(-99, Math.min(99, Math.round(num(p.mod) || 0)))
      })),
      ts: num(a.ts) || 0
    };
  }
  const myAbilities = () => cleanAbilities(lsGet(ABIL_KEY(), {}));
  function onAbilityMessage(id, txt) {
    if (!txt) return;
    let a;
    try { a = cleanAbilities(JSON.parse(txt)); } catch (e) { return; }
    if (id === me.id) {
      if (a.ts < myAbilities().ts) return;
      lsSet(ABIL_KEY(), a);
      if (!$('#logbook').hidden && logTab === 'character') renderLog();
    }
    if (editing) {
      const all = lsGet(DM_ABIL_KEY(), {}) || {};
      if (!all[id] || (num(all[id].ts) || 0) <= a.ts) { all[id] = a; lsSet(DM_ABIL_KEY(), all); }
    }
  }
  function sendAbilities(playerId, a) {
    a.ts = Date.now();
    const all = lsGet(DM_ABIL_KEY(), {}) || {};
    all[playerId] = a;
    lsSet(DM_ABIL_KEY(), all);
    if (relay && relay.connected) relay.publish(`${ROOM}/abilities/${playerId}`, JSON.stringify(a), { retain: true });
    else toast('Can’t reach the live service, so this player gets the change once it reconnects and you save again.', 'warn', 7000);
  }
  function rememberPlayer(p) {
    if (!p || !p.id || p.id === (me && me.id)) return;
    const k = lsGet(KNOWN_KEY(), {}) || {};
    if (k[p.id] && k[p.id] === p.name) return;
    k[p.id] = p.name || 'Unnamed';
    lsSet(KNOWN_KEY(), k);
  }
  let sheetSaveTimer = null;
  function saveSheet(s) { clearTimeout(sheetSaveTimer); sheetSaveTimer = setTimeout(() => lsSet(sheetKey(), s), 250); }
  const bgOf = (s) => BACKGROUNDS.find((b) => b[1] === s.background);
  const statTotal = (s, k) => { const bg = bgOf(s); return Math.min(STAT_MAX, s.stats[k] + ((bg && bg[2][k]) || 0)); };
  const SUB_MAX = 10;
  const subCap = (n) => (n === 'Evasion' ? 9 : SUB_MAX); // Evasion stops at 9 so AC never passes 19
  // A sub-stat starts at its parent stat's bonus; level-up points raise it by 1 each, up to +10 (Evasion +9).
  const subValue = (s, k, n) => Math.min(subCap(n), statBonus(statTotal(s, k)) + (s.subs[n] || 0));
  const LEVEL_POINTS = 2; // sub-stat points per level after the first
  const levelPoints = (s) => (s.level - 1) * LEVEL_POINTS;
  const levelSpent = (s) => Object.values(s.subs).reduce((sum, v) => sum + Math.max(0, v || 0), 0);
  const STAT_INFO = {
    Power: 'Raw physical strength and the force behind your actions.',
    Reflex: 'Quickness, coordination and fine control of your body.',
    Outlook: 'Awareness of your surroundings, of people, and of danger.',
    Wit: 'Reasoning, memory and learned knowledge.',
    Endurance: 'Health, stamina and how much punishment you can take.',
    Social: 'Your presence: how you sway, scare and hold yourself with others.',
    Serendipity: 'Luck, and the knack for being in the right place at the right time.',
    Force: 'Raw physical power: lifting, pushing, grappling and breaking restraints.',
    Control: 'Resisting forced movement, knockdowns, grapples and being thrown off balance.',
    Impact: 'Adds to the damage of melee and strength-based attacks.',
    Speed: 'Turn order, reaction timing and movement speed in combat.',
    Performance: 'Balance, coordination and demanding physical actions under pressure.',
    'Sleight of Hand': 'Precise handiwork, concealment and delicate motor skills.',
    Sense: 'Perception, spotting things and general awareness.',
    Insight: 'Reading intent, motives, lies and body language.',
    Evasion: 'Avoiding attacks and physical threats. Adds to your AC (max 9).',
    Logic: 'Problem solving, technical work, analysis and complex reasoning.',
    Memory: 'Recalling learned information, details and things you saw.',
    History: 'Knowledge of lore, cultures, sciences and recorded events.',
    Vitality: 'Total health, stamina and resistance to exhaustion. Sets your max HP.',
    Recovery: 'How well you heal, resist toxins and shake off fatigue.',
    Tolerance: 'Injury thresholds, wound resistance and physical stress limits.',
    Intimidation: 'Coercion, fear and dominance through presence or threat.',
    Persuasion: 'Influence, negotiation and changing minds by talking.',
    Composure: 'Keeping your emotions in check under pressure and hiding reactions.',
    Luck: 'Shifts in probability, critical swings and rare lucky breaks.',
    Fortune: 'The quality of rewards, loot and useful finds.',
    Opportunity: 'Spotting and making the most of advantageous moments.'
  };
  const pointsUsed = (s) => PROWESS.reduce((sum, [k]) => sum + (s.stats[k] - 1), 0);
  // Sanity and hunger penalties for a check on stat `k` (or one of its sub-stats `sub`).
  function vitalsEffect(k, sub) {
    const v = myVitals(), san = tierOf(SANITY_TIERS, v.sanity), hun = tierOf(HUNGER_TIERS, v.hunger);
    let mod = 0, dis = false;
    const notes = [];
    const add = (n, why) => { mod += n; notes.push(`${fmtBonus(n)} ${why}`); };
    if (san.i === 1 && (sub === 'Composure' || sub === 'Sense')) add(-1, 'shaken');
    if (san.i === 2 && (k === 'social' || k === 'outlook')) add(-2, 'unraveling');
    if (san.i === 3) { dis = true; notes.push('disadvantage: broken'); }
    if (hun.i === 1 && (k === 'wit' || k === 'social')) add(-1, 'peckish');
    if (hun.i === 2) add(-2, 'hungry');
    if (hun.i === 3) { dis = true; notes.push('disadvantage: starving'); }
    return { mod, dis, notes };
  }
  // Roll d20 + bonus straight into the dice feed (with any sanity/hunger penalties for that stat).
  function rollCheck(label, bonus, k, sub) {
    if (isKicked()) { toast('You were removed from the session, so you can’t roll.', 'warn'); return; }
    const fx = k ? vitalsEffect(k, sub) : { mod: 0, dis: false, notes: [] };
    let adv = diceAdv;
    diceAdv = '';
    // Disadvantage from a condition cancels out advantage, as usual.
    if (fx.dis) adv = adv === 'adv' ? '' : 'dis';
    bonus += fx.mod;
    if (fx.notes.length) label += ' (' + fx.notes.join(', ') + ')';
    const { results, dropped } = rollSet(1, 20, adv);
    const r = results[0];
    const e = { id: uid(), byId: me.id, by: me.name || 'Someone', color: me.color, dm: editing, forName: '', forColor: '', sides: 20, count: 1, mod: bonus, results, total: r + bonus, ts: Date.now(), revealed: false, label, adv, dropped };
    mergeRolls([e]);
    publishRolls();
    if (!lsGet(DICE_OPEN_KEY, false)) lsSet(DICE_OPEN_KEY, true);
    renderDice(true);
    toast(`${label}: rolled ${r} ${fmtBonus(bonus)} = ${r + bonus}${r === 20 ? ' (critical success)' : r === 1 ? ' (critical failure)' : ''}`, r === 20 ? 'ok' : r === 1 ? 'error' : 'info', 5000);
  }
  function renderCharacter(body) {
    const s = loadSheet();
    if (!s.player && me && me.name) s.player = me.name;
    const rerender = () => { lsSet(sheetKey(), s); renderLog(); };
    const text = (key, label, opts) => field(label, textInput(s[key], (v) => { s[key] = v; saveSheet(s); }, opts || {}));
    const section = (title) => body.appendChild(el('div', 'cs-h', title));

    const idg = el('div', 'cs-grid');
    [['player', 'Player name'], ['name', 'Character name'], ['affiliation', 'Affiliation'], ['age', 'Age'], ['height', 'Height'], ['weight', 'Weight']].forEach(([k, l]) => idg.appendChild(text(k, l)));
    const lvl = el('input');
    lvl.type = 'number'; lvl.min = '1'; lvl.max = '99'; lvl.value = String(s.level);
    lvl.onchange = () => { s.level = Math.max(1, Math.min(99, Math.round(+lvl.value || 1))); rerender(); };
    idg.appendChild(field('Level', lvl));
    body.appendChild(idg);
    body.appendChild(text('traits', 'Description', { multiline: true, rows: 3 }));

    section('Background');
    const bsel = el('select', 'cs-select');
    bsel.add(new Option('Choose a background…', ''));
    [...new Set(BACKGROUNDS.map((b) => b[0]))].forEach((g) => {
      const og = document.createElement('optgroup');
      og.label = g;
      BACKGROUNDS.filter((b) => b[0] === g).forEach((b) => og.appendChild(new Option(b[1], b[1])));
      bsel.appendChild(og);
    });
    bsel.value = s.background;
    bsel.onchange = () => { s.background = bsel.value; rerender(); };
    body.appendChild(bsel);
    const bg = bgOf(s);
    if (bg) {
      const box = el('div', 'cs-bg');
      box.appendChild(el('div', 'cs-bg-adj', 'Stat adjustment: ' + Object.entries(bg[2]).map(([k, v]) => `+${v} ${PROWESS.find((p) => p[0] === k)[1]}`).join(', ')));
      bg[3].split(/(?<=\.)\s+(?=[A-Z][\w’' -]+:)/).forEach((f) => {
        const m = /^([^:]+):\s*(.*)$/.exec(f);
        const p = el('p');
        if (m) { p.appendChild(el('b', null, m[1] + '. ')); p.appendChild(document.createTextNode(m[2])); } else p.textContent = f;
        box.appendChild(p);
      });
      body.appendChild(box);
    }

    section('P.R.O.W.E.S.S');
    const left = STAT_POINTS - pointsUsed(s);
    const lvLeft = levelPoints(s) - levelSpent(s);
    // Remind the player when sanity or hunger are changing their rolls.
    { const vv = myVitals(), st = tierOf(SANITY_TIERS, vv.sanity), ht = tierOf(HUNGER_TIERS, vv.hunger), bits = [];
      if (st.i) bits.push(`Sanity: ${st.name} (${vv.sanity}%) – ${st.effect}`);
      if (ht.i) bits.push(`Hunger: ${ht.name} (${vv.hunger}%) – ${ht.effect}`);
      if (bits.length) { const w = el('div', 'cs-penalty'); bits.forEach((t) => w.appendChild(el('div', null, t))); w.appendChild(el('div', 'cs-penalty-hint', 'Your roll buttons already include these. ↓ means disadvantage.')); body.appendChild(w); } }
    if (left > 0) body.appendChild(el('div', 'cs-points', `${left} of ${STAT_POINTS} points left to spend · every stat starts at 1 · click a bonus to roll it`));
    else if (lvLeft > 0) body.appendChild(el('div', 'cs-points level', `${lvLeft}/${levelPoints(s)} level-up points left · put them into sub-stats`));
    PROWESS.forEach(([k, label, list]) => {
      const card = el('div', 'cs-stat');
      const top = el('div', 'cs-stat-top');
      const nameEl = el('b', 'cs-stat-name', label);
      nameEl.title = STAT_INFO[label];
      top.appendChild(nameEl);
      const step = el('div', 'cs-step');
      const adj = (bg && bg[2][k]) || 0;
      const total = statTotal(s, k);
      const minus = btn('−', 'small', () => { if (s.stats[k] > 1) { s.stats[k]--; rerender(); } });
      const plus = btn('+', 'small', () => { if (statTotal(s, k) < STAT_MAX && pointsUsed(s) < STAT_POINTS) { s.stats[k]++; rerender(); } });
      step.appendChild(minus);
      const val = el('span', 'cs-base', String(total));
      if (adj) { val.title = `Includes +${adj} from your background`; val.classList.add('has-bg'); }
      step.appendChild(val);
      step.appendChild(plus);
      top.appendChild(step);
      const sfx = vitalsEffect(k, null), sb = btn(fmtBonus(statBonus(total) + sfx.mod) + (sfx.dis ? ' ↓' : ''), 'small cs-roll' + (sfx.notes.length ? ' penalized' : ''), () => rollCheck(label + ' check', statBonus(total), k, null));
      if (sfx.notes.length) sb.title = 'Base ' + fmtBonus(statBonus(total)) + '; ' + sfx.notes.join(', ');
      top.appendChild(sb);
      card.appendChild(top);
      list.forEach((n) => {
        const row = el('div', 'cs-sub');
        const sn = el('span', 'cs-sub-name', n);
        sn.title = STAT_INFO[n];
        row.appendChild(sn);
        const st = el('div', 'cs-step');
        st.appendChild(btn('−', 'small', () => { if ((s.subs[n] || 0) > 0) { s.subs[n] = (s.subs[n] || 0) - 1; rerender(); } }));
        const extra = s.subs[n] || 0;
        st.appendChild(el('span', 'cs-extra', extra > 0 ? '+' + extra : '·'));
        st.appendChild(btn('+', 'small', () => {
          if (levelPoints(s) - levelSpent(s) <= 0) { toast(s.level > 1 ? 'No level-up points left.' : 'You get 2 sub-stat points each time you level up.', 'info', 3500); return; }
          if (subValue(s, k, n) < subCap(n)) { s.subs[n] = (s.subs[n] || 0) + 1; rerender(); }
        }));
        row.appendChild(st);
        const v = subValue(s, k, n);
        const fx = vitalsEffect(k, n), rb = btn(fmtBonus(v + fx.mod) + (fx.dis ? ' ↓' : ''), 'small cs-roll' + (fx.notes.length ? ' penalized' : ''), () => rollCheck(n + ' check', v, k, n));
        if (fx.notes.length) rb.title = 'Base ' + fmtBonus(v) + '; ' + fx.notes.join(', ');
        row.appendChild(rb);
        card.appendChild(row);
      });
      body.appendChild(card);
    });
    body.appendChild(el('p', 'cs-hint', `Sub-stats start at their stat’s bonus and go up to +${SUB_MAX} (Evasion +9). Each level after the first gives ${LEVEL_POINTS} points to put into sub-stats. Hover a stat for what it does.`));

    section('Combat profile');
    const vit = subValue(s, 'endurance', 'Vitality'), eva = subValue(s, 'outlook', 'Evasion'), spd = subValue(s, 'reflex', 'Speed');
    const combat = el('div', 'cs-combat');
    [['Max health', 10 + vit * s.level, `10 + Vitality (${fmtBonus(vit)}) × level ${s.level}`],
      ['Armor class', Math.min(19, 10 + eva), `10 + Evasion (${fmtBonus(eva)}), max 19`],
      ['Turn order (Speed)', spd, 'Higher Speed acts first']].forEach(([l, v, h]) => {
      const c = el('div', 'cs-cbox');
      c.appendChild(el('span', 'cs-clabel', l));
      c.appendChild(el('b', 'cs-cval', String(v)));
      c.appendChild(el('span', 'cs-chint', h));
      combat.appendChild(c);
    });
    body.appendChild(combat);

    section('Inventory');
    if (!s.inventory.length) body.appendChild(el('p', 'cs-hint', 'Nothing yet. Add weapons, armor, tools, ammo, keepsakes…'));
    s.inventory.forEach((it, idx) => {
      const row = el('div', 'cs-inv');
      const nm = textInput(it.name, (v) => { it.name = v; saveSheet(s); }, { placeholder: 'Item' });
      const qty = textInput(it.qty, (v) => { it.qty = v; saveSheet(s); }, { placeholder: 'Qty' });
      qty.className = 'cs-qty';
      const nt = textInput(it.notes, (v) => { it.notes = v; saveSheet(s); }, { placeholder: 'Notes (damage, condition…)' });
      nt.className = 'cs-inv-notes';
      row.appendChild(nm); row.appendChild(qty);
      row.appendChild(btn('×', 'small ghost cs-del', () => { s.inventory.splice(idx, 1); rerender(); }));
      row.appendChild(nt);
      body.appendChild(row);
    });
    body.appendChild(btn('+ Add item', 'small', () => { s.inventory.push({ id: uid(), name: '', qty: '1', notes: '' }); rerender(); }));

    const ab = myAbilities();
    section('Passives');
    ab.passives.forEach((p) => {
      const c = el('div', 'cs-ability');
      c.appendChild(el('b', null, p.name || 'Unnamed passive'));
      if (p.desc.trim()) { const d = el('div', 'cs-adesc'); d.innerHTML = richText(p.desc); c.appendChild(d); }
      body.appendChild(c);
    });
    section('Actives');
    ab.actives.forEach((p) => {
      const c = el('div', 'cs-ability');
      const top = el('div', 'cs-atop');
      top.appendChild(el('b', null, p.name || 'Unnamed active'));
      if (p.sides) {
        top.appendChild(el('span', 'cs-adice', diceLabel(p.count, p.sides, p.mod)));
        top.appendChild(btn('Load into dice', 'small cs-roll', () => loadIntoDice(p)));
      }
      c.appendChild(top);
      if (p.desc.trim()) { const d = el('div', 'cs-adesc'); d.innerHTML = richText(p.desc); c.appendChild(d); }
      body.appendChild(c);
    });
    const saveRow = el('div', 'cs-save');
    saveRow.appendChild(btn('Save character', 'primary', () => { clearTimeout(sheetSaveTimer); lsSet(sheetKey(), s); sendSheet(s, true); renderLog(); }));
    const sent = lsGet(SHEET_SENT_KEY(), null);
    saveRow.appendChild(el('span', 'meta', sent && sent.pending ? 'Saved here. Will reach your DM when you’re back online.'
      : sent && sent.ts ? 'Last sent to your DM ' + new Date(sent.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '.'
      : 'Saving sends a copy of your character to your DM.'));
    body.appendChild(saveRow);
    body.appendChild(el('p', 'meta', 'Your character sheet is kept in this browser on this device.'));
  }
  // ===== Sanity & hunger: each player's levels (0–100%), kept on the relay so the DM and player both see changes =====
  const SANITY_TIERS = [
    [76, 'Steady', 'No penalty.'],
    [51, 'Shaken', '−1 to Composure and Sense checks.'],
    [26, 'Unraveling', '−2 to all Social and Outlook checks. You may see things that aren’t there.'],
    [0, 'Broken', 'Disadvantage on all checks. At the start of each fight, make a DC 13 Composure check or lose your first turn.']
  ];
  const HUNGER_TIERS = [
    [76, 'Fed', 'No penalty.'],
    [51, 'Peckish', '−1 to Wit and Social checks.'],
    [26, 'Hungry', '−2 to all checks.'],
    [0, 'Starving', 'Disadvantage on all checks. Take 1d4 damage at the start of each day.']
  ];
  const TIER_COLORS = ['#4ade80', '#facc15', '#fb923c', '#ef4444'];
  const tierOf = (tiers, v) => { const i = tiers.findIndex(([min]) => v >= min); return { i, name: tiers[i][1], effect: tiers[i][2], color: TIER_COLORS[i] }; };
  const DAILY_FOOD = 15, NO_SLEEP = 10;
  const VITALS_KEY = () => 'campaign-map.vitals:' + SITE_KEY, DM_VITALS_KEY = () => 'campaign-map.dmVitals:' + SITE_KEY;
  const pct = (v) => Math.max(0, Math.min(100, Math.round(num(v) == null ? 100 : num(v))));
  const cleanVitals = (v) => ({ sanity: pct(v && v.sanity), hunger: pct(v && v.hunger), ts: num(v && v.ts) || 0 });
  const myVitals = () => cleanVitals(lsGet(VITALS_KEY(), {}));
  let vitalsHeard = false;
  function publishVitals(id, v) {
    v.ts = Date.now();
    if (id === me.id) lsSet(VITALS_KEY(), v);
    if (editing) { const all = lsGet(DM_VITALS_KEY(), {}) || {}; all[id] = v; lsSet(DM_VITALS_KEY(), all); }
    if (relay && relay.connected) relay.publish(`${ROOM}/vitals/${id}`, JSON.stringify(v), { retain: true });
  }
  function onVitalsMessage(id, txt) {
    if (!txt) return;
    let v;
    try { v = cleanVitals(JSON.parse(txt)); } catch (e) { return; }
    if (id === me.id) {
      vitalsHeard = true;
      if (v.ts >= myVitals().ts) { lsSet(VITALS_KEY(), v); if (!$('#logbook').hidden && logTab === 'vitals') renderLog(); }
    }
    if (editing) {
      const all = lsGet(DM_VITALS_KEY(), {}) || {};
      if (!all[id] || (num(all[id].ts) || 0) <= v.ts) { all[id] = v; lsSet(DM_VITALS_KEY(), all); }
      const typing = document.activeElement && document.activeElement.closest && document.activeElement.closest('.vit-table');
      if (currentView === 'characters' && !typing) showCharacters(selectedId);
    }
  }
  // A player who has never shared their levels does so once (after any saved ones from the DM have arrived).
  function shareVitalsOnce() {
    setTimeout(() => { if (!editing && !vitalsHeard && !myVitals().ts) publishVitals(me.id, myVitals()); }, 3000);
  }
  // A meter with its tier, effect and quick buttons. onSet(newValue) saves it.
  function vitalMeter(kind, value, onSet, compact) {
    const tiers = kind === 'sanity' ? SANITY_TIERS : HUNGER_TIERS, t = tierOf(tiers, value);
    const card = el('div', 'vit-card' + (compact ? ' compact' : ''));
    const top = el('div', 'vit-top');
    top.appendChild(el('b', 'vit-name', kind === 'sanity' ? 'Sanity' : 'Hunger'));
    const tag = el('span', 'vit-tier', t.name); tag.style.color = t.color; tag.style.borderColor = t.color;
    top.appendChild(tag);
    top.appendChild(el('span', 'vit-pct', value + '%'));
    card.appendChild(top);
    const bar = el('div', 'vit-bar'), fill = el('div', 'vit-fill');
    fill.style.width = value + '%'; fill.style.background = t.color;
    bar.appendChild(fill);
    card.appendChild(bar);
    if (!compact) card.appendChild(el('p', 'vit-effect', t.effect));
    const row = el('div', 'vit-btns');
    [-10, -5, 5, 10].forEach((d) => row.appendChild(btn((d > 0 ? '+' : '−') + Math.abs(d), 'small ghost', () => onSet(pct(value + d)))));
    const inp = el('input');
    inp.type = 'number'; inp.min = '0'; inp.max = '100'; inp.value = String(value); inp.title = 'Set exactly';
    inp.onchange = () => onSet(pct(inp.value));
    row.appendChild(inp);
    if (!compact) row.appendChild(kind === 'sanity'
      ? btn(`No sleep (−${NO_SLEEP}%)`, 'small', () => onSet(pct(value - NO_SLEEP)))
      : btn(`Missed a day of food (−${DAILY_FOOD}%)`, 'small', () => onSet(pct(value - DAILY_FOOD))));
    card.appendChild(row);
    return card;
  }
  function renderVitals(body) {
    const v = myVitals();
    const set = (k) => (nv) => { const cur = myVitals(); cur[k] = nv; publishVitals(me.id, cur); renderLog(); };
    body.appendChild(vitalMeter('sanity', v.sanity, set('sanity')));
    body.appendChild(vitalMeter('hunger', v.hunger, set('hunger')));
  }
  // The DM's table of everyone's levels (Characters tab).
  function vitalsTable() {
    const all = lsGet(DM_VITALS_KEY(), {}) || {};
    const names = Object.assign({}, lsGet(KNOWN_KEY(), {}) || {});
    const sheets = lsGet(DM_SHEETS_KEY(), {}) || {};
    Object.entries(sheets).forEach(([id, s]) => { names[id] = names[id] || s.by; });
    for (const p of party.values()) if (!p.dm) names[p.id] = p.name || names[p.id] || 'Unnamed';
    Object.keys(all).forEach((id) => { if (!names[id]) names[id] = 'Unknown player'; });
    delete names[me.id];
    const ids = Object.keys(names);
    const wrap = el('div', 'vit-table');
    wrap.appendChild(el('div', 'sub-h', 'Sanity & hunger'));
    if (!ids.length) { wrap.appendChild(el('p', 'muted', 'No players yet.')); return wrap; }
    ids.forEach((id) => {
      const v = cleanVitals(all[id]);
      const row = el('div', 'vit-player');
      row.appendChild(el('b', 'vit-pname', (sheets[id] && sheets[id].sheet.name) ? `${sheets[id].sheet.name} · ${names[id]}` : names[id]));
      const set = (k) => (nv) => { const cur = cleanVitals((lsGet(DM_VITALS_KEY(), {}) || {})[id]); cur[k] = nv; publishVitals(id, cur); showCharacters(selectedId); };
      row.appendChild(vitalMeter('sanity', v.sanity, set('sanity'), true));
      row.appendChild(vitalMeter('hunger', v.hunger, set('hunger'), true));
      wrap.appendChild(row);
    });
    const allRow = el('div', 'btn-row');
    const everyone = (k, d) => () => { ids.forEach((id) => { const cur = cleanVitals((lsGet(DM_VITALS_KEY(), {}) || {})[id]); cur[k] = pct(cur[k] - d); publishVitals(id, cur); }); showCharacters(selectedId); };
    allRow.appendChild(btn(`Everyone: no sleep (−${NO_SLEEP}% sanity)`, 'small', everyone('sanity', NO_SLEEP)));
    allRow.appendChild(btn(`Everyone: missed food (−${DAILY_FOOD}%)`, 'small', everyone('hunger', DAILY_FOOD)));
    wrap.appendChild(allRow);
    return wrap;
  }
  // A new in-game day: everyone gets hungrier.
  function dailyFood(days) {
    if (!editing || days <= 0) return;
    const all = lsGet(DM_VITALS_KEY(), {}) || {};
    const ids = new Set(Object.keys(all));
    Object.keys(lsGet(KNOWN_KEY(), {}) || {}).forEach((id) => ids.add(id));
    for (const p of party.values()) if (!p.dm) ids.add(p.id);
    ids.delete(me.id);
    ids.forEach((id) => { const cur = cleanVitals(all[id]); cur.hunger = pct(cur.hunger - DAILY_FOOD * days); publishVitals(id, cur); });
    if (ids.size) toast(`A new day: everyone’s food went down ${DAILY_FOOD * days}%.`, 'info', 5000);
    if (currentView === 'characters') showCharacters(selectedId);
  }

  // ===== Saved characters go to the DM (over the live relay, kept there until replaced) =====
  const SHEET_SENT_KEY = () => 'campaign-map.sheetSent:' + SITE_KEY, DM_SHEETS_KEY = () => 'campaign-map.dmSheets:' + SITE_KEY;
  function sendSheet(s, loud) {
    const msg = { id: me.id, by: me.name || '', ts: Date.now(), sheet: s };
    if (relay && relay.connected && !isKicked()) {
      relay.publish(`${ROOM}/sheet/${me.id}`, JSON.stringify(msg), { retain: true });
      lsSet(SHEET_SENT_KEY(), { ts: msg.ts });
      if (loud) toast('Character saved and sent to your DM.', 'ok', 3500);
    } else {
      lsSet(SHEET_SENT_KEY(), { ts: 0, pending: true });
      if (loud) toast('Character saved. It will be sent to your DM once you’re back online.', 'warn', 5000);
    }
  }
  function resendSheetIfPending() {
    const st = lsGet(SHEET_SENT_KEY(), null);
    if (st && st.pending) sendSheet(loadSheet(), false);
  }
  function onSheetMessage(id, txt) {
    if (!editing || !txt) return;
    let m;
    try { m = JSON.parse(txt); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const all = lsGet(DM_SHEETS_KEY(), {}) || {};
    const ts = num(m.ts) || 0;
    if (all[id] && (num(all[id].ts) || 0) >= ts) return;
    all[id] = { ts, by: cleanName(str(m.by)) || 'Unnamed', sheet: cleanSheet(m.sheet) };
    lsSet(DM_SHEETS_KEY(), all);
    if (Date.now() - ts < 60000) toast(all[id].by + ' saved their character.', 'info', 4000);
    if (currentView === 'characters') showCharacters(selectedId);
  }
  // Set the dice tray up for an active ability's attack; the player presses Roll.
  function loadIntoDice(p) {
    diceSides = p.sides; diceCount = p.count; diceMod = p.mod; diceNextLabel = p.name;
    lsSet(DICE_OPEN_KEY, true);
    renderDice(true);
    const m = $('#dice .dice-mod input');
    if (m) m.value = String(diceMod);
    toast(`${p.name} is loaded into the dice tray. Press Roll when ready.`, 'info', 4000);
  }

  // ===== Editor =====
  const PANEL_HTML = `
    <div class="ed-head"><div class="ed-title">Map editor</div><div class="ed-status" id="ed-status"></div></div>
    <div class="ed-actions"><button type="button" class="btn accent" id="ed-publish">Publish</button></div>
    <div class="ed-tabs"><button type="button" data-tab="list">Pins</button><button type="button" data-tab="regions">Regions</button><button type="button" data-tab="quests">Quests</button><button type="button" data-tab="fog">Fog</button><button type="button" data-tab="stickers">Stickers</button><button type="button" data-tab="ruler">Ruler</button><button type="button" data-tab="characters">Characters</button><button type="button" data-tab="monsters">Monsters</button><button type="button" data-tab="sounds">Sounds</button><button type="button" data-tab="settings">Settings</button></div>
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
    announce(); renderParty(); renderDice(); renderSoundCtl();
    if (relay && relay.connected) relay.subscribe([`${ROOM}/abilities/+`, `${ROOM}/sheet/+`, `${ROOM}/vitals/+`]);
    renderPartyToken(false);
    restorePartyPos(); restoreClock(); renderClock();
    applyTerrain();
  }

  function exitEdit() {
    const hadChanges = isDirty();
    cancelMode(true);
    stopRuler();
    editing = false;
    if (panel) panel.remove();
    panel = null;
    document.body.classList.remove('editing');
    data = clone(published);
    popup.remove();
    renderAll();
    map.resize();
    announce(); renderParty(); renderDice(); renderSoundCtl();
    renderPartyToken(false);
    clockOpen = false; renderClock();
    applyTerrain();
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
    if (currentView !== 'ruler' && ruler.active) stopRuler();
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
    else if (tab === 'ruler') showRuler();
    else if (tab === 'characters') showCharacters();
    else if (tab === 'monsters') showMonsters();
    else if (tab === 'sounds') showSounds();
    else if (tab === 'settings') showSettings();
    else showList();
  }
  function backToList() {
    popup.remove();
    if (currentView === 'quest') showQuests();
    else if (currentView === 'region') showRegions();
    else if (currentView === 'fogarea' || currentView === 'foglook') showFog();
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
    else if (currentView === 'sounds') showSounds();
    else if (currentView === 'characters') showCharacters(selectedId);
    else if (currentView === 'ruler') showRuler();
    else if (currentView === 'stickers' || currentView === 'sticker') showStickers();
    else if (currentView === 'foglook') showFogLook();
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
    else if (mode.type === 'party') { cancelMode(true); setPartyPos(Object.assign({}, partyPos, { lng: p[0], lat: p[1], shown: true })); showList(); }
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
    // The party token: players see it move live.
    const pt = el('div', 'party-token-box');
    pt.appendChild(el('b', null, 'Party token'));
    const placeIt = () => setMode({ type: 'party' }, 'Click the map where the party is · Esc to cancel');
    if (!partyPos) {
      pt.appendChild(el('span', 'tip', 'Show players where the party is. It moves live on everyone’s screen.'));
      pt.appendChild(btn('Place the party', 'small accent', placeIt));
    } else {
      pt.appendChild(el('span', 'tip', partyPos.shown ? 'Drag it on the map to move the party; players see it move live.' : 'Hidden from players.'));
      const r = el('div', 'btn-row');
      r.appendChild(btn('Move here…', 'small', placeIt));
      r.appendChild(btn('Find it', 'small ghost', () => map.easeTo({ center: [partyPos.lng, partyPos.lat], duration: 600 })));
      r.appendChild(btn(partyPos.shown ? 'Hide from players' : 'Show to players', 'small ghost', () => { setPartyPos(Object.assign({}, partyPos, { shown: !partyPos.shown })); showList(); }));
      pt.appendChild(r);
      const tr = el('div', 'party-travel');
      tr.appendChild(selectInput(Object.entries(TRAVEL).map(([k, v]) => [k, v.name]), partyTravel.mode, (v) => { partyTravel.mode = v; savePartyTravel(); }));
      tr.appendChild(selectInput(PACES.map(([n], i) => [String(i), n + ' pace']), String(partyTravel.pace), (v) => { partyTravel.pace = +v; savePartyTravel(); }));
      tr.title = 'How they travel when you move the token (used to move the clock)';
      pt.appendChild(tr);
      const st = el('div', 'party-status');
      PARTY_STATUS.forEach(([k, label]) => st.appendChild(btn(label, 'small st-' + k + (partyPos.status === k ? ' on' : ''), () => { setPartyPos(Object.assign({}, partyPos, { status: k })); showList(); })));
      pt.appendChild(st);
    }
    b.appendChild(pt);
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
    const tf = el('label', 'check');
    const tfc = el('input');
    tfc.type = 'checkbox'; tfc.checked = loc.throughFog;
    tfc.onchange = () => { loc.throughFog = tfc.checked; refresh(); };
    tf.appendChild(tfc);
    tf.appendChild(document.createTextNode(' Visible through fog (players see a faded, foggy pin they can’t open until you lift the fog)'));
    b.appendChild(tf);
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
    const af = el('div', 'field', 'Name angle');
    const arow = el('div', 'size-row');
    const ar = el('input');
    ar.type = 'range'; ar.min = '-90'; ar.max = '90'; ar.step = '1'; ar.value = String(Math.max(-90, Math.min(90, r.labelAngle || 0)));
    const aout = el('span', 'size-val', (r.labelAngle || 0) + '°');
    const setAngle = (v) => {
      r.labelAngle = v;
      ar.value = String(v);
      aout.textContent = v + '°';
      const mk = rlabels.get(r.id);
      if (mk) { mk.setRotation(v); mk.setRotationAlignment(v ? 'map' : 'viewport'); }
      fitRegionLabels();
      changed();
    };
    ar.oninput = () => setAngle(+ar.value);
    arow.appendChild(ar);
    arow.appendChild(aout);
    arow.appendChild(btn('Level', 'ghost small', () => setAngle(0)));
    af.appendChild(arow);
    b.appendChild(af);
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
    b.appendChild(btn('Fog look & movement…', 'small list-add', showFogLook));
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
  // How the fog looks and moves, for everyone.
  function showFogLook() {
    currentView = 'foglook'; selectedId = null; setTab(null); updateStatus(); popup.remove();
    const b = body(), st = data.fogStyle;
    b.appendChild(el('div', 'form-head')).appendChild(btn('← All fog', 'ghost small', showFog));
    const upd = () => { applyFogLook(); changed(); };
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
    b.appendChild(field('Style', selectInput(Object.entries(FOG_LOOKS).map(([k, L]) => [k, L.name]), st.look, (v) => { st.look = v; upd(); })));
    b.appendChild(slider('Light or dark', 0, 1, 0.05, st.darkness, (v) => (v < 0.35 ? 'Light' : v < 0.7 ? 'Medium' : 'Dark'), (v) => { st.darkness = v; upd(); }));
    b.appendChild(slider('Thickness (lower lets players faintly see the map underneath)', 0.7, 1, 0.01, st.thickness, (v) => Math.round(v * 100) + '%', (v) => { st.thickness = v; upd(); }));
    const tf = el('div', 'field', 'Colour');
    tf.appendChild(colorPicker(el('div', 'swatches'), st.tint, (c) => { st.tint = c; upd(); }, FOG_TINTS));
    b.appendChild(tf);
    b.appendChild(slider('Drift speed', 0, 10, 0.5, st.speed, (v) => (v === 0 ? 'Still' : String(v)), (v) => { st.speed = v; upd(); }));
    b.appendChild(field('Drifts toward', selectInput(FOG_DIRS.map(([d, n]) => [String(d), n]), String(FOG_DIRS.some(([d]) => d === st.dir) ? st.dir : 0), (v) => { st.dir = +v; upd(); })));
    const pl = el('label', 'check');
    const pc = el('input');
    pc.type = 'checkbox'; pc.checked = st.pulse;
    pc.onchange = () => { st.pulse = pc.checked; upd(); };
    pl.appendChild(pc);
    pl.appendChild(document.createTextNode(' Breathing (the wisps slowly thicken and thin)'));
    b.appendChild(pl);
    const row = el('div', 'btn-row');
    row.style.marginTop = '12px';
    row.appendChild(btn('Shuffle the pattern', 'small', () => { st.seed = 1 + Math.floor(Math.random() * 99998); upd(); }));
    row.appendChild(btn('Reset to default', 'small ghost', () => { Object.assign(st, FOG_DEFAULT); upd(); showFogLook(); }));
    b.appendChild(row);
    b.appendChild(el('p', 'tip', 'You see the fog see-through while editing, but the movement, colour and style are what players get. Press Publish so they see the change.'));
    b.appendChild(btn('Done', 'primary', showFog));
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

  // --- Player abilities (DM gives each player passives and actives) ---
  let abilSendTimer = null;
  function showAbilityEditor(playerId) {
    if (!editing) return;
    currentView = 'abilities'; selectedId = playerId; setTab(null); updateStatus(); popup.remove();
    const known = Object.assign({}, lsGet(KNOWN_KEY(), {}) || {});
    for (const p of party.values()) if (!p.dm) known[p.id] = p.name || known[p.id] || 'Unnamed';
    const b = body();
    b.appendChild(el('div', 'form-head')).appendChild(btn('← Back', 'ghost small', showList));
    const ids = Object.keys(known);
    if (!ids.length) { b.appendChild(el('p', 'muted', 'No players have joined yet. Once someone opens the map, you can give them abilities here.')); return; }
    if (!playerId || !known[playerId]) playerId = ids[0];
    const sel = selectInput(ids.map((id) => [id, known[id] + (party.has(id) ? ' (online)' : '')]), playerId, (v) => showAbilityEditor(v));
    b.appendChild(field('Player', sel));
    const all = lsGet(DM_ABIL_KEY(), {}) || {};
    const a = cleanAbilities(all[playerId]);
    const status = el('p', 'tip', 'Changes are sent to this player’s character sheet automatically.');
    const send = () => { clearTimeout(abilSendTimer); status.textContent = 'Sending…'; abilSendTimer = setTimeout(() => { sendAbilities(playerId, a); status.textContent = 'Sent to ' + known[playerId] + '.'; }, 600); };
    b.appendChild(status);
    const list = (title, arrKey, isActive) => {
      b.appendChild(el('div', 'sub-h', title));
      a[arrKey].forEach((item, idx) => {
        const card = el('div', 'card-edit');
        card.style.paddingTop = '10px';
        card.appendChild(field('Name', textInput(item.name, (v) => { item.name = v; send(); })));
        card.appendChild(field('Description', textInput(item.desc, (v) => { item.desc = v; send(); }, { multiline: true, rows: 3 })));
        if (isActive) {
          const r = el('div', 'row3');
          const cnt = el('input'); cnt.type = 'number'; cnt.min = '1'; cnt.max = '20'; cnt.value = String(item.count);
          cnt.oninput = () => { item.count = Math.max(1, Math.min(20, Math.round(+cnt.value || 1))); send(); };
          r.appendChild(field('Dice', cnt));
          r.appendChild(field('Die', selectInput([['0', 'No roll'], ...DICE.map((n) => [String(n), 'd' + n])], String(item.sides), (v) => { item.sides = +v; send(); })));
          const md = el('input'); md.type = 'number'; md.min = '-99'; md.max = '99'; md.value = String(item.mod);
          md.oninput = () => { item.mod = Math.max(-99, Math.min(99, Math.round(+md.value || 0))); send(); };
          r.appendChild(field('Modifier', md));
          card.appendChild(r);
        }
        card.appendChild(btn('Remove', 'small danger', () => { a[arrKey].splice(idx, 1); sendAbilities(playerId, a); showAbilityEditor(playerId); }));
        b.appendChild(card);
      });
      b.appendChild(btn(isActive ? '+ Add active' : '+ Add passive', 'small', () => {
        a[arrKey].push(isActive ? { id: uid(), name: '', desc: '', sides: 0, count: 1, mod: 0 } : { id: uid(), name: '', desc: '' });
        sendAbilities(playerId, a);
        showAbilityEditor(playerId);
      }));
    };
    list('Passives', 'passives', false);
    list('Actives (attacks can carry dice the player loads into the roller)', 'actives', true);
  }

  // ===== Party token: the DM moves it, everyone sees it move live (over the relay, no refresh) =====
  const PARTY_POS_KEY = () => 'campaign-map.partyPos:' + SITE_KEY;
  // How beat up the party is: the token's colour.
  const PARTY_STATUS = [['good', 'Healthy'], ['hurt', 'Battered'], ['bad', 'In bad shape']];
  let partyPos = null, partyMarker = null, partyDragging = false, partyAnim = 0, partySendTimer = null, partyDragFrom = null;
  // How the party is travelling when the DM moves the token (sets how much the clock moves).
  const PARTY_TRAVEL_KEY = 'campaign-map.partyTravel';
  const partyTravel = (() => { const p = lsGet(PARTY_TRAVEL_KEY, {}) || {}; return { mode: TRAVEL[p.mode] ? p.mode : 'foot', pace: [0, 1, 2].includes(p.pace) ? p.pace : 0, advance: p.advance !== false }; })();
  const savePartyTravel = () => lsSet(PARTY_TRAVEL_KEY, partyTravel);
  function cleanPartyPos(p) {
    if (!p || typeof p !== 'object' || num(p.lng) == null || num(p.lat) == null) return null;
    return { lng: num(p.lng), lat: num(p.lat), shown: p.shown !== false, status: PARTY_STATUS.some(([k]) => k === p.status) ? p.status : 'good', ts: num(p.ts) || 0 };
  }
  // If the relay lost the party's spot, the DM's device puts it back.
  function restorePartyPos() {
    setTimeout(() => {
      if (!editing || partyPos) return;
      const saved = cleanPartyPos(lsGet(PARTY_POS_KEY(), null));
      if (saved) { partyPos = saved; sendPartyPos(); renderPartyToken(false); if (currentView === 'list') showList(); }
    }, 2500);
  }
  function sendPartyPos() {
    if (!editing || !partyPos) return;
    lsSet(PARTY_POS_KEY(), partyPos);
    if (relay && relay.connected) relay.publish(`${ROOM}/partypos`, JSON.stringify(partyPos), { retain: true });
  }
  function setPartyPos(p, from) {
    const prev = from || (partyPos && [partyPos.lng, partyPos.lat]);
    partyPos = Object.assign(cleanPartyPos(p) || {}, { ts: Date.now() });
    if (prev && editing) travelClock(prev, [partyPos.lng, partyPos.lat]);
    sendPartyPos();
    renderPartyToken(false);
  }
  function onPartyPosMessage(txt) {
    const p = txt ? cleanPartyPos(JSON.parse(txt)) : null;
    if (editing && partyDragging) return;
    if (p && partyPos && p.ts && p.ts < partyPos.ts) return;
    partyPos = p;
    renderPartyToken(true);
    if (editing && currentView === 'list') showList();
  }
  function renderPartyToken(animate) {
    if (!map) return;
    const visible = partyPos && (partyPos.shown || editing);
    if (!visible) { if (partyMarker) { partyMarker.remove(); partyMarker = null; } return; }
    if (!partyMarker) {
      const elx = el('div', 'party-token');
      elx.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v1.1A5 5 0 0 1 17 9v7l1.6 2.2A1 1 0 0 1 17.8 20H6.2a1 1 0 0 1-.8-1.8L7 16V9a5 5 0 0 1 4-4.9V3a1 1 0 0 1 1-1zm0 6.2c-.9 1.2-2 2.4-2 3.8a2 2 0 0 0 4 0c0-1.4-1.1-2.6-2-3.8zM9.5 21h5a2.5 2.5 0 0 1-5 0z"/></svg>';
      elx.title = 'The party';
      partyMarker = new maplibregl.Marker({ element: elx, anchor: 'center' }).setLngLat([partyPos.lng, partyPos.lat]).addTo(map);
      partyMarker.on('dragstart', () => { partyDragging = true; partyDragFrom = partyPos ? [partyPos.lng, partyPos.lat] : null; });
      partyMarker.on('drag', () => {
        const ll = partyMarker.getLngLat();
        partyPos = Object.assign({}, partyPos, { lng: round6(ll.lng), lat: round6(ll.lat), ts: Date.now() });
        if (!partySendTimer) partySendTimer = setTimeout(() => { partySendTimer = null; sendPartyPos(); }, 150); // live while dragging
      });
      partyMarker.on('dragend', () => {
        partyDragging = false;
        const ll = partyMarker.getLngLat();
        setPartyPos(Object.assign({}, partyPos, { lng: round6(ll.lng), lat: round6(ll.lat) }), partyDragFrom);
        partyDragFrom = null;
      });
      animate = false;
    }
    partyMarker.setDraggable(!!editing);
    const pe = partyMarker.getElement();
    pe.classList.toggle('hidden-from-players', !partyPos.shown);
    PARTY_STATUS.forEach(([k]) => pe.classList.toggle('st-' + k, partyPos.status === k));
    pe.title = 'The party · ' + PARTY_STATUS.find(([k]) => k === partyPos.status)[1];
    const to = [partyPos.lng, partyPos.lat];
    cancelAnimationFrame(partyAnim);
    if (!animate) { partyMarker.setLngLat(to); return; }
    // Glide to the new spot.
    const from = partyMarker.getLngLat().toArray(), t0 = performance.now(), dur = 700;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      partyMarker.setLngLat([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
      if (k < 1) partyAnim = requestAnimationFrame(step);
    };
    partyAnim = requestAnimationFrame(step);
  }

  // ===== In-game clock: the DM sets it, moving the party advances it, the map darkens at night =====
  // Time is counted in minutes since 8:00 AM on Day 1; each day runs 8 AM to 8 AM. Only the DM sees the clock;
  // players just see the map's lighting change.
  const CLOCK_KEY = () => 'campaign-map.clock:' + SITE_KEY;
  const DAY_START = 480; // 8:00 AM
  let clock = null, clockOpen = false;
  // Clocks saved before the day moved to 8 AM counted from 6 AM: shift them so the time of day stays the same.
  const cleanClock = (c) => (c && typeof c === 'object' && num(c.abs) != null
    ? { abs: Math.max(0, Math.round(num(c.abs)) - (num(c.start) === DAY_START ? 0 : DAY_START - 360)), start: DAY_START, ts: num(c.ts) || 0 } : null);
  const clockDay = (abs) => Math.floor(abs / 1440) + 1;
  const clockTod = (abs) => (DAY_START + abs) % 1440; // minutes after midnight
  const isNight = (tod) => tod >= 20 * 60 || tod < 6 * 60;
  function fmtClock(tod) {
    const h = Math.floor(tod / 60), m = tod % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function dayPhase(tod) {
    const h = tod / 60;
    return h < 4 ? 'Dead of night' : h < 6 ? 'Before dawn' : h < 8 ? 'Dawn' : h < 12 ? 'Morning' : h < 14 ? 'Midday' : h < 18 ? 'Afternoon' : h < 20 ? 'Dusk' : 'Night';
  }
  function setClock(abs, note) {
    const before = clock;
    clock = { abs: Math.max(0, Math.round(abs)), start: DAY_START, ts: Date.now() };
    if (before) dailyFood(clockDay(clock.abs) - clockDay(before.abs)); // each new day costs food
    lsSet(CLOCK_KEY(), clock);
    if (relay && relay.connected) relay.publish(`${ROOM}/clock`, JSON.stringify(clock), { retain: true });
    renderClock();
    if (note) toast(note, 'info', 4500);
  }
  function onClockMessage(txt) {
    let c = null;
    try { c = txt ? cleanClock(JSON.parse(txt)) : null; } catch (e) { return; }
    if (c && clock && c.ts && c.ts < clock.ts) return;
    clock = c;
    renderClock();
  }
  function restoreClock() {
    setTimeout(() => {
      if (!editing || clock) return;
      const saved = cleanClock(lsGet(CLOCK_KEY(), null));
      if (saved) setClock(saved.abs);
    }, 2500);
  }
  // Travel time for a move, walking the clock forward: travel at night goes at half speed.
  function travelClock(fromLL, toLL) {
    if (!clock || !partyTravel.advance) return;
    const real = realMiles(fromLL, toLL);
    if (real < 0.01) return;
    // Rough ground on the way (swamp, woods, sand) slows them on foot.
    const prof = terrainProfile(terrainSamples([fromLL, toLL]), partyTravel.mode), tnote = terrainNote(prof, partyTravel.mode);
    const t = Object.assign(routeTime(prof.eff, partyTravel.mode, partyTravel.pace), { travelMi: real * data.travel.scale });
    let left = t.hours, abs = clock.abs, guard = 0;
    while (left > 1e-6 && guard++ < 60 * 24 * 6) { // 10-minute steps, at most 60 days
      const step = isNight(clockTod(abs)) ? 1 / 12 : 1 / 6;
      left -= step; abs += 10;
    }
    const spent = abs - clock.abs;
    setClock(abs, `${TRAVEL[partyTravel.mode].name}, ${PACES[partyTravel.pace][0].toLowerCase()}: ${fmtMi(t.travelMi)} miles took ${fmtDuration(spent / 60, 24)}. It’s now ${fmtClock(clockTod(abs))}, Day ${clockDay(abs)}.${tnote ? ' ' + tnote : ''}`);
  }
  // How the map looks at each hour: [hour, colour, opacity] (a dark wash at night, warm at dawn and dusk).
  const DAYLIGHT = [[0, '#02051a', .55], [4.5, '#02051a', .55], [6, '#ff8f4d', .16], [7.5, '#fff1d6', .05], [16.5, '#fff1d6', .05], [18.5, '#ff6a3d', .16], [20, '#0a0f30', .42], [24, '#02051a', .55]];
  function daylightAt(tod) {
    const h = tod / 60;
    let i = 0;
    while (i < DAYLIGHT.length - 2 && h >= DAYLIGHT[i + 1][0]) i++;
    const [h0, c0, o0] = DAYLIGHT[i], [h1, c1, o1] = DAYLIGHT[i + 1], f = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
    const a = hexRgb(c0), b = hexRgb(c1);
    return { color: `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`, opacity: o0 + (o1 - o0) * f };
  }
  function applyDaylight() {
    if (!styleReady || !map.getLayer('daylight')) return;
    const d = clock ? daylightAt(clockTod(clock.abs)) : { color: '#000', opacity: 0 };
    try { map.setPaintProperty('daylight', 'fill-color', d.color); map.setPaintProperty('daylight', 'fill-opacity', d.opacity); } catch (e) { /* busy */ }
  }
  function renderClock() {
    applyDaylight();
    let box = $('#clock');
    if (!box && map) { box = el('div'); box.id = 'clock'; document.body.appendChild(box); }
    if (!box) return;
    box.innerHTML = '';
    if (!editing) { box.hidden = true; return; } // players never see the time
    box.hidden = false;
    const face = el('button', 'clock-face');
    face.type = 'button';
    if (clock) {
      const tod = clockTod(clock.abs);
      face.appendChild(el('span', 'clock-day', 'Day ' + clockDay(clock.abs)));
      face.appendChild(el('b', 'clock-time', fmtClock(tod)));
      face.appendChild(el('span', 'clock-phase', dayPhase(tod)));
      box.classList.toggle('night', isNight(tod));
    } else face.appendChild(el('span', 'clock-phase', 'Start the clock'));
    if (editing) face.onclick = () => { clockOpen = !clockOpen; renderClock(); };
    else face.disabled = true;
    box.appendChild(face);
    if (editing && clockOpen) box.appendChild(clockPanel());
    placeSoundCtl();
  }
  function clockPanel() {
    const p = el('div', 'clock-panel');
    const cur = clock || { abs: 0 };
    const dayIn = el('input'); dayIn.type = 'number'; dayIn.min = '1'; dayIn.max = '9999'; dayIn.value = String(clockDay(cur.abs));
    const timeIn = el('input'); timeIn.type = 'time'; timeIn.step = '300';
    const tod = clockTod(cur.abs); timeIn.value = String(Math.floor(tod / 60)).padStart(2, '0') + ':' + String(tod % 60).padStart(2, '0');
    const row = el('div', 'clock-row');
    row.appendChild(field('Day', dayIn)); row.appendChild(field('Time', timeIn));
    p.appendChild(row);
    p.appendChild(el('p', 'tip', 'Each day starts at 8:00 AM, so 2:00 AM belongs to the night at the end of that day. Players don’t see the clock, only the light changing.'));
    p.appendChild(btn(clock ? 'Set time' : 'Start the clock', 'small primary', () => {
      const [h, m] = (timeIn.value || '08:00').split(':').map((v) => +v || 0);
      const d = Math.max(1, Math.round(+dayIn.value || 1));
      setClock((d - 1) * 1440 + (((h * 60 + m) - DAY_START + 1440) % 1440));
    }));
    if (clock) {
      const q = el('div', 'btn-row');
      q.appendChild(btn('+1 hour', 'small', () => setClock(clock.abs + 60)));
      q.appendChild(btn('+4 hours', 'small', () => setClock(clock.abs + 240)));
      q.appendChild(btn('−1 hour', 'small ghost', () => setClock(clock.abs - 60)));
      p.appendChild(q);
      p.appendChild(btn('Skip to 8:00 AM (next day)', 'small accent', () => setClock((Math.floor(clock.abs / 1440) + 1) * 1440)));
      const al = el('label', 'check');
      const ac = el('input'); ac.type = 'checkbox'; ac.checked = partyTravel.advance;
      ac.onchange = () => { partyTravel.advance = ac.checked; savePartyTravel(); };
      al.appendChild(ac); al.appendChild(document.createTextNode(' Moving the party moves the clock'));
      p.appendChild(al);
    }
    return p;
  }

  // --- Terrain view (DM only): colour the map by swamp, woods, fields, town… ---
  let terrainOn = !!lsGet(TERRAIN_KEY, false);
  // Terrain types you've switched off in the legend (they still count for travel times).
  const TERRAIN_HIDDEN_KEY = 'campaign-map.terrainHidden';
  const terrainHidden = new Set(arr(lsGet(TERRAIN_HIDDEN_KEY, [])));
  function applyTerrain() {
    const on = editing && terrainOn;
    // While you edit, the terrain layers stay on the map (invisible when the view is off) so travel can read them.
    if (styleReady) TERRAIN.forEach(([id]) => {
      try {
        map.setLayoutProperty('terrain-' + id, 'visibility', editing ? 'visible' : 'none');
        const show = on && !terrainHidden.has(id);
        map.setPaintProperty('terrain-' + id, 'fill-opacity', show ? (id === 'water' ? 0.35 : 0.5) : 0);
        if (id !== 'water') map.setPaintProperty('terrain-' + id, 'fill-outline-color', show ? TERRAIN.find((x) => x[0] === id)[2] : 'rgba(0,0,0,0)');
      } catch (e) { /* not ready */ }
    });
    let lg = $('#terrain-legend');
    if (!on) { if (lg) lg.remove(); return; }
    if (!lg) { lg = el('div'); lg.id = 'terrain-legend'; map.getContainer().appendChild(lg); }
    lg.innerHTML = '';
    const head = el('div', 'tl-head');
    head.appendChild(el('b', null, 'Terrain'));
    head.appendChild(el('span', 'tl-sub', 'Only you see this · click to hide or show'));
    const x = btn('×', 'small ghost tl-close', () => setTerrain(false));
    x.title = 'Hide terrain';
    head.appendChild(x);
    lg.appendChild(head);
    TERRAIN.forEach(([id, name, color, , note]) => {
      const r = el('button', 'tl-row' + (terrainHidden.has(id) ? ' off' : ''));
      r.type = 'button';
      r.title = terrainHidden.has(id) ? 'Click to show' : 'Click to hide';
      r.setAttribute('aria-pressed', String(!terrainHidden.has(id)));
      r.onclick = () => { if (terrainHidden.has(id)) terrainHidden.delete(id); else terrainHidden.add(id); lsSet(TERRAIN_HIDDEN_KEY, [...terrainHidden]); applyTerrain(); };
      const sw = el('span', 'tl-sw'); sw.style.background = color; sw.style.borderColor = color;
      r.appendChild(sw);
      const txt = el('div');
      txt.appendChild(el('div', 'tl-name', name));
      txt.appendChild(el('div', 'tl-note', note));
      r.appendChild(txt);
      lg.appendChild(r);
    });
  }
  // Rough ground slows the party on foot: [terrain id] = speed (1 = normal). Roads through it count as normal.
  const TERRAIN_SPEED = { swamp: 0.5, woods: 0.5, sand: 0.75 };
  const ROAD_IDS = ['roads-minor', 'roads-major', 'roads-main', 'roads-highway'];
  function terrainAt(ll) {
    const p = map.project(ll), c = map.getCanvas();
    if (p.x < 0 || p.y < 0 || p.x > c.clientWidth || p.y > c.clientHeight) return null; // off screen: unknown
    if (map.queryRenderedFeatures([[p.x - 3, p.y - 3], [p.x + 3, p.y + 3]], { layers: ROAD_IDS }).length) return 'road';
    const f = map.queryRenderedFeatures(p, { layers: TERRAIN.map(([id]) => 'terrain-' + id) });
    return f.length ? f[0].layer.id.slice(8) : 'open';
  }
  // Walk a route and add up how much of it crosses each kind of ground.
  // Returns the "effective" distance (rough ground counts extra on foot) and what slowed them.
  // Sample the ground along one leg: [[kind, miles, from, to], …] (kind is null where it's off screen).
  // Finished legs are remembered, so the ruler only re-checks the leg that follows the mouse.
  const legCache = new Map();
  function legSamples(a, b, max, keep) {
    const key = a.join() + '|' + b.join() + '|' + max;
    if (keep && legCache.has(key)) return legCache.get(key);
    const seg = realMiles(a, b), out = [];
    const ready = editing && styleReady && map.getLayer('terrain-swamp');
    const n = ready ? Math.max(1, Math.min(max, Math.round(seg / 0.03))) : 1;
    for (let j = 0; j < n; j++) {
      const f0 = j / n, f1 = (j + 1) / n, fm = (j + 0.5) / n;
      const p = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      out.push([ready ? terrainAt(p(fm)) : null, seg / n, p(f0), p(f1)]);
    }
    if (keep && ready) { if (legCache.size > 200) legCache.clear(); legCache.set(key, out); }
    return out;
  }
  // Terrain is read from what's on screen, so look again after the map moves.
  function clearLegCache() { legCache.clear(); rulerMemo = null; }
  function terrainSamples(pts) {
    const samples = [];
    for (let i = 1; i < pts.length; i++) samples.push(...legSamples(pts[i - 1], pts[i], 160, false));
    return { real: routeMiles(pts), samples };
  }
  // The ruler's route: finished legs in detail (cached), the leg following the mouse more roughly.
  let rulerMemo = null;
  function rulerSamples(pts) {
    const key = ruler.mode + '|' + pts.map((p) => p.join()).join(';');
    if (rulerMemo && rulerMemo.key === key) return rulerMemo.rs;
    const samples = [], hoverLeg = ruler.hover && pts.length === ruler.points.length + 1;
    for (let i = 1; i < pts.length; i++) {
      const last = i === pts.length - 1 && hoverLeg;
      samples.push(...legSamples(pts[i - 1], pts[i], last ? 30 : 100, !last));
    }
    const rs = { real: routeMiles(pts), samples };
    rulerMemo = { key, rs };
    return rs;
  }
  function terrainProfile(ts, modeKey) {
    const out = { real: ts.real, eff: 0, by: {}, offroad: 0 };
    ts.samples.forEach(([kind, len]) => {
      if (kind) out.by[kind] = (out.by[kind] || 0) + len;
      out.eff += len / (modeKey === 'foot' ? (TERRAIN_SPEED[kind] || 1) : 1);
      if (modeKey === 'car' && (kind === 'swamp' || kind === 'woods')) out.offroad += len;
    });
    return out;
  }
  // A short note on what the ground did to the trip.
  function terrainNote(prof, modeKey) {
    const scale = data.travel.scale, mi = (k) => fmtMi((prof.by[k] || 0) * scale), bits = [];
    if (modeKey === 'foot') {
      ['swamp', 'woods', 'sand'].forEach((k) => { if ((prof.by[k] || 0) * scale >= 0.1) bits.push(`${mi(k)} mi of ${k === 'swamp' ? 'swamp' : k === 'woods' ? 'woods' : 'sand'}`); });
      if (bits.length) return `Rough ground: ${bits.join(', ')} (${['swamp', 'woods'].some((k) => prof.by[k]) ? 'half speed' : 'slower'} there; roads through it don’t count).`;
    }
    if (modeKey === 'car' && prof.offroad * scale >= 0.1) return `${fmtMi(prof.offroad * scale)} mi of this runs off-road through swamp or woods: a car can’t go there.`;
    return '';
  }
  function setTerrain(on) {
    terrainOn = on;
    lsSet(TERRAIN_KEY, on);
    applyTerrain();
    if (currentView === 'ruler') showRuler();
  }

  // --- Ruler: measure a route and see how long the party takes ---
  const ruler = { active: false, points: [], hover: null, mode: 'foot', pace: 0, labels: [] };
  const RULER_PREF = 'campaign-map.ruler';
  Object.assign(ruler, (() => { const p = lsGet(RULER_PREF, {}) || {}; return { mode: TRAVEL[p.mode] ? p.mode : 'foot', pace: [0, 1, 2].includes(p.pace) ? p.pace : 0 }; })());
  const realMiles = (a, b) => {
    const R = 3958.8, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const routeMiles = (pts) => pts.slice(1).reduce((s, p, i) => s + realMiles(pts[i], p), 0);
  const fmtMi = (m) => (m < 10 ? m.toFixed(1) : String(Math.round(m)));
  function fmtDuration(hours, dayHours) {
    const days = Math.floor(hours / dayHours + 1e-9), rest = hours - days * dayHours;
    const h = Math.round(rest * 2) / 2;
    const parts = [];
    if (days) parts.push(days + (days === 1 ? ' day' : ' days'));
    if (h || !days) parts.push((h || '<1') + (h === 1 ? ' hour' : ' hours'));
    return parts.join(' and ');
  }
  // How long a route takes: travel hours, with each day being `dayHours` of moving.
  function routeTime(real, modeKey, pace) {
    const scale = data.travel.scale, travelMi = real * scale;
    const perDay = TRAVEL[modeKey].miles[pace], dayHours = PACES[pace][1], perHour = perDay / dayHours;
    const hours = travelMi / perHour;
    return { travelMi, perDay, dayHours, perHour, hours, days: hours / dayHours };
  }
  function startRuler() {
    ruler.active = true;
    if (map) map.doubleClickZoom.disable();
    document.body.classList.add('measuring');
    drawRuler();
  }
  function stopRuler() {
    if (!ruler.active) return;
    ruler.active = false; ruler.points = []; ruler.hover = null;
    if (map) map.doubleClickZoom.enable();
    document.body.classList.remove('measuring');
    drawRuler();
  }
  function rulerClick(ll) {
    const p = [round6(ll.lng), round6(ll.lat)], last = ruler.points[ruler.points.length - 1];
    if (last) { const a = map.project(last), b = map.project(p); if (Math.hypot(a.x - b.x, a.y - b.y) < 4) return; }
    ruler.points.push(p);
    drawRuler();
    showRuler();
  }
  // The route follows the mouse to preview the next leg (redrawn at most once per frame).
  let rulerQueued = false;
  function rulerHover(e) {
    if (!ruler.active || !ruler.points.length) return;
    ruler.hover = [e.lngLat.lng, e.lngLat.lat];
    if (rulerQueued) return;
    rulerQueued = true;
    requestAnimationFrame(() => { rulerQueued = false; if (!ruler.active) return; drawRuler(); updateRulerReadout(); });
  }
  // Draw the route, a dot every 4 hours of travel and a big dot (with a label) at the end of each day.
  function drawRuler() {
    if (!styleReady || !map.getSource('ruler')) return;
    const labelAt = []; // [lngLat, day number]
    const pts = ruler.active ? ruler.points.concat(ruler.hover && ruler.points.length ? [ruler.hover] : []) : [];
    const feats = ruler.points.map((p) => ({ type: 'Feature', properties: { k: 'pt' }, geometry: { type: 'Point', coordinates: p } }));
    if (pts.length >= 2) {
      feats.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } });
      // Marks every 4 hours of travel and at the end of each day, spaced by time, not distance:
      // through swamp or woods on foot they bunch up, because the party covers less ground per hour.
      const t = routeTime(1, ruler.mode, ruler.pace), scale = data.travel.scale;
      const blockEff = (t.perHour * 4) / scale, dayEff = t.perDay / scale;
      const rs = rulerSamples(pts);
      const speedOf = (kind) => (ruler.mode === 'foot' ? (TERRAIN_SPEED[kind] || 1) : 1);
      const totalEff = rs.samples.reduce((s, [kind, len]) => s + len / speedOf(kind), 0);
      // Every mark along the way, in order of "effective" distance (a day end wins over a 4-hour mark at the same spot).
      const events = [];
      for (let n = 1; n * dayEff < totalEff && n <= 120; n++) events.push({ d: n * dayEff, k: 'day', n });
      for (let n = 1; n * blockEff < totalEff && n <= 600; n++) {
        const d = n * blockEff;
        if (!events.some((o) => o.k === 'day' && Math.abs(o.d - d) < blockEff * 0.05)) events.push({ d, k: 'block' });
      }
      events.sort((x, y) => x.d - y.d);
      let acc = 0, ei = 0;
      for (const [kind, len, a, b] of rs.samples) {
        const e = len / speedOf(kind);
        while (ei < events.length && events[ei].d <= acc + e) {
          const ev = events[ei++], f = e ? (ev.d - acc) / e : 0, c = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          feats.push({ type: 'Feature', properties: { k: ev.k }, geometry: { type: 'Point', coordinates: c } });
          if (ev.k === 'day' && labelAt.length < 60) labelAt.push([c, ev.n]);
        }
        acc += e;
      }
    }
    map.getSource('ruler').setData({ type: 'FeatureCollection', features: feats });
    // "Day N" tags: reuse the ones already on the map so the preview doesn't flicker.
    labelAt.forEach(([c, n], i) => {
      let m = ruler.labels[i];
      if (!m) { m = new maplibregl.Marker({ element: el('div', 'ruler-label'), anchor: 'bottom', offset: [0, -9] }).setLngLat(c).addTo(map); ruler.labels.push(m); }
      m.setLngLat(c);
      m.getElement().textContent = 'Day ' + n;
    });
    ruler.labels.splice(labelAt.length).forEach((m) => m.remove());
  }
  function updateRulerReadout() {
    const box = $('#ruler-readout');
    if (!box) return;
    const pts = ruler.points.concat(ruler.hover && ruler.points.length ? [ruler.hover] : []);
    box.innerHTML = '';
    if (pts.length < 2) { box.appendChild(el('p', 'muted', ruler.points.length ? 'Click the next point of the route.' : 'Click the map where the party starts, then click along the route they’ll take.')); return; }
    const ts = rulerSamples(pts), real = ts.real, prof = terrainProfile(ts, ruler.mode), t = routeTime(prof.eff, ruler.mode, ruler.pace);
    box.appendChild(el('div', 'ruler-time', fmtDuration(t.hours, t.dayHours)));
    box.appendChild(el('div', 'ruler-sub', `${fmtMi(real * data.travel.scale)} miles of travel · ${TRAVEL[ruler.mode].name.toLowerCase()}, ${PACES[ruler.pace][0].toLowerCase()} pace (${t.perDay} miles a day, ${t.dayHours} hours on the move)`));
    const blocks = Math.ceil(t.hours / 4 - 1e-9), days = Math.ceil(t.days - 1e-9);
    const notes = [`${blocks} four-hour travel block${blocks === 1 ? '' : 's'} (a chance of an event in each)`];
    const tn = terrainNote(prof, ruler.mode);
    if (tn) notes.unshift(tn);
    if (ruler.pace === 1) notes.push(`Endurance check for everyone at the end of each day (${days}). A failure costs 10% sanity and 15% food.`);
    if (ruler.pace === 2) notes.push(`Tolerance checks every 2 hours past 10 (2 a day, ${days * 2} in all). Each failure costs 10% sanity and 15% food. Can’t be done two days in a row.`);
    if (ruler.mode !== 'foot') {
      const cans = Math.max(0, Math.ceil((t.hours - Math.ceil(t.days - 1e-9) * 8) / 2 - 1e-9));
      notes.push(`Fuel: ${Math.round(t.hours * 2) / 2} hours of engine time. A full tank is 8 hours; each spare can adds 2${cans ? ` (about ${cans} can${cans === 1 ? '' : 's'} if they refill the tank each night)` : ''}.`);
      notes.push(ruler.mode === 'car' ? 'Breakdown roll each driving day (d20: 1–3). Roads and ferries only.' : 'Weather roll each morning; engine trouble on a d20 of 1–2. Against the tide, fuel burns twice as fast.');
    }
    const ul = el('ul', 'ruler-notes');
    notes.forEach((n) => ul.appendChild(el('li', null, n)));
    box.appendChild(ul);
    const cmp = Object.keys(TRAVEL).filter((k) => k !== ruler.mode).map((k) => { const o = routeTime(terrainProfile(ts, k).eff, k, ruler.pace); return TRAVEL[k].name + ': ' + fmtDuration(o.hours, o.dayHours); });
    box.appendChild(el('p', 'tip', 'At the same pace · ' + cmp.join(' · ')));
  }
  function showRuler() {
    if (!editing) return;
    currentView = 'ruler'; selectedId = null; setTab('ruler'); updateStatus(); popup.remove();
    if (mode) cancelMode(true);
    const b = body();
    if (!ruler.active) startRuler();
    const seg = (items, cur, onPick) => {
      const row = el('div', 'ruler-seg');
      items.forEach(([k, label]) => row.appendChild(btn(label, 'small' + (k === cur ? ' on' : ''), () => onPick(k))));
      return row;
    };
    b.appendChild(btn(terrainOn ? 'Hide terrain' : 'Show terrain (swamps, woods, towns…)', 'small' + (terrainOn ? ' on' : ''), () => setTerrain(!terrainOn)));
    b.appendChild(el('div', 'sub-h', 'How are they travelling?'));
    b.appendChild(seg(Object.entries(TRAVEL).map(([k, v]) => [k, v.name]), ruler.mode, (k) => { ruler.mode = k; lsSet(RULER_PREF, { mode: ruler.mode, pace: ruler.pace }); drawRuler(); showRuler(); }));
    b.appendChild(el('div', 'sub-h', 'Pace'));
    b.appendChild(seg(PACES.map(([n], i) => [i, n]), ruler.pace, (i) => { ruler.pace = i; lsSet(RULER_PREF, { mode: ruler.mode, pace: ruler.pace }); drawRuler(); showRuler(); }));
    if (partyPos && !ruler.points.length) b.appendChild(btn('Start at the party', 'small accent', () => { ruler.points = [[partyPos.lng, partyPos.lat]]; drawRuler(); showRuler(); }));
    const ro = el('div', 'ruler-readout');
    ro.id = 'ruler-readout';
    b.appendChild(ro);
    updateRulerReadout();
    const row = el('div', 'btn-row');
    row.appendChild(btn('Undo last point', 'small', () => { ruler.points.pop(); ruler.hover = null; drawRuler(); showRuler(); }));
    row.appendChild(btn('Clear', 'small ghost', () => { ruler.points = []; ruler.hover = null; drawRuler(); showRuler(); }));
    b.appendChild(row);
    b.appendChild(el('p', 'tip', 'Small dots mark every 4 hours of travel; big dots mark the end of each day. Esc clears the route. Only you see the ruler.'));
    // Map scale
    const sc = el('input');
    sc.type = 'number'; sc.min = '1'; sc.max = '20'; sc.step = '0.5'; sc.value = String(data.travel.scale);
    sc.onchange = () => { data.travel.scale = Math.min(20, Math.max(1, +sc.value || TRAVEL_SCALE_DEFAULT)); changed(); drawRuler(); showRuler(); };
    b.appendChild(field('Map scale: 1 mile on the map = this many miles of travel', sc));
    const across = routeMiles([[LOCK_BOUNDS[0][0], (LOCK_BOUNDS[0][1] + LOCK_BOUNDS[1][1]) / 2], [LOCK_BOUNDS[1][0], (LOCK_BOUNDS[0][1] + LOCK_BOUNDS[1][1]) / 2]]);
    const cross = (k) => fmtDuration(routeTime(across, k, 0).hours, PACES[0][1]);
    b.appendChild(el('p', 'tip', `Right now, crossing the whole map at an average pace takes ${cross('foot')} on foot, ${cross('car')} by car or ${cross('boat')} by boat. Publish after changing the scale so it’s saved.`));
  }

  // --- Characters: every player's saved sheet, read-only ---
  function showCharacters(id) {
    if (!editing) return;
    const keepScroll = currentView === 'characters' && $('#ed-body') ? $('#ed-body').scrollTop : 0;
    currentView = 'characters'; selectedId = null; setTab('characters'); updateStatus(); popup.remove();
    const b = body();
    b.appendChild(vitalsTable());
    requestAnimationFrame(() => { b.scrollTop = keepScroll; });
    const all = lsGet(DM_SHEETS_KEY(), {}) || {};
    const ids = Object.keys(all).sort((x, y) => (all[y].ts || 0) - (all[x].ts || 0));
    b.appendChild(el('div', 'sub-h', 'Character sheets'));
    if (!ids.length) {
      b.appendChild(el('p', 'muted', 'No characters yet. When a player presses “Save character” on their sheet, a copy shows up here.'));
      return;
    }
    if (!id || !all[id]) id = ids[0];
    selectedId = id;
    const label = (k) => (all[k].sheet.name || 'Unnamed character') + ' · ' + all[k].by + (party.has(k) ? ' (online)' : '');
    b.appendChild(field('Character', selectInput(ids.map((k) => [k, label(k)]), id, (v) => showCharacters(v))));
    const e = all[id], s = e.sheet;
    b.appendChild(el('p', 'tip', 'Saved ' + new Date(e.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) + '. This updates each time the player saves.'));

    const sec = (t) => b.appendChild(el('div', 'sub-h', t));
    const kv = (pairs) => {
      const g = el('div', 'ch-grid');
      pairs.filter(([, v]) => v !== '' && v != null).forEach(([k, v]) => { const c = el('div', 'ch-kv'); c.appendChild(el('span', null, k)); c.appendChild(el('b', null, String(v))); g.appendChild(c); });
      b.appendChild(g);
    };
    b.appendChild(el('div', 'ch-name', s.name || 'Unnamed character'));
    kv([['Player', s.player || e.by], ['Level', s.level], ['Affiliation', s.affiliation], ['Age', s.age], ['Height', s.height], ['Weight', s.weight]]);
    if (s.traits.trim()) b.appendChild(el('p', 'ch-text', s.traits));

    const bg = bgOf(s);
    sec('Background');
    if (bg) {
      b.appendChild(el('p', 'ch-text', bg[1] + ' (' + bg[0] + ') · ' + Object.entries(bg[2]).map(([k, v]) => `+${v} ${PROWESS.find((p) => p[0] === k)[1]}`).join(', ')));
      b.appendChild(el('p', 'ch-text ch-dim', bg[3]));
    } else b.appendChild(el('p', 'muted', 'None chosen.'));

    sec('P.R.O.W.E.S.S');
    PROWESS.forEach(([k, name, list]) => {
      const tot = statTotal(s, k), card = el('div', 'ch-stat');
      const top = el('div', 'ch-stat-top');
      top.appendChild(el('b', null, name));
      top.appendChild(el('span', null, tot + ' (' + fmtBonus(statBonus(tot)) + ')'));
      card.appendChild(top);
      const subs = el('div', 'ch-subs');
      list.forEach((n) => subs.appendChild(el('span', null, n + ' ' + fmtBonus(subValue(s, k, n)))));
      card.appendChild(subs);
      b.appendChild(card);
    });

    sec('Combat profile');
    const vit = subValue(s, 'endurance', 'Vitality'), eva = subValue(s, 'outlook', 'Evasion'), spd = subValue(s, 'reflex', 'Speed');
    kv([['Max health', 10 + vit * s.level], ['Armor class', Math.min(19, 10 + eva)], ['Turn order (Speed)', spd]]);

    sec('Inventory');
    if (!s.inventory.length) b.appendChild(el('p', 'muted', 'Empty.'));
    s.inventory.forEach((it) => {
      const r = el('div', 'ch-item');
      r.appendChild(el('b', null, (it.name || 'Unnamed item') + (it.qty && it.qty !== '1' ? ' ×' + it.qty : '')));
      if (it.notes) r.appendChild(el('span', null, it.notes));
      b.appendChild(r);
    });

    const ab = cleanAbilities((lsGet(DM_ABIL_KEY(), {}) || {})[id]);
    sec('Passives & actives');
    if (!ab.passives.length && !ab.actives.length) b.appendChild(el('p', 'muted', 'None given yet.'));
    ab.passives.concat(ab.actives).forEach((p) => {
      const r = el('div', 'ch-item');
      r.appendChild(el('b', null, (p.name || 'Unnamed') + (p.sides ? ' · ' + diceLabel(p.count, p.sides, p.mod) : '')));
      if (p.desc) r.appendChild(el('span', null, p.desc));
      b.appendChild(r);
    });

    const foot = el('div', 'form-foot');
    foot.appendChild(btn('Remove from list', 'danger', async () => {
      if (!(await ask(`Remove ${s.name || 'this character'} from your list? It comes back if the player saves again.`, 'Remove', 'Keep it'))) return;
      const a2 = lsGet(DM_SHEETS_KEY(), {}) || {};
      delete a2[id]; lsSet(DM_SHEETS_KEY(), a2);
      if (relay && relay.connected) relay.publish(`${ROOM}/sheet/${id}`, '', { retain: true });
      showCharacters();
    }));
    foot.appendChild(btn('Edit abilities', 'primary', () => showAbilityEditor(id)));
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
      if (k === 'audio' && typeof v === 'string') {
        const am = /^data:(audio\/[a-z0-9.+-]+);base64,(.+)$/i.exec(v);
        if (!am) continue;
        const aext = ({ 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm' })[am[1].toLowerCase()] || 'mp3';
        const apath = `sounds/${node.id || uid()}-${Date.now().toString(36)}${files.length}.${aext}`;
        files.push({ path: apath, base64: am[2] });
        imageCache[apath] = v;
        node[k] = apath;
        continue;
      }
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
