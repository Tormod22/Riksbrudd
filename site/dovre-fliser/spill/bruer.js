'use strict';
// Regler for bruer og ferjekaier i 3D (uten DOM og uten THREE, så de kan testes i Node: pipeline/fliser/test_bruer.js).
// Visningen er spill/infra3d.js. Brutype etter lengde, klaring under dekket og dataene fra NVDB (type 0 vegbru, 1 gang/sykkel,
// 2 jernbane); dekket følger vegens linje (vektorflisene) og ligger alltid over terrenget; søylene står der dekket er høyt over bakken.
(function (rot) {
  // Kjørebanens bredde (m) per vegkategori – de samme som vegene i liv3d.js
  const VEGBREDDE = { E: 8, R: 7.5, F: 6.5, K: 5.5, P: 4, S: 3.5 };

  // Nærmeste punkt på en linje P = [[x, y], ...]: s = meter langs linjen, d = avstand, (ex, ey) = retningen der
  function projiser(P, x, y) {
    let best = { s: 0, d: Infinity, ex: 1, ey: 0, i: 0 }, L = 0;
    for (let i = 1; i < P.length; i++) {
      const ax = P[i - 1][0], ay = P[i - 1][1], dx = P[i][0] - ax, dy = P[i][1] - ay, l2 = dx * dx + dy * dy, l = Math.sqrt(l2);
      if (!l) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { s: L + t * l, d, ex: dx / l, ey: dy / l, i };
      L += l;
    }
    best.L = L; return best;
  }
  const lengde = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  // Biten av linjen fra s0 til s1 meter (s0 > s1 gir motsatt retning), med punkt minst hver «steg» meter
  function delLinje(P, s0, s1, steg = 2) {
    const snu = s0 > s1, a = Math.min(s0, s1), b = Math.max(s0, s1), ut = [];
    let L = 0;
    const på = s => { let l0 = 0; for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (l0 + l >= s || i === P.length - 1) { const f = l ? Math.max(0, Math.min(1, (s - l0) / l)) : 0; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; } l0 += l; } return P[0].slice(0, 2); };
    const knekk = [a]; for (let i = 1; i < P.length - 1; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (L > a && L < b) knekk.push(L); } knekk.push(b);
    for (let k = 0; k < knekk.length - 1; k++) { const n = Math.max(1, Math.ceil((knekk[k + 1] - knekk[k]) / steg)); for (let j = 0; j < n; j++) ut.push(på(knekk[k] + (knekk[k + 1] - knekk[k]) * j / n)); }
    ut.push(på(b));
    return snu ? ut.reverse() : ut;
  }
  // Brua langs vegen: begge endene av NVDB-brua (eller midten og lengden) projiseres på vegene i nærheten; den vegen som passer best gir
  // linjen og kategorien. linjer = [{ k, P }]. Uten treff: NVDB-geometrien (rett linje mellom endene).
  // bareVeg: gi null (ikke NVDB-linjen) når ingen veg passer – da prøver visningen de andre vegene før den gir opp.
  function finnLinje(bru, linjer, lengdeData, bareVeg) {
    const A = bru[0], B = bru[bru.length - 1], Ln = lengde(bru), en = bru.length < 2 || Ln < 1;
    let best = null;
    for (const v of linjer) {
      if (!VEGBREDDE[v.k] || v.P.length < 2) continue;
      if (en) {
        const p = projiser(v.P, A[0], A[1]), h = Math.max(4, (lengdeData || 10) / 2); if (p.d > 9) continue;
        const kost = p.d; if (!best || kost < best.kost) best = { kost, v, s0: Math.max(0, p.s - h), s1: Math.min(p.L, p.s + h) };
      } else {
        const pa = projiser(v.P, A[0], A[1]), pb = projiser(v.P, B[0], B[1]); if (pa.d > 10 || pb.d > 10) continue;
        const ds = Math.abs(pb.s - pa.s); if (ds < Ln * .6 || ds > Ln * 1.6 + 6) continue;
        const kost = pa.d + pb.d; if (!best || kost < best.kost) best = { kost, v, s0: pa.s, s1: pb.s };
      }
    }
    // NVDB-geometrien er av og til kortere enn brua (lengde i dataene): da forlenges den like mye i begge ender langs vegen
    if (best && !en && lengdeData > Math.abs(best.s1 - best.s0) * 1.15) {
      const sn = best.s1 > best.s0 ? 1 : -1, ekstra = (Math.min(lengdeData, Math.abs(best.s1 - best.s0) * 5 + 20) - Math.abs(best.s1 - best.s0)) / 2, L = lengde(best.v.P);
      best.s0 = Math.max(0, Math.min(L, best.s0 - sn * ekstra)); best.s1 = Math.max(0, Math.min(L, best.s1 + sn * ekstra));
    }
    if (best && Math.abs(best.s1 - best.s0) >= 4) return { P: delLinje(best.v.P, best.s0, best.s1), k: best.v.k, veg: true };
    if (en || bareVeg) return null;
    return { P: delLinje(bru, 0, Ln), k: null, veg: false };
  }
  // Dekkets overkant langs brua: rett linje mellom endene (+ litt overhøyde på lange bruer), aldri nærmere terrenget enn «klaring» meter,
  // jevnet ut så dekket ikke får knekker der terrenget stikker opp. g = terrenghøyde per punkt, s = meter langs brua.
  function profil(g, s, klaring = 1.1) {
    // i endene ligger dekket i vegens høyde (0,15 m over terrenget, ingen trapp opp på brua); full klaring fra 6 m inn på brua
    const n = g.length, L = s[n - 1] || 1, K = i => .15 + (klaring - .15) * Math.min(1, s[i] / 6, (L - s[i]) / 6);
    const zA = g[0] + .15, zB = g[n - 1] + .15, kam = L > 25 ? Math.min(2, L * .01) : 0;
    let z = g.map((_, i) => { const f = s[i] / L; return Math.max(zA + (zB - zA) * f + kam * 4 * f * (1 - f), g[i] + K(i)); });
    for (let k = 0; k < 3; k++) z = z.map((v, i) => i === 0 || i === n - 1 ? v : Math.max(.25 * z[i - 1] + .5 * v + .25 * z[i + 1], g[i] + K(i)));
    return z;
  }
  // Brutype: 'plate' (kort platebru/kulvert), 'bjelke' (bjelkebru med søyler), 'bue' (betongbue under dekket over juv/dyp dal),
  // 'henge' (hengebru med tårn og kabler, de lengste spennene), 'fagverk' (jernbanebru i stål)
  function velgType({ lengde: L, klaring: K, type, bueMulig }) {
    if (type === 2) return L >= 18 ? 'fagverk' : 'plate';
    if (L >= 350 && K >= 15) return 'henge';
    if (L >= 30 && L <= 280 && K >= 14 && bueMulig) return 'bue';
    if (L < 12 || K < 3) return 'plate';
    return 'bjelke';
  }
  // Hvor søylene står (meter langs brua): like lange spenn, lengre jo høyere brua er, og bare der det er plass under (klaring(s) > 2,5 m)
  function søyler(L, klaring, maksKlaring) {
    const mål = maksKlaring > 15 ? 42 : 30, n = Math.max(1, Math.round(L / mål)), ut = [];
    for (let i = 1; i < n; i++) { const s = L * i / n; if (klaring(s) > 2.5) ut.push(s); }
    return ut;
  }
  // Delene av brua som står igjen (meter langs brua): en sprengt bru har et gap i midten (som før: 35–65 %)
  const GAP = [.35, .65];
  const stykker = (L, sprengt) => sprengt ? [[0, L * GAP[0]], [L * GAP[1], L]] : [[0, L]];
  // Buen: fra der bakken ligger minst 45 % av den største klaringen under dekket i hver ende (fotpunktene i dalsidene), med toppen like under dekket midt på.
  // Gir null når det ikke er en dal å spenne over (for lite pil i forhold til spennet).
  function bue(s, g, zb) {
    const n = s.length, K = Math.max(3, .45 * Math.max(...zb.map((v, i) => v - g[i]))); let a = 0, b = n - 1;
    while (a < n - 1 && zb[a] - g[a] < K) a++;
    while (b > 0 && zb[b] - g[b] < K) b--;
    if (b - a < 4) return null;
    const sp = s[b] - s[a], z0 = Math.min(g[a], g[b]), topp = Math.min(...zb.slice(a, b + 1)) - .4;
    if (topp - z0 < sp * .14 || sp < 25) return null;
    return { s0: s[a], s1: s[b], z0: g[a], z1: g[b], topp };
  }
  // Ferjekaien: retningen ut mot ferjeleia (fra ferjelinja om den ender nær kaien, ellers mot mest vann) og vannkanten langs den.
  // vann(x, y) -> true/false; linjer = ferjelinjer [[x, y], ...] i samme koordinater som kaien (x, y).
  function kaiRetning(x, y, linjer, vann) {
    let best = null;
    for (const P of linjer) for (const ende of [0, 1]) {
      const Q = ende ? P.slice().reverse() : P, d = Math.hypot(Q[0][0] - x, Q[0][1] - y); if (d > 400 || (best && d >= best.d)) continue;
      // punktet 150 m ut langs ferjelinja
      let L = 0, px = Q[Q.length - 1][0], py = Q[Q.length - 1][1];
      for (let i = 1; i < Q.length; i++) { const l = Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); if (L + l >= 150) { const f = (150 - L) / l; px = Q[i - 1][0] + (Q[i][0] - Q[i - 1][0]) * f; py = Q[i - 1][1] + (Q[i][1] - Q[i - 1][1]) * f; break; } L += l; }
      const dx = px - x, dy = py - y, l = Math.hypot(dx, dy); if (l > 5) best = { d, dx: dx / l, dy: dy / l };
    }
    if (best) return [best.dx, best.dy];
    let mest = -1, ret = null;
    for (let a = 0; a < 24; a++) { const v = a / 24 * 2 * Math.PI, dx = Math.cos(v), dy = Math.sin(v); let n = 0; for (let r = 15; r <= 150; r += 15) if (vann(x + dx * r, y + dy * r)) n++; if (n > mest) { mest = n; ret = [dx, dy]; } }
    return mest > 2 ? ret : null;
  }
  // Vannkanten: første punkt langs retningen der det er vann i minst tre steg på rad (2 m steg, maks 300 m). Ligger kaien i vannet, går
  // den bakover til land. Gir avstanden fra kaipunktet (kan være negativ) eller null.
  function vannkant(x, y, dx, dy, vann) {
    const v = t => vann(x + dx * t, y + dy * t);
    if (v(0) && v(-2)) { for (let t = 0; t > -300; t -= 2) if (!v(t) && !v(t - 2)) return t + 2; return null; }
    for (let t = 0; t < 300; t += 2) if (v(t) && v(t + 2) && v(t + 4)) return t;
    return null;
  }
  const API = { VEGBREDDE, projiser, lengde, delLinje, finnLinje, profil, velgType, søyler, stykker, GAP, bue, kaiRetning, vannkant };
  if (typeof module !== 'undefined') module.exports = API; else rot.Bruer = API;
})(typeof window !== 'undefined' ? window : globalThis);
