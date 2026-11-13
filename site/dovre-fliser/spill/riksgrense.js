'use strict';
// Riksgrensa mot Sverige, Finland og Russland (regler uten DOM; test: node pipeline/fliser/test_riksgrense.js).
// Data: data/riksgrense.json fra pipeline/fliser/riksgrense.py (Kartverket, CC BY 4.0): én linje fra Skagerrak i sør, gjennom
// Iddefjorden, langs hele landegrensa til Grense Jakobselv og ut i Varangerfjorden. Norge ligger til venstre for linjen.
// Riksgrense.les(json)        -> R (punktene, et rutenett for raske oppslag og en grov linje for steder langt unna)
// Riksgrense.avstand(R, x, y) -> meter til grensa med fortegn: positiv i Norge, negativ i utlandet. Nær grensa (innen ca. 12 km)
//                                er tallet nøyaktig; lenger unna er fortegnet riktig og tallet omtrentlig (fra den grove linjen).
// Riksgrense.iNorge(R, x, y)  -> true på norsk side (også hele kysten, havet og Svalbard)
// Brukes av leirvalget (oppstart-visning.js: leiren kunne legges 5 km inn i Sverige) og av kartflis.js (Norge-kartet tones over i
// omlandet de første kilometerne utenfor grensa – før sluttet det i rette sømmer et stykke inne i Sverige).
(function (rot) {
  const RUTE = 4000, RINGER = 3, FORLENG = 400000, GROV = 8000, NØKKEL = 100003;
  function les(d) {
    const n = d.linje.length / 2 + 1, P = new Float64Array(2 * (n + 2));
    let x = d.x0, y = d.y0; P[2] = x; P[3] = y;
    for (let i = 0; i < d.linje.length; i += 2) { x += d.linje[i]; y += d.linje[i + 1]; P[4 + i] = x; P[5 + i] = y; }
    // endene forlenges rett ut i havet, så «til venstre for linjen» gir mening også utenfor endene
    const forleng = (a, b, ut) => { const dx = P[2 * a] - P[2 * b], dy = P[2 * a + 1] - P[2 * b + 1], l = Math.hypot(dx, dy) || 1; P[2 * ut] = P[2 * a] + dx / l * FORLENG; P[2 * ut + 1] = P[2 * a + 1] + dy / l * FORLENG; };
    forleng(1, Math.min(n, 6), 0); forleng(n, Math.max(1, n - 5), n + 1);
    const N = n + 2, rute = new Map();
    // rutenettet: hvilke linjestykker som går gjennom hver rute (de to lange forlengelsene holdes utenfor – de tas av den grove linjen)
    for (let i = 1; i < N - 2; i++) { const ax = P[2 * i], ay = P[2 * i + 1], bx = P[2 * i + 2], by = P[2 * i + 3];
      for (let a = Math.floor(Math.min(ax, bx) / RUTE); a <= Math.floor(Math.max(ax, bx) / RUTE); a++) for (let c = Math.floor(Math.min(ay, by) / RUTE); c <= Math.floor(Math.max(ay, by) / RUTE); c++) {
        const k = a * NØKKEL + c; let l = rute.get(k); if (!l) rute.set(k, l = []); l.push(i); } }
    // grov linje: hvert punkt som ligger minst 8 km fra forrige (og endene)
    const grov = [0]; for (let i = 1; i < N - 1; i++) { const g = grov[grov.length - 1]; if (Math.hypot(P[2 * i] - P[2 * g], P[2 * i + 1] - P[2 * g + 1]) >= GROV) grov.push(i); } grov.push(N - 1);
    return { P, N, rute, grov, kilde: d.kilde };
  }
  // Avstand med fortegn fra (x, y) til linjestykket a–b når linjen fortsetter fra f (før a) til e (etter b). Fortegnet: til venstre = +.
  // Er nærmeste punkt et knekkpunkt, ligger (x, y) på yttersiden av svingen: en venstresving gir høyre side, og omvendt.
  function stykke(P, f, a, b, e, x, y) {
    const ax = P[2 * a], ay = P[2 * a + 1], dx = P[2 * b] - ax, dy = P[2 * b + 1] - ay, L = dx * dx + dy * dy;
    const t = L ? ((x - ax) * dx + (y - ay) * dy) / L : 0;
    if (t > 0 && t < 1) { const kr = dx * (y - ay) - dy * (x - ax); return (kr >= 0 ? 1 : -1) * Math.abs(kr) / Math.sqrt(L); }
    const v = t <= 0 ? a : b, u = t <= 0 ? f : a, w = t <= 0 ? b : e, d = Math.hypot(x - P[2 * v], y - P[2 * v + 1]);
    if (u === v || w === v) { const kr = dx * (y - ay) - dy * (x - ax); return (kr >= 0 ? 1 : -1) * d; }   // enden av hele linjen
    const sving = (P[2 * v] - P[2 * u]) * (P[2 * w + 1] - P[2 * v + 1]) - (P[2 * v + 1] - P[2 * u + 1]) * (P[2 * w] - P[2 * v]);
    if (sving === 0) { const kr = dx * (y - ay) - dy * (x - ax); return (kr >= 0 ? 1 : -1) * d; }
    return sving > 0 ? -d : d;
  }
  function avstand(R, x, y) {
    const { P, N, rute, grov } = R, cx = Math.floor(x / RUTE), cy = Math.floor(y / RUTE);
    let best = Infinity, svar = 0; const sett = new Set();
    // ring for ring utover: funnet avstand er sikker når den er mindre enn det ringen dekker
    for (let r = 0; r <= RINGER; r++) {
      for (let a = cx - r; a <= cx + r; a++) for (let c = cy - r; c <= cy + r; c++) { if (Math.max(Math.abs(a - cx), Math.abs(c - cy)) !== r) continue;
        const l = rute.get(a * NØKKEL + c); if (!l) continue;
        for (const i of l) { if (sett.has(i)) continue; sett.add(i); const d = stykke(P, Math.max(0, i - 1), i, i + 1, Math.min(N - 1, i + 2), x, y); if (Math.abs(d) < best) { best = Math.abs(d); svar = d; } } }
      if (best <= r * RUTE) return svar;
    }
    // langt fra grensa: den grove linjen (med forlengelsene) gir fortegnet og en omtrentlig avstand
    for (let k = 0; k + 1 < grov.length; k++) { const d = stykke(P, grov[Math.max(0, k - 1)], grov[k], grov[k + 1], grov[Math.min(grov.length - 1, k + 2)], x, y); if (Math.abs(d) < best) { best = Math.abs(d); svar = d; } }
    return svar;
  }
  const iNorge = (R, x, y) => avstand(R, x, y) >= 0;
  const Riksgrense = { les, avstand, iNorge, RUTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = Riksgrense; else rot.Riksgrense = Riksgrense;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
