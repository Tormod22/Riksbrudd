'use strict';
// Gågater (brukeren 21. nov: «gågater ser bare ut som vanlige gater per i dag»). Regler uten DOM (test: node pipeline/fliser/test_gagate.js);
// 3D i spill/gagate3d.js, 2D i kartflis.js (gagater()).
//
// Slik ser norske gågater ut (Kirkegata og Skagen i Stavanger, Torgallmenningen og Strandgaten i Bergen, Karl Johans gate i Oslo,
// Nordre gate i Trondheim – se docs/natt/by.md): heldekkende brostein eller heller fra husvegg til husvegg, ingen kantstein, ingen
// kjørebane og ingen oppmerking, benker, blomsterkasser, trær i kasser eller i bakken, lykter (ofte på veggene eller lave stolper),
// uteservering langs veggene om sommeren og folk som går midt i gata.
//
// HVILKE GATER ER GÅGATER?
// (1) Nye vektorfliser: g = 2 (NVDB-typene «Gågate» og «Gatetun», pipeline/fliser/vegtype.py). Krever at vektorflisene bygges på nytt.
// (2) Til da (g mangler, eller g = 1): en kommunal veg (K) eller gangveg i et tettsted der
//     – det er sentrum (minst TETT bygg innen 100 m fra midten av gata, samme grense som Byhus bruker for «sentrum»),
//     – husveggene står tett på begge sider (begge veggene innen VEGG m fra midtlinja) på minst ANDEL av lengden,
//     – gata er smal fra vegg til vegg (høyst SMAL m i snitt) og mellom LENGDE[0] og LENGDE[1] m lang.
//     Tanken: i norske bysentrum er de smale gatene med sammenhengende husrekker på begge sider nesten alltid gågater eller
//     gatetun (Stavanger, Bergen, Trondheim, Kristiansand); bilgatene er bredere eller har åpninger. Regelen bommer på noen smale
//     bilgater i sentrum og på brede gågater som Karl Johan og Torgallmenningen (de kommer med g = 2).
(function (rot) {
  // Alle tallene her er Claudes forslag.
  const REGLER = {
    // (21. nov) strammet inn etter første prøve i Stavanger: 108 gatebiter ble gågater, også smale bilgater. Strengere til g = 2 kommer i dataene.
    TETT: 60, VEGG: 7, ANDEL: .8, SMAL: 12, LENGDE: [40, 450],
    // avstanden mellom målepunktene langs gata og lengste stråle mot veggen
    STEG: 4, MAKS: 14,
    // flaten: aldri smalere enn dette på hver side av midten, og så nær veggen (m)
    MIN_HALV: 3, LUFT: .15, MAKS_HALV: 12,
    // møblene: avstand langs gata og hvor langt fra veggen
    BENK: 22, KASSE: 17, LYKT: 20, TRE: 26, BORD: 9, FRA_VEGG: 1.4
  };
  function hash(a, b, s = 0) {
    let h = (Math.imul(Math.round(a) | 0, 73856093) ^ Math.imul(Math.round(b) | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // Rutenett med husveggene (biter) og husenes midtpunkt. omriss: [[[x, y], …], …]
  function husRute(omriss, C = 16) {
    const vegg = new Map(), midt = new Map(), key = (i, j) => (i + 32768) * 65536 + (j + 32768);
    for (const P of omriss) { if (!P || P.length < 3) continue; let sx = 0, sy = 0;
      for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; sx += a[0]; sy += a[1];
        for (let i = Math.floor(Math.min(a[0], b[0]) / C); i <= Math.floor(Math.max(a[0], b[0]) / C); i++)
          for (let j = Math.floor(Math.min(a[1], b[1]) / C); j <= Math.floor(Math.max(a[1], b[1]) / C); j++) { const k2 = key(i, j); let l = vegg.get(k2); if (!l) vegg.set(k2, l = []); l.push([a[0], a[1], b[0], b[1]]); } }
      const mx = sx / P.length, my = sy / P.length, k3 = key(Math.floor(mx / C), Math.floor(my / C)); let l = midt.get(k3); if (!l) midt.set(k3, l = []); l.push([mx, my]); }
    return { C, vegg, midt, key };
  }
  // Avstanden fra (x, y) i retning (dx, dy) (enhetsvektor) til nærmeste husvegg, høyst maks; null = ingen vegg
  function stråle(R, x, y, dx, dy, maks) {
    let best = null; const sett = new Set();
    for (let t = 0; t <= maks + R.C; t += R.C / 2) { const k = R.key(Math.floor((x + dx * Math.min(t, maks)) / R.C), Math.floor((y + dy * Math.min(t, maks)) / R.C)); if (sett.has(k)) continue; sett.add(k);
      for (const [ax, ay, bx, by] of R.vegg.get(k) || []) {
        const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
        const s = ((ax - x) * ey - (ay - y) * ex) / den, u = ((ax - x) * dy - (ay - y) * dx) / den;
        if (s >= 0 && s <= maks && u >= 0 && u <= 1 && (best === null || s < best)) best = s; }
      if (best !== null && best < t - R.C) break; }
    return best;
  }
  function tetthet(R, x, y, r = 100) { let n = 0; const c = Math.ceil(r / R.C);
    for (let j = -c; j <= c; j++) for (let i = -c; i <= c; i++) for (const [mx, my] of R.midt.get(R.key(Math.floor(x / R.C) + i, Math.floor(y / R.C) + j)) || []) if ((mx - x) ** 2 + (my - y) ** 2 <= r * r) n++;
    return n; }
  const lengde = P => { let l = 0; for (let i = 1; i < P.length; i++) l += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return l; };
  // Målepunkt hver STEG m langs P: { x, y, z, nx, ny (venstre normal), v (venstre vegg), h (høyre vegg), i (punktet i P) }
  function mål(P, R) {
    const ut = [], L = lengde(P), n = Math.max(2, Math.round(L / REGLER.STEG) + 1); let i = 1, acc = 0;
    for (let s = 0; s < n; s++) { const t = s / (n - 1) * L;
      while (i < P.length - 1 && acc + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) < t) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); i++; }
      const a = P[i - 1], b = P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, q = Math.max(0, Math.min(1, (t - acc) / l));
      const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q, z = (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * q, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      ut.push({ x, y, z, nx, ny, t, v: stråle(R, x, y, nx, ny, REGLER.MAKS), h: stråle(R, x, y, -nx, -ny, REGLER.MAKS) }); }
    return ut;
  }
  // Er gata en gågate? v: { k, g, by }, m: målepunktene, tett: bygg innen 100 m fra midten
  function erGågate(v, m, tett) {
    if (v.g === 2) return true;
    const R = REGLER; if (!(v.k === 'K' || v.g === 1) || !v.by || v.t) return false;
    const L = m.length ? m[m.length - 1].t : 0; if (L < R.LENGDE[0] || L > R.LENGDE[1] || tett < R.TETT) return false;
    let begge = 0, sum = 0; for (const p of m) if (p.v !== null && p.h !== null && p.v <= R.VEGG && p.h <= R.VEGG) { begge++; sum += p.v + p.h; }
    return begge >= R.ANDEL * m.length && sum / Math.max(1, begge) <= R.SMAL;
  }
  // Bredden på flaten på hver side (vl, vh) per målepunkt: inntil veggen (minus LUFT), ellers som nabopunktene, aldri under MIN_HALV
  function bredder(m, w = 3) {
    const R = REGLER, f = side => { const a = m.map(p => p[side] === null ? null : Math.max(R.MIN_HALV, Math.min(R.MAKS_HALV, p[side] - R.LUFT)));
      // hull (åpning mellom husene) fylles med nærmeste kjente bredde, så flaten ikke hopper
      for (let i = 0; i < a.length; i++) if (a[i] === null) { let j = i; while (j < a.length && a[j] === null) j++; const fyll = Math.max(w, Math.min(a[i - 1] ?? R.MIN_HALV, a[j] ?? a[i - 1] ?? R.MIN_HALV)); for (let k = i; k < j; k++) a[k] = fyll; i = j; }
      // glatt litt (tre punkter), men aldri inn i veggen
      return a.map((x, i) => Math.min(x, ((a[i - 1] ?? x) + x + (a[i + 1] ?? x)) / 3 + .4)); };
    return { vl: f('v'), vh: f('h') };
  }
  // Møblene langs gata: { benk, kasse, lykt, tre, bord } = [[x, y, z, retning], …]. Retningen dreier modellens +y mot midten av gata.
  // bredde: { vl, vh }; plass(x, y) = er det fritt der (ikke i hus, ikke i en annen ting)
  function møbler(m, b, plass = () => true, sommer = true) {
    const R = REGLER, ut = { benk: [], kasse: [], lykt: [], tre: [], bord: [] }, tatt = [];
    const fri = (x, y, r) => tatt.every(([a, c, q]) => Math.hypot(a - x, c - y) > r + q) && plass(x, y);
    const legg = (slag, p, i, sd, avst, r) => { const halv = sd > 0 ? b.vl[i] : b.vh[i]; if (halv < R.MIN_HALV + .5) return;
      const d = Math.max(.9, halv - avst), x = p.x + p.nx * sd * d, y = p.y + p.ny * sd * d; if (!fri(x, y, r)) return;
      tatt.push([x, y, r]); ut[slag].push([x, y, p.z, Math.atan2(p.nx * sd, -p.ny * sd)]); };
    for (let i = 0; i < m.length; i++) { const p = m[i], t = p.t, sd = hash(p.x, p.y, 1) < .5 ? 1 : -1;
      // ved hvert STEG m: sjekk om det er tid for hver slags ting (fast mønster langs gata, side etter hash)
      const nå = per => Math.floor(t / per) !== Math.floor((t - R.STEG) / per) || i === 0;
      if (nå(R.LYKT)) legg('lykt', p, i, (Math.floor(t / R.LYKT) % 2) ? 1 : -1, .45, .4);
      if (nå(R.BENK) && i > 0) legg('benk', p, i, sd, R.FRA_VEGG + .4, 1);
      if (nå(R.KASSE) && i > 1) legg('kasse', p, i, -sd, R.FRA_VEGG + .6, .8);
      // trær i bred gate (minst 6 m på hver side), midt mellom veggen og midten
      if (nå(R.TRE) && i > 1 && b.vl[i] > 6 && b.vh[i] > 6) { const s2 = hash(p.x, p.y, 4) < .5 ? 1 : -1, halv = s2 > 0 ? b.vl[i] : b.vh[i], x = p.x + p.nx * s2 * halv * .5, y = p.y + p.ny * s2 * halv * .5;
        if (fri(x, y, 1.6)) { tatt.push([x, y, 1.6]); ut.tre.push([x, y, p.z, 0]); } }
      // uteservering om sommeren: bord med parasoll inntil veggen, her og der (ca. hvert tredje hus)
      if (sommer && nå(R.BORD) && hash(Math.floor(t / 30), p.x | 0, 9) < .45) legg('bord', p, i, -sd, R.FRA_VEGG, 1.1);
    }
    return ut;
  }
  const Gagate = { REGLER, husRute, stråle, tetthet, mål, erGågate, bredder, møbler, lengde, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = Gagate; else rot.Gagate = Gagate;
})(typeof globalThis !== 'undefined' ? globalThis : this);
