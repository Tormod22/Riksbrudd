'use strict';
// Bekker og elver som linjer (regler uten DOM, testes med node pipeline/fliser/test_bekker.js).
// Data: data/bekker.json fra pipeline/fliser/bekker.py (NVE Elvenett / ELVIS, Strahler-orden; kulvert under vegene er kuttet ut).
// Bekker.les(json) -> { linjer: [{ type, orden, navn, P: [[x, y], ...], bb: [x0, y0, x1, y1] }], rute }
// Bekker.bredde(l): vannets bredde i meter (bekk etter orden, brede elver bredere).
// Bekker.i(B, bb): linjene som berører et område. Bekker.punkter(P, steg): punkt minst hvert «steg» meter langs linjen.
// Bekker.fall(P3): helning per punkt (|dz| / meter) – brukes til skum der bekken er bratt.
(function (rot) {
  const RUTE = 2000;
  // bekk (type 0): orden 1 ca. 0,7 m, 2: 1,1 m, 3: 1,8 m, 4: 3 m, 5: 4,5 m; midtlinje i bred elv (type 1): 4–22 m
  const BEKK = [0, .7, 1.1, 1.8, 3, 4.5, 6, 8], ELV = [0, 4, 5, 7, 10, 15, 22, 30];
  function bredde(l) { const o = Math.max(1, Math.min(7, l.orden | 0)); return l.type === 1 ? ELV[o] : BEKK[o]; }

  function les(d) {
    const linjer = [], rute = new Map();
    for (const r of d.linjer) {
      const P = []; let x = d.x0 + r[3], y = d.y0 + r[4]; P.push([x, y]);
      for (let i = 5; i + 1 < r.length; i += 2) { x += r[i]; y += r[i + 1]; P.push([x, y]); }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [a, b] of P) { if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; }
      const l = { type: r[0], orden: r[1], navn: r[2] >= 0 && d.navn ? d.navn[r[2]] : null, P, bb: [x0, y0, x1, y1] };
      l.b = bredde(l); const n = linjer.length; linjer.push(l);
      for (let a = Math.floor(x0 / RUTE); a <= Math.floor(x1 / RUTE); a++) for (let c = Math.floor(y0 / RUTE); c <= Math.floor(y1 / RUTE); c++) {
        const k = a + ',' + c; if (!rute.has(k)) rute.set(k, []); rute.get(k).push(n); }
    }
    return { linjer, rute, kilde: d.kilde };
  }
  function i(B, bb) {
    const sett = new Set(), ut = [];
    for (let a = Math.floor(bb[0] / RUTE); a <= Math.floor(bb[2] / RUTE); a++) for (let c = Math.floor(bb[1] / RUTE); c <= Math.floor(bb[3] / RUTE); c++)
      for (const n of B.rute.get(a + ',' + c) || []) { if (sett.has(n)) continue; sett.add(n); const l = B.linjer[n];
        if (l.bb[2] >= bb[0] && l.bb[0] <= bb[2] && l.bb[3] >= bb[1] && l.bb[1] <= bb[3]) ut.push(l); }
    return ut;
  }
  function punkter(P, steg) {
    const ut = [P[0].slice()];
    for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / steg));
      for (let s = 1; s <= n; s++) ut.push([ax + (bx - ax) * s / n, ay + (by - ay) * s / n]); }
    return ut;
  }
  // Chaikin én gang: myke svinger (endene står)
  function myk(P) {
    if (P.length < 3) return P.map(p => p.slice());
    const ut = [P[0].slice()];
    for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1]; ut.push([ax * .75 + bx * .25, ay * .75 + by * .25], [ax * .25 + bx * .75, ay * .25 + by * .75]); }
    ut.push(P[P.length - 1].slice()); return ut;
  }
  // helning per punkt over ca. ±2 punkter (P3: [x, y, z])
  function fall(P3) {
    const ut = new Float32Array(P3.length);
    for (let k = 0; k < P3.length; k++) { const a = P3[Math.max(0, k - 2)], b = P3[Math.min(P3.length - 1, k + 2)], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      ut[k] = l > .1 ? Math.abs(b[2] - a[2]) / l : 0; }
    return ut;
  }
  // skum (0–1) av helningen: rolig under 7 %, mest skum over 35 %
  const skum = f => Math.max(0, Math.min(1, (f - .07) / .28));
  // korteste avstand fra (x, y) til linjen (meter)
  function avstand(P, x, y) {
    let best = Infinity;
    for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0, d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (d < best) best = d; }
    return best;
  }
  // Høyden på selve terrengnettet i 3D (ikke høydegitteret): nettet i sett3d er et PlaneGeometry med M × M punkt som er flyttet
  // med g(t) = t·(A + (1 − A)·t²) (tett i midten, glissent ut mot kanten), og trekantene interpolerer lineært mellom punktene.
  // Langt fra midten er rutene mange meter store, så høydegitteret alene kan ligge over 1 m fra nettet i en bekkedal.
  // z: punktenes høyder (posisjon-arrayet, hvert 3. tall fra indeks 2), x, y lokalt (meter fra midten).
  function nettHøyde(z, M, A, S, x, y) {
    const g = t => t * (A + (1 - A) * t * t), inv = v => { let a = -1, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (g(m) < v) a = m; else b = m; } return (a + b) / 2; };
    const sx = inv(Math.max(-1, Math.min(1, x / S))), sy = inv(Math.max(-1, Math.min(1, y / S)));
    const fx = (sx + 1) / 2 * (M - 1), fy = (1 - sy) / 2 * (M - 1), ix = Math.max(0, Math.min(M - 2, Math.floor(fx))), iy = Math.max(0, Math.min(M - 2, Math.floor(fy)));
    const xw = i => S * g(-1 + 2 * i / (M - 1)), yw = j => S * g(1 - 2 * j / (M - 1));
    const u = Math.max(0, Math.min(1, (x - xw(ix)) / (xw(ix + 1) - xw(ix)))), v = Math.max(0, Math.min(1, (yw(iy) - y) / (yw(iy) - yw(iy + 1))));
    const Z = (i, j) => z[(j * M + i) * 3 + 2], za = Z(ix, iy), zb = Z(ix, iy + 1), zc = Z(ix + 1, iy + 1), zd = Z(ix + 1, iy);
    return u + v <= 1 ? za + (zd - za) * u + (zb - za) * v : zc + (zb - zc) * (1 - u) + (zd - zc) * (1 - v);
  }
  const Bekker = { nettHøyde, les, i, bredde, punkter, myk, fall, skum, avstand, RUTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = Bekker; else rot.Bekker = Bekker;
})(typeof window !== 'undefined' ? window : globalThis);
