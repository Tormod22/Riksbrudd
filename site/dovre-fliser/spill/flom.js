/* S5 del 3 – dam og flom: regler uten DOM (Node: require('./flom'); nettleser: globalThis.Flom).
 * En sprengt dam slipper magasinet ut: vannet følger dalen nedover (bratteste veg i høydemodellen, over små søkk) i opptil 15 km,
 * og alt i dalbunnen langs veien – lavere enn vannflaten der – oversvømmes. Vannflaten står 15 m over dalbunnen ved dammen og
 * synker til 3 m nederst. Vinduet er et høydevindu fra terreng.js (x0, y0, r, w, h, H). Tallene er spillverdier (forslag).
 */
(function (rot) {
  'use strict';
  const REGLER = { lengde: 15000, dybde: [15, 3], bredde: 600, varighet: 12 * 3600, tap: [2, 5], kjøretøy: 8, søk: 2 };
  const celle = (v, X, Y) => [Math.floor((X - v.x0) / v.r), Math.floor((v.y0 - Y) / v.r)];
  const hoyde = (v, i, j) => i < 0 || j < 0 || i >= v.w || j >= v.h ? NaN : v.H[j * v.w + i];
  // Flomveien fra dammen (X, Y): start i det laveste punktet innen 300 m (foten av dammen), så alltid til den laveste ubesøkte
  // nabocellen innen «søk» celler – også litt oppover når det er et søkk i høydemodellen. Gir [[i, j, h], ...].
  function flomvei(v, X, Y) {
    const R = REGLER, [ci, cj] = celle(v, X, Y), n0 = Math.ceil(300 / v.r);
    let start = null;
    for (let j = cj - n0; j <= cj + n0; j++) for (let i = ci - n0; i <= ci + n0; i++) { const h = hoyde(v, i, j); if (h === h && (!start || h < start[2])) start = [i, j, h]; }
    if (!start) return [];
    const sti = [start], besøkt = new Set([start[1] * v.w + start[0]]), maks = Math.ceil(R.lengde / v.r);
    let [i, j] = start, L = 0;
    while (L < R.lengde && sti.length < maks * 2) {
      let best = null;
      for (let dj = -R.søk; dj <= R.søk; dj++) for (let di = -R.søk; di <= R.søk; di++) {
        if (!di && !dj) continue; const a = i + di, b = j + dj, h = hoyde(v, a, b); if (h !== h || besøkt.has(b * v.w + a)) continue;
        const k = h + Math.hypot(di, dj) * .01;   // lik høyde: nærmeste
        if (!best || k < best[3]) best = [a, b, h, k];
      }
      if (!best) break;
      L += Math.hypot(best[0] - i, best[1] - j) * v.r; [i, j] = best; besøkt.add(j * v.w + i); sti.push([i, j, best[2]]);
    }
    return sti;
  }
  // Flomfeltet: celler innen «bredde» fra flomveien som ligger lavere enn vannflaten der (dalbunnen + dybde, synkende nedover).
  // Fylles fra veien og utover så bare sammenhengende lavland tas (ikke en dal på andre siden av en rygg). Gir { maske, antall }.
  function flomfelt(v, sti) {
    const R = REGLER, maske = new Uint8Array(v.w * v.h), flate = new Float32Array(v.w * v.h).fill(-Infinity), nb = Math.ceil(R.bredde / v.r);
    sti.forEach(([i, j, h], k) => { const f = k / Math.max(1, sti.length - 1), d = R.dybde[0] + (R.dybde[1] - R.dybde[0]) * f, nivå = h + d;
      for (let b = j - nb; b <= j + nb; b++) for (let a = i - nb; a <= i + nb; a++) { if (a < 0 || b < 0 || a >= v.w || b >= v.h || (a - i) ** 2 + (b - j) ** 2 > nb * nb) continue;
        const q = b * v.w + a; if (nivå > flate[q]) flate[q] = nivå; } });
    const kø = []; for (const [i, j] of sti) { const q = j * v.w + i; if (!maske[q]) { maske[q] = 1; kø.push(q); } }
    while (kø.length) { const q = kø.pop(), i = q % v.w, j = (q - i) / v.w;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= v.w || b >= v.h) continue;
        const p = b * v.w + a, h = v.H[p]; if (maske[p] || !(h === h) || h > flate[p]) continue; maske[p] = 1; kø.push(p); } }
    let antall = 0; for (let q = 0; q < maske.length; q++) antall += maske[q];
    return { maske, antall };
  }
  // Er punktet (X, Y) under vann? felt: { x0, y0, r, w, h, maske }.
  function iFlom(felt, X, Y) { const [i, j] = celle(felt, X, Y); return i >= 0 && j >= 0 && i < felt.w && j < felt.h && felt.maske[j * felt.w + i] === 1; }
  const api = { REGLER, flomvei, flomfelt, iFlom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Flom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
