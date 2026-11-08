// Spillregler for terreng: framkommelighet, marsjrute (A*), siktvidde og siktfelt.
// Ingen skjerm og ingen henting her – alt regnes på et «vindu» (rutenett med høyde, arealklasse og veg) som
// visningen bygger av flisene rundt laget. Brukes i nettleseren (window.Terreng) og i Node (require) for tester.
//
// Vindu: { x0, y0, r, w, h, H: Float32Array (moh., NaN = ingen data), K: Uint8Array (klasse), V: Uint8Array (veg) }
//   x0, y0 = øvre venstre hjørne i meter (EPSG:25833), r = rutestørrelse i meter, rute (i, j) har senter
//   (x0 + (i + .5) r, y0 - (j + .5) r).
// Klasser: 0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 255 ingen data.
// Veg: 0 ingen, 1 privat/skogsbilveg/kommunal, 2 fylkesveg, 3 riks-/europaveg.
(function (eksport) {
  'use strict';
  const KLASSE = ['snaufjell', 'skog', 'hei', 'vann', 'snø', 'dyrket mark', 'myr'];
  const VEGKLASSE = { E: 3, R: 3, F: 2, K: 1, P: 1, S: 1 };

  // Fart til fots i km/t (fra /dovre, bekreftet i HANDOFF.md §3).
  function fart(klasse, veg) {
    if (veg >= 2) return 5;
    if (veg === 1) return 4;
    if (klasse === 3 || klasse === 255) return 0;          // vann (og utenfor kartet) er sperret uten veg
    return { 0: 2.2, 1: 2, 2: 3, 4: 1.5, 5: 3, 6: 1.8 }[klasse] || 3;
  }

  const idx = (v, i, j) => j * v.w + i;
  function rute(v, X, Y) { return [Math.floor((X - v.x0) / v.r), Math.floor((v.y0 - Y) / v.r)]; }
  function senter(v, i, j) { return [v.x0 + (i + .5) * v.r, v.y0 - (j + .5) * v.r]; }
  function inne(v, i, j) { return i >= 0 && j >= 0 && i < v.w && j < v.h; }
  function verdi(v, A, X, Y, ellers) { const [i, j] = rute(v, X, Y); return inne(v, i, j) ? A[idx(v, i, j)] : ellers; }

  // Timer for å gå fra rute a til nabo b (lengde l meter). Stigning bremser: fart / (1 + 8 · stigning).
  function steg(v, a, b, l) {
    const f = fart(v.K[b], v.V[b]); if (!f) return Infinity;
    let s = f; const dz = v.H[b] - v.H[a];
    if (dz === dz) s /= 1 + 8 * Math.abs(dz) / l;
    return l / 1000 / s;
  }

  // Raskeste rute (timer) fra (sx, sy) til (tx, ty). Returnerer { sti: [[X, Y], ...], timer, steg: [timer per del] } eller null.
  function rute_til(v, sx, sy, tx, ty, maks = 2e6) {
    const [si, sj] = rute(v, sx, sy), [ti, tj] = rute(v, tx, ty);
    if (!inne(v, si, sj) || !inne(v, ti, tj)) return null;
    const N = v.w * v.h, g = new Float64Array(N).fill(Infinity), fra = new Int32Array(N).fill(-1), lukket = new Uint8Array(N);
    const s = idx(v, si, sj), t = idx(v, ti, tj);
    if (!fart(v.K[t], v.V[t])) return null;
    const h = k => Math.hypot(k % v.w - ti, ((k / v.w) | 0) - tj) * v.r / 1000 / 5.5; // aldri raskere enn 5 km/t på veg
    // binærhaug på typede tabeller
    let hk = new Int32Array(1024), hf = new Float64Array(1024), n = 0;
    const legg = (k, f) => { if (n === hk.length) { const a = new Int32Array(n * 2), b = new Float64Array(n * 2); a.set(hk); b.set(hf); hk = a; hf = b; }
      let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hk[i] = hk[p]; hf[i] = hf[p]; i = p; } hk[i] = k; hf[i] = f; };
    const ta = () => { const k = hk[0], sk = hk[--n], sf = hf[n]; let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= sf) break; hk[i] = hk[c]; hf[i] = hf[c]; i = c; }
      hk[i] = sk; hf[i] = sf; return k; };
    g[s] = 0; legg(s, h(s)); let it = 0;
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    while (n && it++ < maks) {
      const k = ta(); if (k === t) break; if (lukket[k]) continue; lukket[k] = 1;
      const i = k % v.w, j = (k / v.w) | 0;
      for (const [di, dj, l] of D) {
        const a = i + di, b = j + dj; if (!inne(v, a, b)) continue;
        const m = idx(v, a, b); if (lukket[m]) continue;
        const c = steg(v, k, m, l * v.r); if (c === Infinity) continue;
        if (g[k] + c < g[m]) { g[m] = g[k] + c; fra[m] = k; legg(m, g[m] + h(m)); }
      }
    }
    if (g[t] === Infinity) return null;
    const ruter = []; for (let k = t; k !== -1; k = fra[k]) ruter.push(k); ruter.reverse();
    const sti = ruter.map(k => senter(v, k % v.w, (k / v.w) | 0)), timer = [];
    sti[0] = [sx, sy]; sti[sti.length - 1] = [tx, ty];
    for (let q = 1; q < ruter.length; q++) timer.push(g[ruter[q]] - g[ruter[q - 1]]);
    return { sti, timer: g[t], steg: timer };
  }

  // Siktvidde i meter: lag 4 km, speider 8 km; skog ×0,35, myr ×0,8, snø ×0,9; i bevegelse ×0,55;
  // høyt over omgivelsene (snitt innen ca. 350 m) gir inntil +60 %.
  function siktvidde(v, X, Y, speider, iBevegelse) {
    const k = verdi(v, v.K, X, Y, 2); let r = speider ? 8000 : 4000;
    if (k === 1) r *= .35; else if (k === 6) r *= .8; else if (k === 4) r *= .9;
    if (iBevegelse) r *= .55;
    const [i, j] = rute(v, X, Y), R = Math.round(350 / v.r); let sum = 0, n = 0;
    for (let b = j - R; b <= j + R; b++) for (let a = i - R; a <= i + R; a++) if (inne(v, a, b)) { const z = v.H[idx(v, a, b)]; if (z === z) { sum += z; n++; } }
    const z = verdi(v, v.H, X, Y, NaN), over = n && z === z ? z - sum / n : 0;
    if (over > 30) r *= 1 + Math.min(.6, over / 300);
    return r;
  }

  // Siktfelt: hvilke ruter innen radius som kan sees fra (X, Y). Øyne 2 m over bakken, skog er 8 m høy.
  // Returnerer Uint8Array (1 = synlig) med samme størrelse som vinduet.
  function siktfelt(v, X, Y, radius, oyne = 2) {
    const ut = new Uint8Array(v.w * v.h), [oi, oj] = rute(v, X, Y);
    if (!inne(v, oi, oj)) return ut;
    const oz = v.H[idx(v, oi, oj)] + oyne, R = Math.ceil(radius / v.r);
    ut[idx(v, oi, oj)] = 1;
    const stråler = Math.max(360, Math.ceil(2 * Math.PI * R));
    for (let s = 0; s < stråler; s++) {
      const a = s / stråler * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a); let maks = -Infinity;
      for (let d = 1; d <= R; d++) {
        const i = Math.round(oi + ca * d), j = Math.round(oj + sa * d); if (!inne(v, i, j)) break;
        const k = idx(v, i, j), z = v.H[k]; if (z !== z) continue;
        const helling = (z - oz) / d;                 // bakken selv synes hvis den er over sikteleinja
        if (helling >= maks) ut[k] = 1;
        const topp = (z + (v.K[k] === 1 ? 8 : 0) - oz) / d;  // trærne skygger for det bak
        if (topp > maks) maks = topp;
      }
    }
    return ut;
  }

  // Legger veger inn i vinduet. linjer: [{ k: 'E'|'R'|..., p: [[X, Y], ...] }] i meter.
  function leggInnVeger(v, linjer) {
    for (const l of linjer) {
      const w = VEGKLASSE[l.k] || 1;
      for (let q = 1; q < l.p.length; q++) {
        const [ax, ay] = l.p[q - 1], [bx, by] = l.p[q], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (v.r / 3)) + 1;
        for (let s = 0; s <= n; s++) { const [i, j] = rute(v, ax + (bx - ax) * s / n, ay + (by - ay) * s / n);
          if (inne(v, i, j)) { const k = idx(v, i, j); if (v.V[k] < w) v.V[k] = w; } }
      }
    }
  }

  function nyttVindu(x0, y0, r, w, h) {
    return { x0, y0, r, w, h, H: new Float32Array(w * h).fill(NaN), K: new Uint8Array(w * h).fill(255), V: new Uint8Array(w * h) };
  }

  eksport.Terreng = { KLASSE, VEGKLASSE, fart, rute, senter, verdi, steg, ruteTil: rute_til, siktvidde, siktfelt, leggInnVeger, nyttVindu };
})(typeof module !== 'undefined' ? module.exports : window);
