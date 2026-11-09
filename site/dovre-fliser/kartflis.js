'use strict';
// Kartflisene: henting fra kartfilene (PMTiles), dekoding og komponering av én skjermflis (høyde, skygge, vann, omland,
// veger, jernbane, trær, hus). Uten DOM, så den samme koden kjører i bakgrunnstråden (kartflis-arbeider.js) og på siden
// (reserve for nettlesere uten OffscreenCanvas). Siden og tråden fyller inn KF med det de vet.
const KF = {
  klar: Promise.resolve(), lagfiler: null, norgeBlokker: null, vis: null,   // kartfilene, Norge-blokkene (omlandet), kartlagene som vises
  kartTag: null, release: Promise.resolve(false), data: '/dovre-fliser/data/',
  vedBytes(n, kilde) {}, vedFeil(e) { console.error(e); },
};
// ---------- flisnettet (samme som pipeline/fliser/felles.py) ----------
const G = { x0: -200000, y0: 9300000, res0: 16384, T: 256 };
const res = z => G.res0 / 2 ** z, span = z => G.T * res(z);

class Kilde {
  constructor(fil, tag) { this.fil = fil; this.tag = tag || null; this.url = KF.data + fil; }   // tag: egen release (byggomriss)
  getKey() { return (this.tag || '') + this.url; }
  async getBytes(off, len, signal) {
    if (this.tag || await KF.release) {   // GitHub-releasen via mellomstasjonen: byteområdet i adressen, så Vercel kan lagre hver bit
      try {
        const r = await fetch(`/api/kart/${this.tag || KF.kartTag}/${this.fil}/${off}/${len}`, { signal });
        if (r.ok) { const data = await r.arrayBuffer(); KF.vedBytes(data.byteLength, 'GitHub'); return { data }; }
        if (this.tag) throw new Error('HTTP ' + r.status + ' ' + this.fil);
      } catch (e) { if (e.name === 'AbortError' || this.tag) throw e; }
    }
    const r = await fetch(this.url, { headers: { Range: `bytes=${off}-${off + len - 1}` }, signal });
    if (r.status !== 206 && r.status !== 200) throw new Error('HTTP ' + r.status + ' ' + this.url);
    let data = await r.arrayBuffer();
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
      .then(r => r ? DEKOD[lag](r.data, z) : null).catch(e => { console.error(e); RÅ.delete(k); KF.vedFeil(e); return null; }));
    if (RÅ.size > 900) RÅ.delete(RÅ.keys().next().value);
  }
  return RÅ.get(k);
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
  const t = Math.min(1, d / TONING); return t * t * (3 - 2 * t);
}
// Vekten på et grovt rutenett over flisen (17 × 17), interpoleres per punkt.
function vektRutenett(minx, maxy, sp) {
  const n = 17, a = new Float32Array(n * n); a.n = n;
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
  const [k, h, tr, v, uv, hs, ok, oh] = await flisData(z, x, y, valg, hel);
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
      g.beginPath(); for (const o of uv.t.bane.obj) for (const d of o.deler) { const q = d.map(uP); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]); }
      g.stroke(); g.setLineDash([]);
    }
  }
  if (v && valg.bygg && !hs && v.t.bygg && z >= 11) bygg(g, z, v.t.bygg.obj.map(o => ({ t: o.e.t, p: P(o.deler[0][0]) })), veger);
  if (hs && hs.t.hus) husomriss(g, z, hs);
  return { c, E };
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
  g.lineJoin = 'round';
  for (const { o, P, f } of hus) {
    const t = o.e.t, i = o.e.i, base = takFarge(t, i), arealM2 = f.areal * r * r;
    if (detalj && saltak(t, arealM2) && f.rekt > .7 && f.lv > 3) {   // saltak: mønet langs lengste side, gjennom midten
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
    if (z >= 15 && arealM2 > 80) byggmerke(g, t, f.sx, f.sy, Math.max(5, Math.min(12, Math.sqrt(f.areal) * .22)));
  }
}
// Kjennetegn på taket når man er nær: kirke (kors), sykehus (rødt kors), flyplass (fly), skole (bok), butikk (handlepose), industri/lager (tannhjul)
function byggmerke(g, t, x, y, r) {
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
