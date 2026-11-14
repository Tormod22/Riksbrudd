'use strict';
// Kartflisene: henting fra kartfilene (PMTiles), dekoding og komponering av én skjermflis (høyde, skygge, vann, omland,
// veger, jernbane, trær, hus). Uten DOM, så den samme koden kjører i bakgrunnstråden (kartflis-arbeider.js) og på siden
// (reserve for nettlesere uten OffscreenCanvas). Siden og tråden fyller inn KF med det de vet.
const KF = {
  klar: Promise.resolve(), lagfiler: null, norgeBlokker: null, vis: null,   // kartfilene, Norge-blokkene (omlandet), kartlagene som vises
  riksgrense: null,   // riksgrensa (Riksgrense.les fra spill/riksgrense.js) – Norge-kartet tones over i omlandet rett utenfor den
  kartTag: null, release: Promise.resolve(false), data: '/dovre-fliser/data/',
  vedBytes(n, kilde) {}, vedFeil(e) { console.error(e); },
  feil: 0,   // antall hentinger som har feilet: en flis som ble laget mens tallet steg, mangler noe og lages på nytt (ufull)
};
// Henting med tidsgrense (12. nov): et kartlager som ikke svarer, skal gi en feil vi kan vise og prøve igjen etter – ikke vente for alltid.
// les: 'arrayBuffer' eller 'json'. Avbrytes hentingen utenfra (signal), kastes AbortError som før.
async function hentMedFrist(url, ms, les, valg) {
  const a = new AbortController(), ytre = valg && valg.signal, stopp = () => a.abort(); let forSent = false;
  // Fristen telles i sekundsteg: står siden stille en stund (et 3D-utsnitt som settes inn kan ta mange sekunder på en treg maskin),
  // går bare ett steg i mellomtiden, så et svar som alt er kommet rekker å bli lest før fristen regnes som ute.
  let igjen = ms, t = null; const steg = () => { const s = Math.min(1000, igjen); igjen -= s; t = setTimeout(() => { if (igjen > 0) steg(); else { forSent = true; a.abort(); } }, s); };
  steg(); if (ytre) ytre.addEventListener('abort', stopp);
  try { const r = await fetch(url, Object.assign({}, valg, { signal: a.signal })); return { r, data: r.ok ? await r[les]() : null }; }
  catch (e) { if (forSent) throw new Error('tidsgrense: kartlageret svarte ikke på ' + Math.round(ms / 1000) + ' s'); throw e; }
  finally { clearTimeout(t); if (ytre) ytre.removeEventListener('abort', stopp); }
}
const FRIST_FLIS = 25000;
// vent(ms, signal): en pause mellom to forsøk; avbrytes hentingen utenfra, kastes AbortError
const vent = (ms, signal) => new Promise((ja, nei) => { const t = setTimeout(ja, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('avbrutt'); e.name = 'AbortError'; nei(e); }, { once: true }); });
// Reservefiler som ikke finnes på serveren: prøves ikke igjen
const UTEN_RESERVE = new Set();
// Kjedebutikkene (k i byggdataene, nummeret fra KJEDER i pipeline/fliser/bygninger.py) får oppdiktede navn og egne farger,
// så man kjenner dem igjen fra virkeligheten uten å bruke de ekte merkene (brukeren 11. nov: «en Kiwi blir en grønn butikk som heter Pære»).
// [navn, skiltfarge, tekstfarge]
const BUTIKKER = {
  1: ['Pære', '#5aa02c', '#ffffff'], 2: ['Rima 2000', '#0b3c8c', '#ffffff'], 3: ['Ekstrem', '#ffd400', '#d2001e'], 4: ['Priks', '#f6d000', '#1b3a8a'],
  5: ['Giga', '#c8102e', '#ffffff'], 6: ['Oops!', '#c8102e', '#ffffff'], 7: ['Menyen', '#b5121b', '#ffffff'], 8: ['Sparegris', '#007a3d', '#ffffff'],
  9: ['Knekt', '#e30613', '#ffd200'], 10: ['Toppris', '#ffd200', '#d2001e'], 11: ['Asiapris', '#1d4f9c', '#ffd200'], 12: ['Firkant Q', '#e4002b', '#ffffff'],
  13: ['Ezzo', '#ffffff', '#d2001e'], 14: ['Skjell', '#ffd500', '#dd1d21'], 15: ['Duo-Y', '#e30613', '#ffffff'], 16: ['Ølmonopolet', '#1f1f1f', '#e6c35c'],
  17: ['Apotek 2', '#00843d', '#ffffff'], 18: ['Vitaminapoteket', '#d50032', '#ffffff'], 19: ['Støvler', '#05054b', '#ffffff'], 20: ['XXS', '#111111', '#ffd400'],
  21: ['Elsalg', '#00539f', '#ffffff'], 22: ['Kraft', '#ff5a00', '#ffffff'], 23: ['Klas Olsen', '#00488f', '#ffffff'], 24: ['Båttema', '#003a8c', '#ffd200'],
  25: ['Stålia', '#e30613', '#ffffff'], 26: ['Narrvesen', '#d2001e', '#ffffff'], 27: ['8-Twelve', '#ffffff', '#008163'], 28: ["McRonny's", '#da291c', '#ffc72c'],
  29: ['Burgerprinsen', '#f5ebdc', '#d62300'], 30: ['Min Burger', '#e30613', '#ffffff'], 31: ['Paprikas Pizza', '#1d1d1b', '#e30613'], 32: ['Samvirkelaget', '#00529b', '#ffffff'],
  33: ['Unormal', '#ffffff', '#e30613'], 34: ['Dansk', '#143c8c', '#ffffff'], 36: ['Nulle', '#e5007e', '#ffffff'], 37: ['Blanding', '#e30613', '#ffffff'],
  38: ['ZY', '#ffffff', '#e30613'], 39: ['St2', '#ffffff', '#003c78'],
};

// ---------- flisnettet (samme som pipeline/fliser/felles.py) ----------
const G = { x0: -200000, y0: 9300000, res0: 16384, T: 256 };
const res = z => G.res0 / 2 ** z, span = z => G.T * res(z);

class Kilde {
  constructor(fil, tag) { this.fil = fil; this.tag = tag || null; this.url = KF.data + fil; }   // tag: egen release (byggomriss)
  getKey() { return (this.tag || '') + this.url; }
  async getBytes(off, len, signal) {
    // fra: hvorfor kartlageret ikke svarte – vises når reserven heller ikke finnes (14. nov: brukeren fikk «HTTP 404 …/vektor-0.pmtiles»
    // på /norge; det var reservefila som ikke finnes, mens den egentlige feilen fra kartlageret ble borte)
    let fra = null;
    if (this.tag || await KF.release) {   // GitHub-releasen via mellomstasjonen: byteområdet i adressen, så Vercel kan lagre hver bit
      // Kartlageret kan svare 429/5xx eller miste forbindelsen i korte perioder (GitHub bak mellomstasjonen): opptil tre forsøk
      for (let forsøk = 0; forsøk < 3; forsøk++) {
        try {
          const { r, data } = await hentMedFrist(`/api/kart/${this.tag || KF.kartTag}/${this.fil}/${off}/${len}`, FRIST_FLIS, 'arrayBuffer', { signal });
          if (r.ok) { KF.vedBytes(data.byteLength, 'GitHub'); return { data }; }
          fra = 'kartlageret svarte ' + r.status + ' for ' + this.fil;
          // 400 og 404 blir ikke bedre av et nytt forsøk
          if (r.status < 500 && r.status !== 429 && r.status !== 408) break;
        } catch (e) { if (e.name === 'AbortError') throw e; fra = String(e && e.message || e); if (/tidsgrense/.test(fra)) break; }
        if (forsøk < 2) await vent(350 * 3 ** forsøk, signal);
      }
      if (this.tag) throw new Error(fra);
    }
    if (fra && UTEN_RESERVE.has(this.url)) throw new Error(fra);
    const svar = await hentMedFrist(this.url, FRIST_FLIS, 'arrayBuffer', { headers: { Range: `bytes=${off}-${off + len - 1}` }, signal }), r = svar.r;
    // reserven finnes ikke (hele Norge ligger bare i kartlageret): husk det, og meld feilen fra kartlageret
    if (r.status === 404 && fra) { UTEN_RESERVE.add(this.url); throw new Error(fra); }
    if (r.status !== 206 && r.status !== 200) throw new Error('HTTP ' + r.status + ' ' + this.url);
    let data = svar.data;
    if (r.status === 200 && data.byteLength > len) data = data.slice(off, off + len); // server uten Range
    KF.vedBytes(data.byteLength, 'Vercel');
    return { data };   // ingen etag: kildene kan byttes underveis, og versjonen ligger i KART_TAG
  }
}

function zmaks(lag, std) { const l = KF.lagfiler && KF.lagfiler[lag]; return l && l.length ? Math.max(...l.map(f => Math.min(f.zmax, 17))) : std; }   // 2023-kartet: kart/terreng til z10
function filFor(lag, z, x) {
  const liste = KF.lagfiler && KF.lagfiler[lag]; if (!liste) return null;
  return liste.find(f => z >= f.zmin && z <= f.zmax && (!f.x6 || z < 6 || ((x >> (z - 6)) >= f.x6[0] && (x >> (z - 6)) <= f.x6[1])));
}


// ---------- dekoding ----------
// Tegneflate i bakgrunnen: OffscreenCanvas der den har 2D (Safari fra 16.4), ellers et vanlig canvas.
const HAR_OFFSCREEN = (() => { try { return typeof OffscreenCanvas !== 'undefined' && !!new OffscreenCanvas(1, 1).getContext('2d'); } catch (e) { return false; } })();
const lerret = (w, h) => HAR_OFFSCREEN ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
// Leser et bilde. createImageBitmap med valg feiler i eldre Safari – da brukes et vanlig <img>.
async function bilde(data, type) {
  const blob = new Blob([data], { type });
  try { return await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); } catch (e) { /* prøv neste */ }
  try { return await createImageBitmap(blob); } catch (e) { /* prøv neste */ }
  const url = URL.createObjectURL(blob);
  try { const im = new Image(); im.src = url; await im.decode(); const c = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight }); c.getContext('2d').drawImage(im, 0, 0); return c; }
  finally { URL.revokeObjectURL(url); }
}
async function piksler(data, type) {
  const bm = await bilde(data, type);
  const c = lerret(bm.width, bm.height), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(bm, 0, 0); return { d: g.getImageData(0, 0, bm.width, bm.height).data, w: bm.width, h: bm.height };
}
const DEKOD = {
  async hoyde(data, z) { // presisjon som i pipeline/fliser/02_fliser.py: 0,1 m på z12–13, 0,5 m ellers
    const { d, w, h } = await piksler(data, 'image/webp'), p = z >= 12 ? 10 : 2, a = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) { const v = d[i * 4] * 256 + d[i * 4 + 1]; a[i] = v ? v / p - 1000 : NaN; }
    // helning (dz/dx østover, dz/dy nedover) i hvert kildepunkt; interpoleres i visningen så skyggen blir glatt ved overzoom
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h), r2 = 2 * res(z);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x;
      gx[i] = (a[y * w + Math.min(w - 1, x + 1)] - a[y * w + Math.max(0, x - 1)]) / r2;
      gy[i] = (a[Math.min(h - 1, y + 1) * w + x] - a[Math.max(0, y - 1) * w + x]) / r2; }
    return { a, gx, gy, w, h }; },
  async terreng(data) { const { d, w, h } = await piksler(data, 'image/webp'); const a = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = d[i * 4]; return { a, w, h }; },
  async kart(data) { const bm = await bilde(data, 'image/webp');
    const c = lerret(bm.width, bm.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0);
    return { bm, d: g.getImageData(0, 0, bm.width, bm.height).data, w: bm.width, h: bm.height }; },
  async vektor(data) { return mvt(new Uint8Array(data)); },
  async hus(data) { return mvt(new Uint8Array(data)); },
  async okart(data) { return DEKOD.kart(data); },
  async utveg(data) { return mvt(new Uint8Array(data)); },
  async ohoyde(data, z) { return DEKOD.hoyde(data, z); },
};

// Liten MVT-leser (Mapbox Vector Tile 2.1): lag -> objekter med type, egenskaper og geometri i flis-koordinater.
function mvt(b) {
  let p = 0; const td = new TextDecoder();
  const vi = () => { let r = 0, s = 0, x; do { x = b[p++]; r += (x & 127) * 2 ** s; s += 7; } while (x & 128); return r; };
  const zz = n => (n % 2 ? -(n + 1) / 2 : n / 2);
  const hopp = w => { if (w === 0) vi(); else if (w === 1) p += 8; else if (w === 2) p += vi(); else if (w === 5) p += 4; };
  const pakket = () => { const e = vi() + p, r = []; while (p < e) r.push(vi()); return r; };
  const ut = {};
  while (p < b.length) {
    const k = vi(); if ((k >> 3) !== 3) { hopp(k & 7); continue; }
    const end = vi() + p, L = { navn: '', nok: [], verdi: [], obj: [], ext: 4096 }, rå = [];
    while (p < end) {
      const k2 = vi(), f = k2 >> 3, w = k2 & 7;
      if (f === 1) { const l = vi(); L.navn = td.decode(b.subarray(p, p + l)); p += l; }
      else if (f === 3) { const l = vi(); L.nok.push(td.decode(b.subarray(p, p + l))); p += l; }
      else if (f === 5) L.ext = vi();
      else if (f === 2) { const fe = vi() + p, o = { tags: [], type: 0, g: [] };
        while (p < fe) { const k3 = vi(), f3 = k3 >> 3, w3 = k3 & 7;
          if (f3 === 2) o.tags = pakket(); else if (f3 === 3) o.type = vi(); else if (f3 === 4) o.g = pakket(); else hopp(w3); }
        rå.push(o); }
      else if (f === 4) { const ve = vi() + p; let v = null;
        while (p < ve) { const k3 = vi(), f3 = k3 >> 3, w3 = k3 & 7;
          if (f3 === 1) { const l = vi(); v = td.decode(b.subarray(p, p + l)); p += l; }
          else if (f3 === 2) { v = new DataView(b.buffer, b.byteOffset + p, 4).getFloat32(0, true); p += 4; }
          else if (f3 === 3) { v = new DataView(b.buffer, b.byteOffset + p, 8).getFloat64(0, true); p += 8; }
          else if (f3 === 4 || f3 === 5) v = vi(); else if (f3 === 6) v = zz(vi()); else if (f3 === 7) v = !!vi(); else hopp(w3); }
        L.verdi.push(v); }
      else hopp(w);
    }
    for (const o of rå) {
      const e = {}; for (let i = 0; i < o.tags.length; i += 2) e[L.nok[o.tags[i]]] = L.verdi[o.tags[i + 1]];
      const deler = []; let x = 0, y = 0, cur = null;
      for (let i = 0; i < o.g.length;) { const c = o.g[i++], id = c & 7, n = c >> 3;
        if (id === 7) { if (cur && cur.length) cur.push(cur[0]); continue; }
        for (let j = 0; j < n; j++) { x += zz(o.g[i++]); y += zz(o.g[i++]);
          if (id === 1) { cur = [[x, y]]; deler.push(cur); } else cur.push([x, y]); } }
      L.obj.push({ type: o.type, e, deler });
    }
    ut[L.navn] = L;
  }
  return ut;
}

// ---------- flis-hurtigminne ----------
const RÅ = new Map();
function hentFlis(lag, z, x, y) {
  const k = lag + '/' + z + '/' + x + '/' + y;
  if (!RÅ.has(k)) {
    RÅ.set(k, KF.klar.then(() => { const f = filFor(lag, z, x); return f ? f.pm.getZxy(z, x, y) : null; })
      .then(r => r ? DEKOD[lag](r.data, z) : null).catch(e => { console.error(e); RÅ.delete(k); KF.feil++; rensLager(lag, z, x); KF.vedFeil(e); return null; }));
    if (RÅ.size > 900) RÅ.delete(RÅ.keys().next().value);
  }
  return RÅ.get(k);
}
// pmtiles husker også hentinger som feilet (innholdsfortegnelsene), så et kort nettbrudd kunne gjøre et kartlag tomt til siden ble
// lastet på nytt. Etter en feil tas de mislykkede oppslagene ut av lageret, så neste forsøk henter på nytt.
function rensLager(lag, z, x) {
  const f = filFor(lag, z, x), c = f && f.pm && f.pm.cache && f.pm.cache.cache; if (!c || !c.forEach) return;
  c.forEach((v, k) => { if (v && v.data && v.data.then) v.data.then(null, () => { if (c.get(k) === v) c.delete(k); }); });
}
// Beste tilgjengelige flis for (z,x,y): prøver z, så forelder for forelder ned til zmin.
async function beste(lag, z, x, y, zmax, zmin) {
  for (let zz = Math.min(z, zmax); zz >= zmin; zz--) {
    const s = z - zz, t = await hentFlis(lag, zz, x >> s, y >> s);
    if (t) return { t, zz, f: 2 ** s, ix: x - ((x >> s) << s), iy: y - ((y >> s) << s) };
  }
  return null;
}

// ---------- frø: samme svar på samme sted, hver gang, for alle spillere ----------
function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}

// Glatt støy (verdistøy) og forskyvning: grensene mellom arealtyper følger naturlige linjer i stedet for 32 m-ruter.
function stoy(X, Y, s, k) {
  const gx = Math.floor(X / s), gy = Math.floor(Y / s); let fx = X / s - gx, fy = Y / s - gy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy, k), b = hash(gx + 1, gy, k), c = hash(gx, gy + 1, k), d = hash(gx + 1, gy + 1, k);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}
function vri(X, Y) { return [(stoy(X, Y, 70, 21) - .5) * 44 + (stoy(X, Y, 17, 23) - .5) * 14, (stoy(X, Y, 70, 22) - .5) * 44 + (stoy(X, Y, 17, 24) - .5) * 14]; }

// ---------- komponering av én skjermflis ----------
const VEG = { E: [10, 2.4, '#caa060'], R: [9, 2.2, '#c39a5c'], F: [7, 1.8, '#bba982'], K: [5.5, 1.3, '#b2a68a'], P: [3.5, .9, '#a2967c'], S: [3, .8, '#a2967c'] };
const VEGREKKE = ['S', 'P', 'K', 'F', 'R', 'E'];
// Nær (fra z14, 1 m per punkt): vegen som den ser ut – asfalt med Statens vegvesens oppmerking, forenklet.
// E-, riks- og fylkesveg: hvite kantlinjer og gul midtlinje; kommunal veg: bare gul midtlinje; privat veg og skogsbilveg: grus.
// Bredde i meter etter kategori (NVDB-lagene har ikke vegbredde). Midtlinja er skillelinje: 3 m strek, 9 m opphold.
const VEGBREDDE = { E: 9.5, R: 8.5, F: 7, K: 5.5, P: 3.5, S: 3.2 }, KANTLINJE = 'FRE', MIDTLINJE = 'KFRE';
function vegerRealistisk(g, veger, r) {
  const sti = kat => { g.beginPath(); for (const o of veger) if (o.k === kat) for (const d of o.deler) { g.moveTo(d[0][0], d[0][1]); for (let i = 1; i < d.length; i++) g.lineTo(d[i][0], d[i][1]); } };
  const strek = m => Math.max(1, m / r), asfalt = k => k !== 'P' && k !== 'S';
  g.save(); g.lineCap = 'butt'; g.lineJoin = 'round';
  for (const k of VEGREKKE) { sti(k); g.strokeStyle = asfalt(k) ? '#55503f' : '#4b4433'; g.lineWidth = (VEGBREDDE[k] + 1.8) / r; g.stroke(); }   // skulder og grøftekant
  for (const k of VEGREKKE) { sti(k); g.strokeStyle = asfalt(k) ? '#3f3e3a' : '#837458'; g.lineWidth = VEGBREDDE[k] / r; g.stroke(); }          // asfalt / grus
  for (const k of KANTLINJE) { sti(k); g.strokeStyle = '#d8d4c8'; g.lineWidth = (VEGBREDDE[k] - .4) / r; g.stroke(); }                           // kantlinjene (hvit kant igjen etter neste lag)
  for (const k of VEGREKKE) {   // flaten innenfor kantlinjene; mindre veger tegnes først, så kantlinja brytes der en sideveg kommer inn
    sti(k); g.strokeStyle = asfalt(k) ? '#3f3e3a' : '#837458';
    g.lineWidth = KANTLINJE.includes(k) ? Math.max(1, (VEGBREDDE[k] - .4) / r - 2 * strek(.12)) : VEGBREDDE[k] / r; g.stroke(); }
  g.lineCap = 'butt';
  for (const k of MIDTLINJE) { sti(k); g.strokeStyle = '#d6ac3c'; g.lineWidth = strek(.13); g.setLineDash([Math.max(2, 3 / r), Math.max(4, 9 / r)]); g.stroke(); }
  g.setLineDash([]); g.restore();
}

// Hav og vann: dempet blått (stil 1), også bak kartet der det ikke finnes fliser.
const HAV = [44, 74, 102], HAV_CSS = `rgb(${HAV})`;
const OMLAND_LYS = .8;   // omlandet (WorldCover uten satellittbildets lysstyrke) er ca. 20 % lysere enn Norge-kartet: målt 8. nov
// Norge-kartets vekt (0–1): 1 inne i Norge-blokkene, tones ned mot 0 de siste TONING meterne før en blokk uten Norge-data.
const TONING = 12000;
function vekt(X, Y) {
  if (!KF.norgeBlokker) return 1;
  const s = span(6), u = (X - G.x0) / s, v = (G.y0 - Y) / s, bx = Math.floor(u), by = Math.floor(v);
  if (!KF.norgeBlokker.has(bx + ',' + by)) return 0;
  const fx = u - bx, fy = v - by; let d = Infinity;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !KF.norgeBlokker.has((bx + dx) + ',' + (by + dy)))
    d = Math.min(d, Math.hypot(dx < 0 ? fx : dx > 0 ? 1 - fx : 0, dy < 0 ? fy : dy > 0 ? 1 - fy : 0) * s);
  const t = Math.min(1, d / TONING); return t * t * (3 - 2 * t) * grensevekt(X, Y, bx, by);
}
// Riksgrensa (12. nov): Norge-blokkene dekker også et stykke av Sverige, Finland og Russland, og der hadde Norge-kartet rette
// sømmer (satellittmosaikken skifter lysstyrke fra blokk til blokk og fra opptak til opptak). Utenfor grensa vises derfor omlandet:
// vekten er 1 i Norge og de første GRENSE_INNE meterne utenfor, og tones til 0 ved GRENSE_UTE. Uten grensedata: 1 (som før).
const GRENSE_INNE = 300, GRENSE_UTE = 3500, GRENSE_BLOKK = new Map();
function grensevekt(X, Y, bx, by) {
  const R = KF.riksgrense; if (!R || typeof Riksgrense === 'undefined') return 1;
  if (GRENSE_BLOKK.R !== R) { GRENSE_BLOKK.clear(); GRENSE_BLOKK.R = R; }
  // per blokk: ligger hele blokka langt fra grensa (halv diagonal + toningen + unøyaktigheten langt unna), er svaret det samme overalt
  const k = bx + ',' + by; let b = GRENSE_BLOKK.get(k);
  if (b === undefined) { const s = span(6), d = Riksgrense.avstand(R, G.x0 + (bx + .5) * s, G.y0 - (by + .5) * s);
    b = Math.abs(d) > s * .75 + GRENSE_UTE + 9000 ? (d > 0 ? 1 : 0) : -1; GRENSE_BLOKK.set(k, b); }
  if (b >= 0) return b;
  const d = Riksgrense.avstand(R, X, Y); if (d >= -GRENSE_INNE) return 1; if (d <= -GRENSE_UTE) return 0;
  const t = (d + GRENSE_UTE) / (GRENSE_UTE - GRENSE_INNE); return t * t * (3 - 2 * t);
}
// Vekten på et grovt rutenett over flisen (33 × 33, før 17 × 17: toningen ved riksgrensa er smalere enn den mot blokkantene), interpoleres per punkt.
function vektRutenett(minx, maxy, sp) {
  const n = 33, a = new Float32Array(n * n); a.n = n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) a[j * n + i] = vekt(minx + sp * i / (n - 1), maxy - sp * j / (n - 1));
  return a;
}
function vektVed(VK, fx, fy) { const M = VK.n - 1, u = Math.max(0, Math.min(M - 1e-6, fx * M)), v = Math.max(0, Math.min(M - 1e-6, fy * M)), i = u | 0, j = v | 0, a = u - i, c = v - j, n = VK.n;
  return (VK[j * n + i] * (1 - a) + VK[j * n + i + 1] * a) * (1 - c) + (VK[(j + 1) * n + i] * (1 - a) + VK[(j + 1) * n + i + 1] * a) * c; }
// Omlandets høyde (64 m, Copernicus) der Norge-høyden mangler (bare = true: fyll bare NaN-punkter).
function fyllHoyde(oh, E, GX, GY, N, bare) {
  const T = G.T, H = oh.t, W = H.w;
  const bil = (A, i, fx, fy) => (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + W] * (1 - fx) + A[i + W + 1] * fx) * fy;
  for (let py = -1; py <= T; py++) for (let px = -1; px <= T; px++) {
    const j = (py + 1) * N + px + 1; if (bare && E[j] === E[j]) continue;
    const sx = (oh.ix * T + px + .5) / oh.f - .5 + 1, sy = (oh.iy * T + py + .5) / oh.f - .5 + 1;
    const x0 = Math.max(0, Math.min(W - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(H.h - 2, Math.floor(sy))), fx = sx - x0, fy = sy - y0, i = y0 * W + x0;
    E[j] = bil(H.a, i, fx, fy); GX[j] = bil(H.gx, i, fx, fy); GY[j] = bil(H.gy, i, fx, fy);
  }
}

// Alle dataene en flis trenger, hentet samtidig (før: fire runder etter hverandre). Brukes også til å hente på forhånd.
function flisData(z, x, y, valg = KF.vis, hel = vektRutenett(G.x0 + x * span(z), G.y0 - y * span(z), span(z)).every(v => v >= 1)) {
  return Promise.all([beste('kart', z, x, y, zmaks('kart', 9), 0), beste('hoyde', z, x, y, 13, 0),
    z >= 12 ? beste('terreng', z, x, y, zmaks('terreng', 9), 6) : null, z >= 8 ? beste('vektor', z, x, y, 13, 8) : null,
    z >= 5 ? beste('utveg', z, x, y, 11, 5) : null,                       // jernbane og veger i nabolandene (OpenStreetMap)
    z >= 12 && valg.bygg ? beste('hus', z, x, y, 13, 12) : null,          // byggomriss (OpenStreetMap)
    KF.norgeBlokker && !hel ? beste('okart', z, x, y, 8, 0) : null, KF.norgeBlokker && !hel ? beste('ohoyde', z, x, y, 8, 0) : null]);
}
async function komponer(z, x, y, valg = KF.vis) {   // valg: hvilke kartlag (3D lager bakken uten skygge)
  const T = G.T, r = res(z), c = lerret(T, T), g = c.getContext('2d', { willReadFrequently: true });
  const minx = G.x0 + x * span(z), maxy = G.y0 - y * span(z);
  const VK = vektRutenett(minx, maxy, span(z)), hel = VK.every(v => v >= 1);   // hvor mye av Norge-kartet som skal med (1 = bare det)
  const feilFør = KF.feil;
  const [k, h, tr, v, uv, hs, ok, oh] = await flisData(z, x, y, valg, hel);
  const ufull = KF.feil !== feilFør;   // noe lot seg ikke hente mens flisen ble laget: den vises, men lages på nytt senere
  g.fillStyle = KF.norgeBlokker ? HAV_CSS : '#1a1710'; g.fillRect(0, 0, T, T);   // uten omland (Dovre-piloten): mørkt der data mangler
  let od = null, vann = null;   // omlandets farge under Norge-kartet; hvor mye av hvert punkt som er vann
  if (ok) { const sw = T / ok.f; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(ok.t.bm, ok.ix * sw, ok.iy * sw, sw, sw, 0, 0, T, T);
    od = g.getImageData(0, 0, T, T).data; if (!k) { g.fillStyle = HAV_CSS; g.fillRect(0, 0, T, T); g.drawImage(ok.t.bm, ok.ix * sw, ok.iy * sw, sw, sw, 0, 0, T, T); } }
  if (k && k.f <= 2) { const sw = T / k.f; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(k.t.bm, k.ix * sw, k.iy * sw, sw, sw, 0, 0, T, T); }
  else if (k) { // overzoom: hent hvert punkt fra en litt forskjøvet posisjon i kartflisen
    const im = g.createImageData(T, T), d = im.data, K = k.t, rk = res(k.zz), kx0 = G.x0 + (x >> Math.log2(k.f)) * span(k.zz), ky0 = G.y0 - (y >> Math.log2(k.f)) * span(k.zz);
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const X = minx + (px + .5) * r, Y = maxy - (py + .5) * r, [dx, dy] = vri(X, Y);
      const sx = Math.max(0, Math.min(K.w - 1.001, (X + dx - kx0) / rk - .5)), sy = Math.max(0, Math.min(K.h - 1.001, (ky0 - Y - dy) / rk - .5));
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, x1 = Math.min(K.w - 1, x0 + 1), y1 = Math.min(K.h - 1, y0 + 1), o = (py * T + px) * 4;
      for (let c = 0; c < 3; c++) d[o + c] = (K.d[(y0 * K.w + x0) * 4 + c] * (1 - fx) + K.d[(y0 * K.w + x1) * 4 + c] * fx) * (1 - fy) + (K.d[(y1 * K.w + x0) * 4 + c] * (1 - fx) + K.d[(y1 * K.w + x1) * 4 + c] * fx) * fy;
      d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  }
  { // Norge-kartet tones over i omlandet mot kanten av blokkene, og vann og hav blir blått
    const im = g.getImageData(0, 0, T, T), d = im.data, M = VK.n - 1, q = M / T; vann = new Float32Array(T * T);
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const o = (py * T + px) * 4; let r = d[o], gg = d[o + 1], b = d[o + 2];
      if (od) { let w = 1;
        if (!hel) { const fx = (px + .5) * q, fy = (py + .5) * q, i = Math.min(M - 1, fx | 0), j = Math.min(M - 1, fy | 0), a = fx - i, c = fy - j, n = VK.n;
          w = (VK[j * n + i] * (1 - a) + VK[j * n + i + 1] * a) * (1 - c) + (VK[(j + 1) * n + i] * (1 - a) + VK[(j + 1) * n + i + 1] * a) * c; }
        if (!k || r + gg + b < 75 && b - r < 8) w = 0;   // Norge-kartet mangler her (utenfor blokkene eller uten satellittdata)
        const L = Math.abs(od[o] - 22) + Math.abs(od[o + 1] - 30) + Math.abs(od[o + 2] - 38) < 16 ? 1 : OMLAND_LYS;   // vann dempes ikke
        r = r * w + od[o] * L * (1 - w); gg = gg * w + od[o + 1] * L * (1 - w); b = b * w + od[o + 2] * L * (1 - w); }
      else if (KF.norgeBlokker && r + gg + b < 75 && b - r < 8) { r = HAV[0]; gg = HAV[1]; b = HAV[2]; }   // ingen data og intet omland på /norge: hav
      const v = b - r < 6 ? 0 : Math.max(0, Math.min(1, (40 - Math.abs(r - 22) - Math.abs(gg - 30) - Math.abs(b - 38)) / 24));   // vannfargen i kartflisene (blåere enn rød; ikke den mørke bakgrunnen)
      d[o] = r + (HAV[0] - r) * v; d[o + 1] = gg + (HAV[1] - gg) * v; d[o + 2] = b + (HAV[2] - b) * v; vann[py * T + px] = v;
    }
    g.putImageData(im, 0, 0);
  }
  // høyde på skjermflisens rutenett, med 1 px kant: E[(py+1)*258 + px+1]
  let E = null; const N = T + 2;
  const hh = h || oh;   // utenfor Norge: bare omlandets høyde
  if (hh) {
    E = new Float32Array(N * N); const GX = new Float32Array(N * N), GY = new Float32Array(N * N);
    if (!h) fyllHoyde(oh, E, GX, GY, N, false);
    else { const H = h.t, W = H.w;
    const bil = (A, i, fx, fy) => (A[i] * (1 - fx) + A[i + 1] * fx) * (1 - fy) + (A[i + W] * (1 - fx) + A[i + W + 1] * fx) * fy;
    for (let py = -1; py <= T; py++) for (let px = -1; px <= T; px++) {
      const sx = (h.ix * T + px + .5) / h.f - .5 + 1, sy = (h.iy * T + py + .5) / h.f - .5 + 1;
      const x0 = Math.max(0, Math.min(W - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(H.h - 2, Math.floor(sy))), fx = sx - x0, fy = sy - y0, i = y0 * W + x0, j = (py + 1) * N + px + 1;
      E[j] = bil(H.a, i, fx, fy); GX[j] = bil(H.gx, i, fx, fy); GY[j] = bil(H.gy, i, fx, fy);
    }
    if (oh) fyllHoyde(oh, E, GX, GY, N, true); }
    if (valg.skygge) {
      const im = g.getImageData(0, 0, T, T), d = im.data, ve = z <= 8 ? 2 : z <= 10 ? 1.5 : 1.2;
      const Lx = -.5417, Ly = .5417, Lz = .6428; // lys fra nordvest, 40° over horisonten
      for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
        const i = (py + 1) * N + px + 1, gx = GX[i] * ve, gy = GY[i] * ve;
        if (gx !== gx || gy !== gy) continue;
        const n = Math.hypot(gx, gy, 1), s = Math.max(0, (-gx * Lx + gy * Ly + Lz) / n) / Lz, o = (py * T + px) * 4, wv = vann[py * T + px];
        const f = (.3 + .7 * Math.min(1.35, s)) * (1 - wv) + wv;   // vannflaten er flat: ingen skygge på innsjøer og hav
        d[o] = Math.min(255, d[o] * f); d[o + 1] = Math.min(255, d[o + 1] * f); d[o + 2] = Math.min(255, d[o + 2] * f);
      }
      g.putImageData(im, 0, 0);
    }
    if (valg.koter) koter(g, E, N, z);
  }
  if (tr && valg.traer) traer(g, z, x, y, tr, E, N, hel ? null : VK);
  let veger = null;
  const flisP = t => { const s = T * t.f / 4096, ox = t.ix * T, oy = t.iy * T; return ([a, b]) => [a * s - ox, b * s - oy]; };
  const P = v ? flisP(v) : null;
  if (v) veger = (v.t.veg ? v.t.veg.obj : []).map(o => ({ k: o.e.k, deler: o.deler.map(d => d.map(P)) }));
  if (hs && hs.t.anlegg) anlegg(g, z, hs);   // fotballbaner, ballbaner, løpebaner, lekeplasser, parkering (under vegene og husene)
  // veger i nabolandene og Norges hovedveger når man zoomer ut (OpenStreetMap); i Norge fra z8 brukes NVDB (n = 1 hoppes over)
  const uP = uv ? flisP(uv) : null, uveger = uv && uv.t.veg ? uv.t.veg.obj.filter(o => !(z >= 8 && o.e.n)).map(o => ({ k: o.e.k, deler: o.deler.map(d => d.map(uP)) })) : [];
  const alle = (veger || []).concat(uveger);
  if (valg.veg && alle.length && z >= 14) vegerRealistisk(g, alle, r);   // nær: asfalt med oppmerking
  else if (valg.veg && alle.length) {
    g.lineCap = g.lineJoin = 'round'; const tynn = z < 8 ? .6 : 1;   // utzoomet: tynnere streker
    for (const pass of [0, 1]) for (const kat of VEGREKKE) {
      if (z < 11 && (kat === 'P' || kat === 'S')) continue;   // småvegene ligger i flisene fra z10 for marsjrutene, men vises fra z11
      const [m, min, farge] = VEG[kat], w = Math.max(min * tynn, m / r);
      g.strokeStyle = pass ? farge : 'rgba(30,22,14,.85)'; g.lineWidth = pass ? w : w + Math.max(1.2 * tynn, w * .45);
      g.beginPath(); for (const o of alle) if (o.k === kat) for (const d of o.deler) { g.moveTo(d[0][0], d[0][1]); for (let i = 1; i < d.length; i++) g.lineTo(d[i][0], d[i][1]); }
      g.stroke();
    }
  }
  if (valg.bane && uv && uv.t.bane) {   // jernbane: mørk strek med lys stiplet kjerne, som på gamle kart
    const w = z <= 7 ? 1 : z <= 10 ? 1.5 : Math.max(1.8, 3 / r);
    g.lineCap = 'butt'; g.lineJoin = 'round';
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? '#d9cdb0' : 'rgba(20,15,9,.92)'; g.lineWidth = pass ? w : w + (z <= 7 ? 1.4 : 2.2);
      if (pass && z > 7) g.setLineDash([Math.max(4, 14 / r), Math.max(4, 14 / r)]);
      // spor i tunnel (u = 1 i nyere data) tegnes for seg under, fra z10; lenger ute er de med i streken så banen ikke får hull
      g.beginPath(); for (const o of uv.t.bane.obj) { if (o.e.u && z > 9) continue; for (const d of o.deler) { const q = d.map(uP); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); } }
      g.stroke(); g.setLineDash([]);
    }
    if (z > 9) { g.strokeStyle = 'rgba(20,15,9,.5)'; g.lineWidth = w; g.setLineDash([Math.max(3, 7 / r), Math.max(3, 7 / r)]);
      g.beginPath(); for (const o of uv.t.bane.obj) { if (!o.e.u) continue; for (const d of o.deler) { const q = d.map(uP); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); } }
      g.stroke(); g.setLineDash([]); }
  }
  if (v && valg.bygg && !hs && v.t.bygg && z >= 11) bygg(g, z, v.t.bygg.obj.map(o => ({ t: o.e.t, p: P(o.deler[0][0]) })), veger);
  if (hs && hs.t.hus) husomriss(g, z, hs);
  if (hs && hs.t.punkt && z >= 14) bensin(g, z, hs);   // bensinstasjonene: pumpemerke i kjedens farge
  return { c, E, ufull };
}

// ---------- anlegg (OpenStreetMap) ----------
// a: 1 fotballbane (gress med klipperstriper og oppmerking), 2 tennis, 3 annen ballbane, 4 løpebane, 5 lekeplass, 6 parkeringsplass
function anlegg(g, z, hs) {
  const T = G.T, r = res(z), s = T * hs.f / 4096, ox = hs.ix * T, oy = hs.iy * T, lw = Math.max(1, .12 / r);
  const FARGE = { 1: '#4d8a36', 2: '#3e6f86', 3: '#55585b', 4: '#a24a32', 5: '#c8b07e', 6: '#545350', 7: '#38393b', 8: '#444547', 9: '#4f5052' };
  g.save(); g.lineJoin = 'round';
  // oppstillingsplass under taksebane under rullebane; ballbaner og parkering først
  const REKKE = { 9: 1, 8: 2, 7: 3 }, liste = hs.t.anlegg.obj.slice().sort((p, q) => (REKKE[p.e.a] || 0) - (REKKE[q.e.a] || 0));
  for (const o of liste) { const a = o.e.a;
    for (const d of o.deler) { if (d.length < 4) continue;
      const P = []; for (let i = 0; i < d.length - 1; i++) P.push([d[i][0] * s - ox, d[i][1] * s - oy]);
      const sti = () => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); };
      sti(); g.fillStyle = FARGE[a] || '#666'; g.fill();
      if (a === 6 && z >= 15) { g.strokeStyle = 'rgba(230,228,220,.5)'; g.lineWidth = lw; g.stroke(); }
      if (a === 5 && z >= 15) { g.strokeStyle = 'rgba(90,70,40,.6)'; g.lineWidth = lw * 1.5; g.stroke(); }
      if ((a === 1 || a === 2 || a === 3) && z >= 14) {
        const f = form(P), L = f.lu * r, W = f.lv * r, m = (du, dv) => [f.sx + f.ux * du + f.vx * dv, f.sy + f.uy * du + f.vy * dv];
        const rekt = (u0, v0, u1, v1) => { const q = [m(u0, v0), m(u1, v0), m(u1, v1), m(u0, v1)]; g.beginPath(); g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); g.stroke(); };
        g.save(); sti(); g.clip();
        if (a === 1) {   // klipperstriper på tvers av banen
          g.fillStyle = 'rgba(255,255,255,.07)'; const n = 12; for (let k = 0; k < n; k += 2) { const u0 = -f.lu / 2 + f.lu * k / n, u1 = u0 + f.lu / n, q = [m(u0, -f.lv), m(u1, -f.lv), m(u1, f.lv), m(u0, f.lv)];
            g.beginPath(); g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); }
        }
        g.restore();
        if (z >= 15) {
          g.strokeStyle = 'rgba(245,245,240,.92)'; g.lineWidth = lw;
          const inn = 1.5 / r, hu = f.lu / 2 - inn, hv = f.lv / 2 - inn; rekt(-hu, -hv, hu, hv);
          if (a === 1) {
            // oppmerking skalert etter banens lengde (11er-bane 105 m; 7er og 5er mindre)
            const sk = Math.min(1, (L - 3) / 105), px = mtr => mtr * sk / r;
            g.beginPath(); g.moveTo(...m(0, -hv)); g.lineTo(...m(0, hv)); g.stroke();
            g.beginPath(); const c = m(0, 0); g.arc(c[0], c[1], px(9.15), 0, 6.283); g.stroke();
            for (const sd of [-1, 1]) {
              const ende = sd * hu, sb = Math.min(px(40.3) / 2, hv), mb = Math.min(px(18.3) / 2, hv);
              rekt(ende, -sb, ende - sd * px(16.5), sb); rekt(ende, -mb, ende - sd * px(5.5), mb);
              const ps = m(ende - sd * px(11), 0); g.fillStyle = 'rgba(245,245,240,.92)'; g.beginPath(); g.arc(ps[0], ps[1], Math.max(1, lw), 0, 6.283); g.fill();
            }
          } else if (a === 2) { g.beginPath(); g.moveTo(...m(0, -hv - inn * .6)); g.lineTo(...m(0, hv + inn * .6)); g.stroke(); rekt(-hu * .55, -hv * .75, hu * .55, hv * .75); }
          else { g.beginPath(); g.moveTo(...m(0, -hv)); g.lineTo(...m(0, hv)); g.stroke(); const c = m(0, 0); g.beginPath(); g.arc(c[0], c[1], 1.8 / r, 0, 6.283); g.stroke(); }
        }
      }
      if (a === 7 && z >= 13) rullebane(g, P, o.e.r, r, z);
      if (a === 8 && z >= 15) { const f = form(P); if (f.rekt > .8 && f.lu > f.lv * 3) {   // taksebane: gul midtlinje
        g.strokeStyle = 'rgba(232,190,40,.9)'; g.lineWidth = Math.max(1, .2 / r); g.beginPath(); g.moveTo(f.sx - f.ux * f.lu / 2, f.sy - f.uy * f.lu / 2); g.lineTo(f.sx + f.ux * f.lu / 2, f.sy + f.uy * f.lu / 2); g.stroke(); } }
      if (a === 4 && z >= 15) {   // løpebane: hvite banelinjer langs kanten
        g.strokeStyle = 'rgba(245,240,235,.75)'; g.lineWidth = lw; sti(); g.stroke();
      }
    }
  }
  g.restore();
}

// Rullebane med oppmerking etter ICAO: kantlinjer, stiplet midtlinje, terskelstriper («pianotangenter»), banenummer i hver ende
// (lest av den som lander: «01» ved sørenden for fly som lander mot nord), landingssone-merker og siktepunkt. P i piksler, r meter per piksel.
function rullebane(g, P, ref, r, z) {
  const f = form(P); if (f.lu < f.lv * 3) return;
  const L = f.lu, W = f.lv, m = (du, dv) => [f.sx + f.ux * du + f.vx * dv, f.sy + f.uy * du + f.vy * dv], px = x => x / r;
  const felt = (u0, u1, v0, v1) => { const q = [m(u0, v0), m(u1, v0), m(u1, v1), m(u0, v1)]; g.beginPath(); g.moveTo(...q[0]); for (const p of q.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
  g.fillStyle = 'rgba(240,240,236,.92)';
  const hu = L / 2, hv = W / 2, lw = px(.9);
  if (lw < .35) return;
  felt(-hu + px(3), hu - px(3), hv - px(1.5) - lw, hv - px(1.5)); felt(-hu + px(3), hu - px(3), -hv + px(1.5), -hv + px(1.5) + lw);   // kantlinjene
  for (let u = -hu + px(90); u < hu - px(90); u += px(50)) felt(u, Math.min(u + px(30), hu - px(90)), -lw / 2, lw / 2);              // midtlinjen: 30 m strek, 20 m mellomrom
  const nr = String(ref || '').split('/').map(t => t.trim()).filter(Boolean), kurs = (Math.atan2(f.ux, -f.uy) * 180 / Math.PI + 360) % 360;
  for (const sd of [-1, 1]) {
    // enden ved -u er terskelen for fly som lander i +u-retning (kursen «kurs»); ved +u motsatt
    const ende = sd * hu, inn = -sd, k = sd < 0 ? kurs : (kurs + 180) % 360;
    const n = Math.max(4, Math.min(16, Math.round(W * r / 3.6))), bredde = (W - px(6)) / (2 * n);
    for (let j = 0; j < n; j++) { const v = -hv + px(3) + (2 * j + .5) * bredde; felt(ende + inn * px(6), ende + inn * px(36), v, v + bredde); }   // terskelstriper 30 m
    for (const [a1, a2, v0, v1] of [[150, 172.5, .18, .3], [300, 345, .2, .36], [450, 472.5, .18, .3]]) if (a2 * 2 < L * r) {   // landingssone og siktepunkt
      for (const s2 of [-1, 1]) felt(ende + inn * px(a1), ende + inn * px(a2), s2 * hv * v0, s2 * hv * v1); }
    // banenummeret: nærmest kursen (01–36), skrevet slik at det leses av den som lander
    let tekst = null; for (const t of nr) { const tall = parseInt(t, 10); if (tall >= 1 && tall <= 36 && Math.abs(((tall * 10 - k + 540) % 360) - 180) < 40) tekst = t; }
    if (!tekst || px(18) < 6) continue;
    const [tx, ty] = m(ende + inn * px(48), 0), hgt = px(18);
    g.save(); g.translate(tx, ty); g.rotate(Math.atan2(f.ux * inn, -f.uy * inn)); g.font = `bold ${hgt}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tekst, 0, 0); g.restore();
  }
}

// Bensinstasjon i kartet: firkant i kjedens farge (ellers mørk) med en hvit bensinpumpe
function bensin(g, z, hs) {
  const T = G.T, s = T * hs.f / 4096, ox = hs.ix * T, oy = hs.iy * T, r = z >= 16 ? 11 : z >= 15 ? 8 : 6;
  for (const o of hs.t.punkt.obj) { if (o.e.p !== 1 || !o.deler[0]) continue;
    const [x, y] = [o.deler[0][0][0] * s - ox, o.deler[0][0][1] * s - oy], kj = o.e.k && BUTIKKER[o.e.k];
    if (x < -20 || y < -20 || x > T + 20 || y > T + 20) continue;
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-r + 1.5, -r + 1.5, 2 * r, 2 * r);
    g.fillStyle = kj ? kj[1] : '#3b3f45'; g.fillRect(-r, -r, 2 * r, 2 * r); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.strokeRect(-r, -r, 2 * r, 2 * r);
    const f = kj ? kj[2] : '#f2efe6'; g.fillStyle = f; g.strokeStyle = f; g.lineWidth = Math.max(1, r * .12);
    g.fillRect(-r * .55, -r * .6, r * .7, r * 1.2); g.fillStyle = kj ? kj[1] : '#3b3f45'; g.fillRect(-r * .42, -r * .45, r * .44, r * .35);
    g.beginPath(); g.moveTo(r * .15, -r * .3); g.lineTo(r * .5, -r * .1); g.lineTo(r * .5, r * .45); g.stroke();
    if (z >= 16 && kj) { g.font = `bold ${r * .9}px sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(kj[0], 1, r * 2.1 + 1); g.fillStyle = '#f5f1e6'; g.fillText(kj[0], 0, r * 2.1); }
    g.restore(); }
}

// ---------- hus ----------
// Farger etter type (0 bolig, 1 garasje/uthus, 2 næring, 3 offentlig, 4 landbruk, 5 annet), valgt fast per bygg (frø = byggets
// nummer i), så hvert hus ser likt ut hver gang og hos alle. Tak: teglrødt, svart/grå skifer, brunt; låver med rødt tak.
// Vegger (3D): hvitt, rødt, okergult og grått panel, som i Norge.
const TAKFARGER = [['#5a3a30', '#3e3b38', '#6c4535', '#4a4b48', '#5f4a3c', '#723f31', '#35383a'], ['#4d4a45', '#5a4436', '#3f4a3e', '#55524c'],
  ['#6b6a66', '#62615c', '#78766e', '#6d6a63'], ['#64625d', '#6a5040', '#5b5a55', '#56604f'],   // flate tak: varme grånyanser (blåaktig ligner vann)
  ['#7a3a2c', '#5c4a38', '#474845', '#83402f'], ['#5e564c', '#4f4c47'],
  // 6 industri/lager (blikk), 7 butikk, 8 kirke (skifer), 9 skole, 10 leilighetsbygg, 11 hytte (torv/svart)
  ['#5f6366', '#4d5458', '#6b6f70', '#56605f'], ['#5b5a56', '#66645e', '#4f5052'], ['#3a3836', '#45403b'], ['#6a5040', '#5b5a55', '#4f4c48'],
  ['#5a5853', '#6a5040', '#4a4b48', '#3e3b38'], ['#3d4a3a', '#4a3a2e', '#2f2f2c'],
  // 12 lager, 13 sykehus, 14 flyplass
  ['#6e7276', '#5c6266', '#7a7c78'], ['#8a8a86', '#9a9890'], ['#6a6e72', '#7c8086']];
const VEGGFARGER = [['#d8d0bf', '#8e3d2e', '#cfae66', '#7f847c', '#e6e0d2', '#5f6f74', '#d9d3c4'], ['#8e3d2e', '#a99f8d', '#6e6658', '#c8c0ae'],
  ['#9a9890', '#7c8084', '#b3aea2'], ['#b9b2a3', '#8a8478', '#a24a35'], ['#8e3d2e', '#8a3a2a', '#a8a090'], ['#9b9488', '#857e72'],
  ['#9aa3a8', '#7e8a91', '#b8b6ad', '#5d6d78', '#8f3a2c'], ['#c9c2b3', '#a8a39a', '#d6cfbf'], ['#ece6d8', '#e2dccb'], ['#c9a46a', '#b9b2a3', '#a24a35', '#d6cfbf'],
  ['#d6cfbf', '#bda88a', '#9aa0a0', '#c9b28a', '#a24a35'], ['#5a3e2a', '#6b4a30', '#8e3d2e', '#4a3826'],
  ['#b4b8ba', '#8d969c', '#c2b9a6', '#6f7d86'], ['#ecebe6', '#e2e4e2'], ['#c8ccd0', '#aeb6bc']];
const TAK = TAKFARGER.map(p => p[0]);   // (eldre navn)
const takFarge = (t, i) => { const p = TAKFARGER[t] || TAKFARGER[5]; return p[Math.floor(hash(i | 0, 7, 3) * p.length)]; };
const veggFarge = (t, i) => { const p = VEGGFARGER[t] || VEGGFARGER[5]; return p[Math.floor(hash(i | 0, 9, 5) * p.length)]; };
function nyanse(hex, f) { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return `rgb(${c})`; }
// Saltak for små og mellomstore bygg av «hus-typene»; flatt tak for store næringsbygg og offentlige bygg.
const saltak = (t, areal) => t === 0 || t === 1 || t === 4 || t === 11 ? areal < 1500 : t === 8 ? areal < 900 : t === 10 ? areal < 400 : t === 9 ? areal < 300 : t === 3 ? areal < 250 : t === 5 ? areal < 300 : false;
// Tak med fall eller flatt tak (brukeren 11. nov: «for mange hus fikk flatt tak, blant annet låver»; «kirker har nesten aldri flatt tak»).
// tett = antall bygg innen 100 m: på landet (få naboer) er saltak mye vanligere enn i sentrum. Industri, lager, sykehus og flyplass er flate.
// Fast per bygg (frø = byggets nummer), så taket er det samme hver gang, i 2D og 3D.
function harFall(t, areal, h, i, tett) {
  if (t === 6 || t === 12 || t === 13 || t === 14) return false;
  let c;
  if (t === 8) c = areal < 3000 ? .9 : .5;
  else if (t === 2) c = h > 12 || areal > 1500 ? 0 : .45;
  else if (t === 10) c = areal < 400 ? .8 : h > 13 ? .05 : .25;
  else { c = areal < 300 ? .97 : areal < 800 ? .85 : areal < 2000 ? .55 : .2; if (t === 4 && areal < 3500) c = Math.max(c, .93); }
  if (c > 0 && c < 1 && t !== 8) c = tett < 6 ? 1 - (1 - c) * .2 : tett < 15 ? 1 - (1 - c) * .5 : tett > 40 ? c * .75 : c;
  return hash(i, 7, 3) < c;
}
// Antall bygg innen R meter for hvert senter ([x, y] i meter), med et rutenett så det går fort.
function naboer(sentre, R = 100) {
  const rut = new Map(), k = (x, y) => Math.floor(x / R) + ',' + Math.floor(y / R);
  sentre.forEach(([x, y], j) => { const n = k(x, y); if (!rut.has(n)) rut.set(n, []); rut.get(n).push(j); });
  return sentre.map(([x, y]) => { let n = 0; const ci = Math.floor(x / R), cj = Math.floor(y / R);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const j of rut.get((ci + di) + ',' + (cj + dj)) || []) { const q = sentre[j]; if (Math.hypot(q[0] - x, q[1] - y) < R) n++; }
    return n - 1; });
}
// Helt rundt bygg: mange hjørner, like langt som bredt, og arealet nær en sirkel (4πA/O² > 0,85).
function rund(P, f) {
  if (P.length < 8 || f.lu > f.lv * 1.25) return false;
  let O = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; O += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  return 4 * Math.PI * f.areal / (O * O) > .85;
}
// Takflatene for et bygg med fall som ikke er et enkelt rektangel:
// - vinkelrette omriss (L, T, U, Z …) deles i rektangler, hvert med eget saltak (som kryssark og tilbygg på ekte hus)
// - andre omriss får valmtak: hver vegg får en takflate opp mot mønet langs hovedretningen
// Gir { rekt: [{ sx, sy, ux, uy, vx, vy, lu, lv }] } eller { valm: { a: [x, y], b: [x, y] } } (mønet), i samme enheter som P,
// eller null når ingen av delene passer (da får bygget flatt tak).
function takDeler(P, f) {
  const Q = P.map(([x, y]) => [x * f.ux + y * f.uy, x * f.vx + y * f.vy]);
  let ok = Q.length <= 24; const ret = [];
  for (let i = 0; i < Q.length && ok; i++) { const a = Q[i], b = Q[(i + 1) % Q.length], du = Math.abs(b[0] - a[0]), dv = Math.abs(b[1] - a[1]);
    const v = Math.atan2(Math.min(du, dv), Math.max(du, dv)); if (v > .2 && Math.hypot(du, dv) > .02 * (f.lu + f.lv)) ok = false; ret.push(du >= dv ? 'H' : 'V'); }
  if (ok) {
    // slå sammen hjørner der to kanter går samme vei, så kantene veksler H, V, H, V …
    let V = Q.map((q, i) => ({ q, inn: ret[(i - 1 + Q.length) % Q.length], ut: ret[i] })).filter(p => p.inn !== p.ut);
    if (V.length >= 4 && V.length % 2 === 0) {
      // hjørnene rettes opp: u fra den loddrette kanten, v fra den vannrette
      const n = V.length, R = [];
      for (let i = 0; i < n; i++) { const p = V[i], q = V[(i + 1) % n];
        if (p.ut === 'H') { const v = (p.q[1] + q.q[1]) / 2; p.v = v; q.v = v; } else { const u = (p.q[0] + q.q[0]) / 2; p.u = u; q.u = u; } }
      const H = []; for (let i = 0; i < n; i++) { const p = V[i], q = V[(i + 1) % n]; if (p.ut === 'H') H.push([Math.min(p.u, q.u), Math.max(p.u, q.u), p.v]); }
      const Vk = []; for (let i = 0; i < n; i++) { const p = V[i], q = V[(i + 1) % n]; if (p.ut === 'V') Vk.push([Math.min(p.v, q.v), Math.max(p.v, q.v), p.u]); }
      // skiver langs én akse: intervallene på tvers i hver skive, like naboskiver slås sammen til ett rektangel
      const tol = (f.lu + f.lv) * .003;
      const skiver = (kant, akse) => { const xs = [], ut = []; let åpne = [];
        for (const x of kant.flatMap(e => [e[0], e[1]]).sort((a, b) => a - b)) if (!xs.length || x - xs[xs.length - 1] > tol) xs.push(x);   // like verdier (avrunding) slås sammen
        for (let k = 0; k < xs.length - 1; k++) { const m = (xs[k] + xs[k + 1]) / 2, ys = kant.filter(e => e[0] < m && m < e[1]).map(e => e[2]).sort((a, b) => a - b), iv = [];
          for (let j = 0; j + 1 < ys.length; j += 2) iv.push([ys[j], ys[j + 1]]);
          const nye = [];
          for (const [a, b] of iv) { const o = åpne.find(o => Math.abs(o.a - a) < tol && Math.abs(o.b - b) < tol); if (o) { o.x1 = xs[k + 1]; nye.push(o); } else nye.push({ a, b, x0: xs[k], x1: xs[k + 1] }); }
          for (const o of åpne) if (!nye.includes(o)) ut.push(o); åpne = nye; }
        ut.push(...åpne); return ut.map(o => akse === 'u' ? [o.x0, o.x1, o.a, o.b] : [o.a, o.b, o.x0, o.x1]); };
      const ok2 = r => r[1] - r[0] > tol && r[3] - r[2] > tol, A = skiver(H, 'u').filter(ok2), B = skiver(Vk, 'v').filter(ok2), valgt = A.length <= B.length ? A : B;
      if (valgt.length && valgt.length <= 6) return { rekt: valgt.map(([u0, u1, v0, v1]) => { const lu = u1 - u0, lv = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, lang = lu >= lv;
        return { sx: cu * f.ux + cv * f.vx, sy: cu * f.uy + cv * f.vy, ux: lang ? f.ux : f.vx, uy: lang ? f.uy : f.vy, vx: lang ? f.vx : -f.ux, vy: lang ? f.vy : -f.uy, lu: Math.max(lu, lv), lv: Math.min(lu, lv) }; }) };
    }
  }
  // valmtak bare på omriss som er nesten konvekse og ikke for store (ellers blir det et stjernetak): ellers null = flatt tak
  const Hl = [...P].sort((a, b) => a[0] - b[0] || a[1] - b[1]), kr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const p of Hl) { while (lo.length > 1 && kr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = Hl.length - 1; i >= 0; i--) { const p = Hl[i]; while (hi.length > 1 && kr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const skall = lo.slice(0, -1).concat(hi.slice(0, -1)); let ha = 0; for (let i = 0; i < skall.length; i++) { const a = skall[i], b = skall[(i + 1) % skall.length]; ha += a[0] * b[1] - b[0] * a[1]; }
  if (f.areal / (Math.abs(ha) / 2 || 1) < .88 || P.length > 16) return null;
  const hv = f.lv / 2, m = Math.max(0, f.lu / 2 - hv);
  return { valm: { a: [f.sx - f.ux * m, f.sy - f.uy * m], b: [f.sx + f.ux * m, f.sy + f.uy * m] } };
}
// Hovedretning (lengste kant), sentrum og mål langs (lu) og på tvers (lv) av omrisset, og hvor rektangulært det er (0–1).
function form(P) {
  let best = 0, ux = 1, uy = 0, areal = 0;
  for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], l = Math.hypot(bx - ax, by - ay);
    areal += ax * by - bx * ay; if (l > best) { best = l; ux = (bx - ax) / l; uy = (by - ay) / l; } }
  const vx = -uy, vy = ux; let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of P) { const u = x * ux + y * uy, v = x * vx + y * vy; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const lu = u1 - u0, lv = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; areal = Math.abs(areal) / 2;
  return { ux, uy, vx, vy, lu, lv, cu, cv, areal, rekt: lu * lv > 0 ? areal / (lu * lv) : 0, sx: cu * ux + cv * vx, sy: cu * uy + cv * vy };
}
// Byggomriss sett ovenfra: skygge mot sørøst (lys fra nordvest, lengre jo høyere), saltak med lys og skyggeside og møne,
// flate tak med brystning og noen takhus på de største.
function husomriss(g, z, hs) {
  const T = G.T, r = res(z), s = T * hs.f / 4096, ox = hs.ix * T, oy = hs.iy * T, liste = hs.t.hus.obj;
  const pkt = o => { const d = o.deler[0], P = []; for (let i = 0; i < d.length - 1; i++) P.push([d[i][0] * s - ox, d[i][1] * s - oy]); return P; };
  const sti = (P, dx = 0, dy = 0) => { g.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0] + dx, P[i][1] + dy); g.closePath(); };
  const hus = []; for (const o of liste) { if (!o.deler[0] || o.deler[0].length < 4) continue; const P = pkt(o); hus.push({ o, P, f: form(P) }); }
  g.fillStyle = 'rgba(6,5,3,.38)';
  for (const { o, P } of hus) { const d = Math.min(14, (o.e.h || 6) / r * .45); g.beginPath(); sti(P, d, d); g.fill(); }
  const Lx = -Math.SQRT1_2, Ly = -Math.SQRT1_2, detalj = z >= 14;
  // naboer innen 100 m (på landet får flere bygg tak med fall) og industri innen 150 m (runde bygg der er tanker)
  const tett = naboer(hus.map(h => [h.f.sx * r, h.f.sy * r])), ind = hus.filter(h => h.o.e.t === 6 || h.o.e.t === 12).map(h => [h.f.sx * r, h.f.sy * r]);
  g.lineJoin = 'round';
  hus.forEach((h, n) => { h.tett = tett[n]; });
  for (const { o, P, f, tett } of hus) {
    const t = o.e.t, i = o.e.i, base = takFarge(t, i), arealM2 = f.areal * r * r, rundt = rund(P, f);
    const fall0 = detalj && !rundt && f.lv * r > 3 && harFall(t, arealM2, o.e.h || 6, i, tett), enkel = f.rekt > .9 && P.length <= 6;
    const d = fall0 && !enkel ? takDeler(P, f) : null, fall = fall0 && (enkel || !!d);
    if (rundt && detalj) {
      // rundt bygg sett ovenfra: tank (nær industri) i lyst blikk med ring, ellers hvitt med mørk kant (silo, fyr)
      const tank = ind.some(q => Math.hypot(q[0] - f.sx * r, q[1] - f.sy * r) < 150);
      g.fillStyle = tank ? '#c9cbc8' : '#e6e2d8'; g.beginPath(); sti(P); g.fill();
      g.strokeStyle = tank ? 'rgba(90,92,95,.8)' : 'rgba(160,40,30,.7)'; g.lineWidth = Math.max(1, .5 / r);
      g.beginPath(); g.arc(f.sx, f.sy, Math.min(f.lu, f.lv) * .3, 0, 6.283); g.stroke();
    } else if (fall && !enkel) {
      // tak med fall på et omriss som ikke er et rektangel: rektangler med eget saltak, eller valmtak opp mot mønet
      g.fillStyle = nyanse(base, .82); g.beginPath(); sti(P); g.fill();
      if (d.rekt) for (const q of d.rekt) {
        const hu = q.lu / 2, hv = q.lv / 2, p = (du, dv) => [q.sx + q.ux * du + q.vx * dv, q.sy + q.uy * du + q.vy * dv], lys = (q.vx * Lx + q.vy * Ly) > 0 ? 1 : -1;
        for (const sd of [1, -1]) { const a = p(-hu, 0), b = p(hu, 0), c = p(hu, sd * hv), e = p(-hu, sd * hv);
          g.fillStyle = nyanse(base, sd === lys ? 1.16 : .82); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...e); g.closePath(); g.fill(); }
        g.strokeStyle = nyanse(base, 1.45); g.lineWidth = Math.max(.6, .25 / r); g.beginPath(); g.moveTo(...p(-hu, 0)); g.lineTo(...p(hu, 0)); g.stroke();
      } else {
        const [ax, ay] = d.valm.a, [bx, by] = d.valm.b, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        const R = ([x, y]) => { const k = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; return [ax + dx * k, ay + dy * k]; };
        for (let j = 0; j < P.length; j++) { const a = P[j], b = P[(j + 1) % P.length], ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
          const nx = ey / el, ny = -ex / el, mot = -(nx * Lx + ny * Ly);   // vegg med normal mot lyset: lys takflate
          g.fillStyle = nyanse(base, .9 + .26 * mot); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...R(b)); g.lineTo(...R(a)); g.closePath(); g.fill(); }
        g.strokeStyle = nyanse(base, 1.45); g.lineWidth = Math.max(.6, .25 / r); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      }
    } else if (fall) {   // saltak: mønet langs lengste side, gjennom midten
      const lys = (f.vx * Lx + f.vy * Ly) > 0 ? 1 : -1, R = f.lu + f.lv;
      g.fillStyle = nyanse(base, .82); g.beginPath(); sti(P); g.fill();
      g.save(); g.beginPath(); sti(P); g.clip();
      g.fillStyle = nyanse(base, 1.16); g.beginPath();   // halvdelen som vender mot lyset
      const ax = f.sx - f.ux * R, ay = f.sy - f.uy * R, bx = f.sx + f.ux * R, by = f.sy + f.uy * R;
      g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(bx + f.vx * R * lys, by + f.vy * R * lys); g.lineTo(ax + f.vx * R * lys, ay + f.vy * R * lys); g.closePath(); g.fill();
      g.restore();
      const m = f.lu / 2 - Math.min(f.lv * .25, f.lu * .2);   // mønet (litt kortere enn huset, som et valmet tak på korte hus)
      g.strokeStyle = nyanse(base, 1.45); g.lineWidth = Math.max(.6, .25 / r);
      g.beginPath(); g.moveTo(f.sx - f.ux * m, f.sy - f.uy * m); g.lineTo(f.sx + f.ux * m, f.sy + f.uy * m); g.stroke();
    } else {   // flatt tak
      g.fillStyle = detalj ? nyanse(base, 1.04) : base; g.beginPath(); sti(P); g.fill();
      if (detalj && arealM2 > 120) {   // brystning langs kanten
        g.save(); g.beginPath(); sti(P); g.clip(); g.strokeStyle = nyanse(base, .72); g.lineWidth = Math.max(1.2, 1.2 / r); g.stroke(); g.restore();
        if (arealM2 > 600 && z >= 15) {   // takhus og ventilasjon på de største
          const n = 1 + Math.floor(hash(i, 4, 1) * 3);
          for (let k = 0; k < n; k++) { const du = (hash(i, k, 11) - .5) * f.lu * .5, dv = (hash(i, k, 12) - .5) * f.lv * .5, a = Math.max(2, 3 / r), b = Math.max(2, 2 / r);
            const cx = f.sx + f.ux * du + f.vx * dv, cy = f.sy + f.uy * du + f.vy * dv;
            g.save(); g.translate(cx, cy); g.rotate(Math.atan2(f.uy, f.ux)); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-a / 2 + 1, -b / 2 + 1, a, b);
            g.fillStyle = nyanse(base, 1.25); g.fillRect(-a / 2, -b / 2, a, b); g.restore(); }
        }
      }
    }
    g.strokeStyle = 'rgba(18,13,8,.75)'; g.lineWidth = z >= 15 ? 1 : .6; g.beginPath(); sti(P); g.stroke();
    if (z >= 15 && arealM2 > 80) byggmerke(g, t, f.sx, f.sy, Math.max(5, Math.min(12, Math.sqrt(f.areal) * .22)), o.e.k, z);
  }
}
// Kjennetegn på taket når man er nær: kirke (kors), sykehus (rødt kors), flyplass (fly), skole (bok), butikk (handlepose), industri/lager (tannhjul)
function byggmerke(g, t, x, y, r, k, z) {
  const kj = k && BUTIKKER[k];
  if (kj) {
    // kjedebutikk: skilt i kjedens farger med navnet (nær), ellers en prikk med forbokstaven
    g.save(); g.translate(x, y); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (z >= 16) { const fs = Math.max(9, r * 1.1); g.font = `bold ${fs}px sans-serif`; const w = g.measureText(kj[0]).width + fs * .8, hh = fs * 1.5;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w / 2 + 1.5, -hh / 2 + 1.5, w, hh); g.fillStyle = kj[1]; g.fillRect(-w / 2, -hh / 2, w, hh);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.strokeRect(-w / 2, -hh / 2, w, hh); g.fillStyle = kj[2]; g.fillText(kj[0], 0, fs * .05); }
    else { g.fillStyle = kj[1]; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = kj[2]; g.font = `bold ${r * 1.15}px sans-serif`; g.fillText(kj[0][0], 0, r * .05); }
    g.restore(); return;
  }
  if (![6, 7, 8, 9, 12, 13, 14].includes(t)) return;
  g.save(); g.translate(x, y); g.fillStyle = 'rgba(20,16,10,.55)'; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill();
  g.strokeStyle = g.fillStyle = '#f1ead9'; g.lineWidth = Math.max(1.2, r * .18); g.lineCap = 'round';
  if (t === 8) { g.beginPath(); g.moveTo(0, -r * .65); g.lineTo(0, r * .65); g.moveTo(-r * .38, -r * .2); g.lineTo(r * .38, -r * .2); g.stroke(); }
  else if (t === 13) { g.fillStyle = '#d32a2a'; g.fillRect(-r * .18, -r * .6, r * .36, r * 1.2); g.fillRect(-r * .6, -r * .18, r * 1.2, r * .36); }
  else if (t === 14) { g.beginPath(); g.moveTo(0, -r * .7); g.lineTo(0, r * .6); g.moveTo(-r * .65, 0); g.lineTo(0, -r * .2); g.lineTo(r * .65, 0); g.moveTo(-r * .3, r * .55); g.lineTo(r * .3, r * .55); g.stroke(); }
  else if (t === 9) { g.strokeRect(-r * .55, -r * .4, r * 1.1, r * .8); g.beginPath(); g.moveTo(0, -r * .4); g.lineTo(0, r * .4); g.stroke(); }
  else if (t === 7) { g.strokeRect(-r * .45, -r * .2, r * .9, r * .7); g.beginPath(); g.arc(0, -r * .2, r * .25, Math.PI, 0); g.stroke(); }
  else { g.beginPath(); g.arc(0, 0, r * .35, 0, 6.283); g.stroke(); for (let k = 0; k < 6; k++) { const v = k * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(v) * r * .4, Math.sin(v) * r * .4); g.lineTo(Math.cos(v) * r * .62, Math.sin(v) * r * .62); g.stroke(); } }
  g.restore();
}

function koter(g, E, N, z) {
  const iv = z <= 8 ? 100 : z === 9 ? 50 : z <= 11 ? 20 : z === 12 ? 10 : 5, tykk = iv * 5;
  const seg = [[], []];
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const a = E[j * N + i], b = E[j * N + i + 1], c = E[(j + 1) * N + i + 1], d = E[(j + 1) * N + i];
    if (a !== a || b !== b || c !== c || d !== d) continue;
    const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
    for (let L = Math.ceil(lo / iv) * iv; L < hi; L += iv) {
      const kryss = [], X = i - 1, Y = j - 1;  // pikselsenter-koordinater
      const kant = (v1, v2, x1, y1, x2, y2) => { if ((v1 < L) !== (v2 < L)) { const t = (L - v1) / (v2 - v1); kryss.push([x1 + (x2 - x1) * t + .5, y1 + (y2 - y1) * t + .5]); } };
      kant(a, b, X, Y, X + 1, Y); kant(b, c, X + 1, Y, X + 1, Y + 1); kant(c, d, X + 1, Y + 1, X, Y + 1); kant(d, a, X, Y + 1, X, Y);
      const s = seg[L % tykk === 0 ? 1 : 0];
      for (let q = 0; q + 1 < kryss.length; q += 2) s.push(kryss[q], kryss[q + 1]);
    }
  }
  [[.6, 'rgba(58,40,22,.38)'], [1.1, 'rgba(58,40,22,.6)']].forEach(([w, farge], t) => {
    g.lineWidth = w; g.strokeStyle = farge; g.beginPath();
    const s = seg[t]; for (let q = 0; q < s.length; q += 2) { g.moveTo(s[q][0], s[q][1]); g.lineTo(s[q + 1][0], s[q + 1][1]); }
    g.stroke();
  });
}

// Trær på et fast 5 m-gitter i verden: samme tre på samme sted på alle zoomnivåer og hos alle spillere.
function traer(g, z, x, y, tr, E, N, VK) {
  const T = G.T, r = res(z), S = 5, minx = G.x0 + x * span(z), maxy = G.y0 - y * span(z);
  const zt = tr.zz, rt = res(zt), tx0 = G.x0 + (x >> (z - zt)) * span(zt), ty0 = G.y0 - (y >> (z - zt)) * span(zt), A = tr.t.a;
  const klasse = (X, Y) => { const px = Math.floor((X - tx0) / rt), py = Math.floor((ty0 - Y) / rt);
    return A[Math.max(0, Math.min(T - 1, py)) * T + Math.max(0, Math.min(T - 1, px))]; };
  const i0 = Math.floor((minx - 6) / S), i1 = Math.ceil((minx + span(z) + 6) / S), j0 = Math.floor((maxy - span(z) - 6) / S), j1 = Math.ceil((maxy + 6) / S);
  const SANNS = { 1: .62, 2: .05, 5: .015, 6: .04, 7: .03 }, liten = z <= 12;
  const skygge = [], kroner = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const X = (i + hash(i, j, 1)) * S, Y = (j + hash(i, j, 2)) * S;
    const [dx, dy] = vri(X, Y), k = klasse(X + dx + (hash(i, j, 9) - .5) * 8, Y + dy + (hash(i, j, 10) - .5) * 8);
    let p = SANNS[k] || 0; if (VK) p *= vektVed(VK, (X - minx) / span(z), (maxy - Y) / span(z)); if (!p || hash(i, j, 3) >= p) continue;
    const px = (X - minx) / r, py = (maxy - Y) / r;
    if (px < -12 || py < -12 || px > T + 12 || py > T + 12) continue;
    let hoy = 0; if (E) { const ix = Math.max(0, Math.min(N - 1, Math.round(px) + 1)), iy = Math.max(0, Math.min(N - 1, Math.round(py) + 1)); hoy = E[iy * N + ix]; }
    const bjork = k !== 1 || hoy > 880 || hash(i, j, 5) < .15, rad = (bjork ? 1.4 : 1.6) + 2.2 * hash(i, j, 4);
    kroner.push([px, py, Math.max(liten ? .55 : .8, rad / r), bjork, hash(i, j, 6)]);
  }
  if (liten) { g.fillStyle = 'rgba(22,30,14,.55)'; for (const [px, py, rr] of kroner) g.fillRect(px - rr / 2, py - rr / 2, rr, rr); return; }
  g.fillStyle = 'rgba(8,10,4,.4)'; g.beginPath();
  for (const [px, py, rr] of kroner) { g.moveTo(px + rr * 1.5, py + rr * .6); g.arc(px + rr * .6, py + rr * .6, rr, 0, 6.283); } g.fill();
  for (const [px, py, rr, bjork, u] of kroner) {
    g.fillStyle = bjork ? `rgb(${78 + u * 18 | 0},${92 + u * 16 | 0},${52 + u * 8 | 0})` : `rgb(${36 + u * 12 | 0},${50 + u * 14 | 0},${30 + u * 6 | 0})`;
    g.beginPath(); g.arc(px, py, rr, 0, 6.283); g.fill();
    if (rr > 2.5) { g.fillStyle = bjork ? 'rgba(170,176,110,.28)' : 'rgba(120,140,90,.22)'; g.beginPath(); g.arc(px - rr * .3, py - rr * .3, rr * .45, 0, 6.283); g.fill(); }
  }
}

// Bygg: mål etter bygningstype (matrikkelen), vridd langs nærmeste veg.
function bygg(g, z, liste, veger) {
  const r = res(z);
  const mal = t => t >= 160 && t < 200 ? [8, 6] : t < 160 ? [12, 9] : t >= 240 && t < 250 ? [20, 11] : t < 300 ? [18, 12] : [14, 10];
  for (const b of liste) {
    let [w, h] = mal(b.t); w /= r; h /= r;
    if (w < 2.2) { g.fillStyle = '#2a2018'; g.fillRect(b.p[0] - 1.1, b.p[1] - 1.1, 2.2, 2.2); continue; }
    let vinkel = hash(Math.round(b.p[0] * 7), Math.round(b.p[1] * 7), 11) * Math.PI / 2, best = 60 / r;
    if (veger) for (const o of veger) for (const d of o.deler) for (let i = 1; i < d.length; i++) {
      const [ax, ay] = d[i - 1], [bx, by] = d[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((b.p[0] - ax) * vx + (b.p[1] - ay) * vy) / l2)), dd = Math.hypot(ax + vx * t - b.p[0], ay + vy * t - b.p[1]);
      if (dd < best) { best = dd; vinkel = Math.atan2(vy, vx); }
    }
    g.save(); g.translate(b.p[0], b.p[1]); g.rotate(vinkel);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-w / 2 + w * .12, -h / 2 + h * .15, w, h);
    g.fillStyle = b.t < 200 ? '#5a3a2c' : '#4a4038'; g.fillRect(-w / 2, -h / 2, w, h);
    if (w > 6) { g.strokeStyle = 'rgba(230,215,180,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.stroke(); }
    g.restore();
  }
}
