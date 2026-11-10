'use strict';
// Byhus (brukeren 12. nov: «få ting til å se penere ut også i hele Norge»): fasader, farger og tak for større bygg i byene.
// Reglene her er uten DOM (test: node pipeline/fliser/test_byhus.js); teksturene males av Byhus.tekstur (bare i 3D, THREE finnes da).
// hus3d i index.html spør Byhus.stil(...) for hvert bygg og lager veggene etter svaret.
//
// Fasadetyper (gruppe i hus3d = tekstur):
//   murgard – pusset bygård (før ca. 1930): høye vinduer med omramming, gesims øverst
//   tegl    – teglstein med hvite vinduer og lyse stikk over
//   funkis  – 1930-talls funkis: hvit/lys puss med båndvinduer
//   plate   – nyere bygg (fra ca. 1990): plater og store glassfelt
//   leil    – blokk med balkonger (som før), kontor – kontorvinduer med etasjebånd (som før)
//   gate    – butikkvinduer i 1. etasje langs gatene i sentrum
// Tak: 'flatt' (takpapp, noen grønne tak), 'valm' og 'mansard' (eldre bygårder i byene), eller null (= reglene i hus3d som før).
(function (rot) {
  // frø per bygg (samme som hash i kartflis.js), så hvert bygg ser likt ut hver gang
  function hash(a, b, c) {
    let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  }
  const velg = (r, liste) => { let s = 0; for (const [, w] of liste) s += w; let x = r * s; for (const [n, w] of liste) { x -= w; if (x < 0) return n; } return liste[liste.length - 1][0]; };
  // meter per felt langs veggen og høyden på en etasje (m)
  const MÅL = { murgard: [3.2, 3.3], tegl: [3, 3.1], funkis: [4, 3], plate: [2.4, 3.3], leil: [7.2, 2.9], kontor: [3.2, 3.4], gate: [4.5, 4.2] };
  // dempede, naturlige farger (norske bygårder): oker, gul, lys grå, rødbrun, hvit, beige, grønngrå, støvrosa, terrakotta.
  // Ingen blåaktige vegger (natt3d.js tenner vinduer der teksturen er blåere enn rød).
  const FARGER = {
    murgard: ['#c9a66e', '#d6c18c', '#bdb9af', '#9a6150', '#e0dbcf', '#cdb999', '#aeb19c', '#c2a596', '#b77d5f', '#d9cdb4', '#a98f72'],
    tegl: ['#ffffff', '#f2e6dc', '#e8d8c8', '#d9cfc6', '#fff4e6'],
    funkis: ['#e6e2d8', '#d4d0c6', '#ddd2b0', '#d9c6b6', '#c9cbbf'],
    plate: ['#8c8d8b', '#626463', '#a8885f', '#bab7af', '#7c5e4a', '#d2cfc6'],
    leil: ['#d6cfbf', '#bda88a', '#a8a59c', '#c9b28a', '#9e6a55', '#ddd6c6'],
    kontor: ['#c9c4b8', '#a9a69e', '#b9a48a', '#d8d2c4', '#8e8a82']
  };
  const TAKPAPP = ['#55524e', '#615d57', '#4d4b48', '#68635c', '#5a554e'], GRØNT = ['#5e6c43', '#687547', '#55623d'];
  const BYTAK = ['#3c3b3a', '#4a4440', '#6b4535', '#5a3a30', '#535659'];   // skifer, blikk, tegl på bygårdene
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

  // Hvilken fasade, hvor mange etasjer og hvilket tak. kl = klassen fra hus3d (leil, kontor, butikk, skole …), t = OSM-typen,
  // i = byggets nummer, h = høyde (m), A = grunnflate (m²), tett = bygg innen 100 m, enkel = nesten rektangulært omriss.
  function stil(kl, t, i, h, A, tett, enkel) {
    const by = tett >= 25, sentrum = tett >= 40, r = hash(i, 31, 7), r2 = hash(i, 17, 11), r3 = hash(i, 5, 23);
    let fasade = null;
    if (kl === 'leil') {
      fasade = h > 30 ? velg(r, [['plate', 6], ['leil', 4]])
        : by && h <= 24 ? velg(r, [['murgard', 45], ['tegl', 20], ['funkis', 15], ['leil', 10], ['plate', 10]])
        : by ? velg(r, [['plate', 4], ['leil', 4], ['tegl', 2]])
        : velg(r, [['leil', 40], ['funkis', 25], ['tegl', 15], ['plate', 20]]);
    } else if (kl === 'kontor') {
      fasade = h > 30 ? velg(r, [['plate', 7], ['kontor', 3]])
        : by ? velg(r, [['murgard', 30], ['tegl', 20], ['plate', 25], ['kontor', 15], ['funkis', 10]])
        : velg(r, [['kontor', 45], ['plate', 30], ['tegl', 25]]);
    } else if (kl === 'butikk' && h > 7.5) {
      fasade = by ? velg(r, [['murgard', 40], ['tegl', 20], ['funkis', 15], ['plate', 25]]) : velg(r, [['plate', 5], ['tegl', 3], ['funkis', 2]]);
    } else if (kl === 'skole') fasade = velg(r, [['tegl', 45], ['kontor', 40], ['funkis', 15]]);
    if (!fasade) return null;
    // etasjene: høyden fra dataene delt i hele etasjer (vinduene passer etasjehøyden)
    const gate = h >= 7.5 && (kl === 'butikk' || (sentrum && kl !== 'skole' && fasade !== 'plate' && r2 < .7));
    const [du, eh] = MÅL[fasade], over = Math.max(2, h - .5 - (gate ? MÅL.gate[1] : 0)), etasjer = Math.max(1, Math.round(over / eh));
    const farge = FARGER[fasade][Math.floor(r3 * FARGER[fasade].length)];
    const gesims = (fasade === 'murgard' || fasade === 'tegl') && h <= 30;
    // tak: eldre bygårder i byene (murgård/tegl, 9–24 m) får ofte valmtak eller mansard; resten flatt med takpapp
    let tak = null; const rt = hash(i, 41, 3);
    if (by && enkel && (fasade === 'murgard' || fasade === 'tegl') && h >= 8 && h <= 26 && A >= 120 && A <= 2500) tak = rt < .3 ? 'mansard' : rt < .62 ? 'valm' : null;
    const grønt = !tak && (fasade === 'plate' || fasade === 'funkis') && hash(i, 3, 59) < .14;
    return { fasade, du, etasjer, gate, farge: rgb(farge), gesims, tak, grønt };
  }
  // Takfarger: takpapp på flate tak (noen grønne tak med sedum), skifer/blikk/tegl på bygårdene
  const takpapp = i => rgb(TAKPAPP[Math.floor(hash(i, 13, 2) * TAKPAPP.length)]);
  const grøntTak = i => rgb(GRØNT[Math.floor(hash(i, 19, 2) * GRØNT.length)]);
  const byTak = i => rgb(BYTAK[Math.floor(hash(i, 23, 4) * BYTAK.length)]);
  // Takhus på flate tak: 1–4 bokser (ventilasjon, heis/trapperom, takoppbygg) med fast plass per bygg, i meter fra midten (du langs, dv på tvers).
  function takhus(i, lu, lv, A) {
    if (A < 120) return [];
    const n = A < 300 ? 1 : 1 + Math.floor(hash(i, 7, 77) * (A > 1500 ? 4 : 3)), ut = [];
    for (let k = 0; k < n; k++) {
      const a = hash(i, k, 101), b = hash(i, k, 202), c = hash(i, k, 303), heis = k === 0 && A > 300;
      const w = heis ? 1.6 + c * 1.2 : .6 + c * Math.min(2.4, Math.sqrt(A) * .06), d = heis ? 1.6 + a * 1 : .5 + b * 1.4, hh = heis ? 2.6 + b * .6 : .7 + a * 1.1;
      const du = (a - .5) * Math.max(0, lu - 2 * w - 2), dv = (b - .5) * Math.max(0, lv - 2 * d - 2);
      ut.push({ du, dv, w, d, hh, mørk: heis || c < .3 });
    }
    return ut;
  }
  const FASADER = ['murgard', 'tegl', 'funkis', 'plate', 'gate', 'mansard'];

  // ---------- teksturene (bare i nettleseren) ----------
  // Ett felt per tekstur (u = ett felt langs veggen, v = én etasje), hvit = veggens farge (fargen ganges inn per hjørne).
  // Glasset er blågrått og mørkt (natt3d.js tenner det om kvelden).
  const TEX = {};
  function tekstur(type) {
    if (TEX[type]) return TEX[type];
    const W = 64, H = type === 'gate' ? 80 : 64, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    let f = 9 + type.length * 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647;
    const glass = (x, y, w, h) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#93a4b5'); gr.addColorStop(.45, '#4c5a68'); gr.addColorStop(1, '#2b333b'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    const puss = (styrke) => { const id = g.getImageData(0, 0, W, H), d = id.data; for (let q = 0; q < d.length; q += 4) { const v = 1 - rnd() * styrke; d[q] *= v; d[q + 1] *= v; d[q + 2] *= v; } g.putImageData(id, 0, 0); };
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    if (type === 'murgard') {
      // pusset vegg med svak fuge (kvaderpuss) i nedre del av feltet, høyt vindu med lys omramming, sålbenk og fronton-stripe
      puss(.05);
      g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 62, W, 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 60, W, 1);
      g.fillStyle = '#f4f1ea'; g.fillRect(17, 6, 30, 44); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(17, 49, 30, 1);
      g.fillStyle = '#efebe2'; g.fillRect(15, 4, 34, 4); g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(15, 8, 34, 1);
      glass(21, 10, 22, 36); g.fillStyle = '#ebe7de'; g.fillRect(31, 10, 2, 36); g.fillRect(21, 22, 22, 2);
      g.fillStyle = '#d9d5cc'; g.fillRect(16, 50, 32, 3); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(16, 53, 32, 2);
    } else if (type === 'tegl') {
      // teglstein (rødbrun med variasjon, lyse fuger), hvitt vindu med lyst stikk over og sålbenk
      g.fillStyle = '#a8a29a'; g.fillRect(0, 0, W, H);
      for (let y = 0, rad = 0; y < H; y += 4, rad++) for (let x = -(rad % 2) * 4; x < W; x += 8) {
        const v = .72 + rnd() * .28, rr = 140 * v + rnd() * 16, gg = 60 * v + rnd() * 10, bb = 44 * v + rnd() * 8;
        g.fillStyle = `rgb(${rr | 0},${gg | 0},${bb | 0})`; g.fillRect(x, y, 7, 3); }
      g.fillStyle = '#e6e1d6'; g.fillRect(18, 9, 28, 3); g.fillStyle = '#f2f0ea'; g.fillRect(20, 12, 24, 34);
      glass(22, 14, 20, 30); g.fillStyle = '#f2f0ea'; g.fillRect(31, 14, 2, 30); g.fillRect(22, 24, 20, 2);
      g.fillStyle = '#cfcac0'; g.fillRect(19, 46, 26, 3); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(19, 49, 26, 1);
    } else if (type === 'funkis') {
      // lys puss med båndvindu som går over hele feltet (sammenhengende langs veggen), smale poster
      puss(.035);
      glass(0, 20, W, 22); g.fillStyle = '#f0eee8'; g.fillRect(0, 18, W, 2); g.fillRect(0, 42, W, 2); g.fillRect(0, 20, 2, 22); g.fillRect(31, 20, 2, 22); g.fillRect(62, 20, 2, 22);
      g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 44, W, 2);
    } else if (type === 'plate') {
      // nyere bygg: store glassfelt nesten fra gulv til tak, mørkt brystningsfelt, plateskjøter og en smal finne
      for (let x = 0; x < W; x += 16) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, 0, 1, H); }
      glass(6, 8, 52, 44); g.fillStyle = 'rgba(30,32,34,.55)'; g.fillRect(6, 52, 52, 8);
      g.fillStyle = '#e8e8e6'; g.fillRect(4, 6, 56, 2); g.fillRect(4, 6, 2, 54); g.fillRect(58, 6, 2, 54); g.fillRect(31, 8, 2, 44);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 62, W, 2);
    } else if (type === 'mansard') {
      // bratt mansardtak (skifer/blikk, fargen ganges inn) med falsede plater og en takark med vindu midt i feltet
      for (let x = 0; x < W; x += 8) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 1, H); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 1, 0, 1, H); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(20, 14, 26, 36);
      g.fillStyle = '#f4f2ec'; g.fillRect(19, 12, 26, 36); glass(22, 16, 20, 30); g.fillStyle = '#f4f2ec'; g.fillRect(31, 16, 2, 30);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(17, 8, 30, 4);
    } else if (type === 'gate') {
      // butikkfront: fasadebånd øverst (mørkere), stort utstillingsvindu med karm, lav sokkel
      g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, W, 16); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 15, W, 2);
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(6, 4, 52, 8);
      g.fillStyle = '#3d3f40'; g.fillRect(3, 19, 58, 52); glass(5, 21, 54, 48);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(9, 23, 10, 40);
      g.fillStyle = '#3d3f40'; g.fillRect(30, 21, 3, 48);
      g.fillStyle = '#9a9690'; g.fillRect(0, 71, W, 9);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return (TEX[type] = t);
  }
  // ---------- gatetrær (bare i nettleseren): løvtrær langs gatene med fortau i tettstedene, der det er plass ----------
  // Hver 12. m på begge sider like bak fortauet (vegbredde/2 + 2,9 m), ikke i/inntil hus, ikke på en annen veg eller i vann.
  // Kroken kjører etter liv3d.js (u.veger, u.påVeg) og vegetasjon3d.js (treslagene) – byhus.js lastes etter dem.
  const BREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5 };
  const gatetrær = { antall: 0 };
  if (typeof window !== 'undefined' && typeof KROKER !== 'undefined') KROKER.bygg3d.push(async u => {
    gatetrær.antall = 0;
    if (!u.veger || !u.trær || !u.påVeg || !u.hus || u.S > 2200) return;
    const maks = typeof VW !== 'undefined' && VW < 900 ? 500 : 1500, ny = [], vann = u.vann && u.vann.getContext ? (() => { try { const W = u.vann.width, d = u.vann.getContext('2d').getImageData(0, 0, W, W).data;
      return (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); return i >= 0 && j >= 0 && i < W && j < W && d[(j * W + i) * 4] > 128; }; } catch (e) { return () => false; } })() : () => false;
    const satt = new Map(), nær = (x, y) => { for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) for (const [a, b] of satt.get((Math.floor(x / 8) + di) + ',' + (Math.floor(y / 8) + dj)) || []) if (Math.hypot(a - x, b - y) < 7) return true; return false; };
    // bare der det er bymessig tett (minst 14 bygg innen 80 m): ikke langs vegene i bygder og villastrøk
    const sentre = new Map(), C = 40;
    for (const P of u.hus.omriss) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length; const kk = Math.floor(x / C) + ',' + Math.floor(y / C); if (!sentre.has(kk)) sentre.set(kk, []); sentre.get(kk).push(x, y); }
    const tett = (x, y) => { let n = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const l = sentre.get((Math.floor(x / C) + di) + ',' + (Math.floor(y / C) + dj)); if (l) for (let q = 0; q < l.length; q += 2) if (Math.hypot(l[q] - x, l[q + 1] - y) < 80) n++; } return n; };
    for (const v of u.veger) {
      if (!v.by || !'RFK'.includes(v.k) || ny.length / 5 >= maks) continue;
      const off = BREDDE[v.k] / 2 + 2.9; let d = 6;
      for (let q = 1; q < v.P.length; q++, d = Math.max(0, d)) {
        const [ax, ay] = v.P[q - 1], [bx, by] = v.P[q], L = Math.hypot(bx - ax, by - ay); if (L < .01) continue;
        const nx = (by - ay) / L, ny2 = -(bx - ax) / L;
        for (; d < L; d += 12) {
          const x0 = ax + (bx - ax) * d / L, y0 = ay + (by - ay) * d / L;
          for (const side of [1, -1]) { const x = x0 + nx * off * side, y = y0 + ny2 * off * side, r = hash(Math.round(x * 3), Math.round(y * 3), 71);
            if (r < .2 || Math.abs(x) > u.S - 10 || Math.abs(y) > u.S - 10 || u.påVeg(x, y) || nærHus(u, x, y) || vann(x, y) || nær(x, y) || tett(x, y) < 14) continue;
            const z = (hoyde3d(x + u.cx, y + u.cy, u) - u.h0) * R3.EX, kk = Math.floor(x / 8) + ',' + Math.floor(y / 8);
            if (!satt.has(kk)) satt.set(kk, []); satt.get(kk).push([x, y]); ny.push(x, y, z, 8 + r * 5, r); }
        }
        d -= L;
      }
    }
    if (!ny.length) return;
    const gml = u.trær.løv || new Float32Array(0), alle = new Float32Array(gml.length + ny.length); alle.set(gml); alle.set(ny, gml.length); u.trær.løv = alle;
    gatetrær.antall = ny.length / 5;
  });
  const Byhus = { gatetrær, stil, takpapp, grøntTak, byTak, takhus, FASADER, MÅL, FARGER, tekstur, TEX, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = Byhus; else rot.Byhus = Byhus;
})(typeof window !== 'undefined' ? window : this);
