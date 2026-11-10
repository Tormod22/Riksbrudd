// Test av reglene for ferjer i rute og båter som kjører (site/dovre-fliser/spill/ferje.js). Kjør: node pipeline/fliser/test_ferje.js
const F = require('../../site/dovre-fliser/spill/ferje.js');
let feil = 0; const sjekk = (ok, tekst) => { console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); if (!ok) feil++; };
const nær = (a, b, e) => Math.abs(a - b) <= e;

// En ferjelinje på ca. 2,6 km med en knekk, og kaier i begge ender (liggeplassen 60 m ut, retningen ut mot linja).
const P = [[0, 0], [800, 150], [1600, 120], [2500, 0]];
const A = { x: 60, y: 0, fx: 1, fy: 0 }, B = { x: 2440, y: 0, fx: -1, fy: 0 };
const R = F.lagRute(P, A, B, { id: 42 });
sjekk(R.L > 2300 && R.L < 2900, `rutelengden er rimelig (${R.L.toFixed(0)} m)`);
sjekk(nær(R.P[0][0], A.x, .01) && nær(R.P[0][1], A.y, .01) && nær(R.P[R.P.length - 1][0], B.x, .01), 'ruta starter og slutter ved liggeplassene');
sjekk(R.vent >= 60 && R.vent <= 120, `venting ved kai 60–120 s (${R.vent.toFixed(0)} s)`);
// fartsprofilen: marsjfart 6,5 m/s, tida stemmer med lengden
const r = R.reise;
sjekk(nær(r.v, 6.5, 1e-9) && r.tm > 0, `marsjfart 6,5 m/s på en lang rute (${r.v} m/s, ${r.tm.toFixed(0)} s i marsjfart)`);
sjekk(nær(F.langs(r, r.T).s, R.L, 1e-6) && nær(F.langs(r, r.ta + r.tm).s, R.L - r.db, 1e-6), 'strekningen går opp: akselerasjon + marsj + bremsing = lengden');
let maksV = 0, maksA = 0, forrige = 0, ok = true;
for (let t = 0; t <= r.T; t += .5) { const l = F.langs(r, t); maksV = Math.max(maksV, l.v); if (t > 0) maksA = Math.max(maksA, Math.abs(l.v - forrige) / .5); if (l.s < -1e-9 || l.s > R.L + 1e-9) ok = false; forrige = l.v; }
sjekk(ok && maksV <= 6.5 + 1e-9 && maksA <= .12 + 1e-6, `aldri over 6,5 m/s og myk akselerasjon (maks ${maksA.toFixed(3)} m/s²)`);
const kort = F.reise(200);
sjekk(kort.v < 6.5 && Math.abs(kort.tm) < 1e-9 && nær(F.langs(kort, kort.T).s, 200, 1e-6), `kort rute: når ikke marsjfart, men kommer fram (${kort.v.toFixed(2)} m/s)`);
// ruteplanen: vent ved A, til B, vent ved B, tilbake
const tA = (1 - R.fase) * 2 * (R.vent + r.T);   // tida der en runde begynner (ferja kommer til A)
const st = dt => F.tilstand(R, tA + dt);
sjekk(st(1).ved === 'A' && st(1).v === 0 && st(1).s === 0, 'ligger ved A i starten av runden');
sjekk(st(R.vent + 1).retning === 1 && st(R.vent + 1).v > 0 && st(R.vent + 1).v < 1, 'går fra A mot B og akselererer sakte');
sjekk(nær(st(R.vent + r.T / 2).v, 6.5, 1e-6), 'midt i overfarten i marsjfart');
sjekk(st(R.vent + r.T + 1).ved === 'B' && nær(st(R.vent + r.T + 1).s, R.L, 1e-6), 'ligger ved B etter overfarten');
sjekk(st(2 * R.vent + r.T + 10).retning === -1 && st(2 * R.vent + r.T + 10).s < R.L, 'går tilbake mot A (snur ikke: retning −1)');
sjekk(st(2 * (R.vent + r.T) - .01).s < 1 && st(2 * (R.vent + r.T) + 1).ved === 'A', 'er tilbake ved A når runden er over');
// ved kai: venter mellom 60 og 120 s, igjen teller ned
sjekk(nær(st(1).igjen, R.vent - 1, 1e-6), 'tid igjen til avgang teller ned');
// stillingen: på linja ved kai, skroget peker langs ruta og snur ikke
const s0 = F.stilling(R, tA + 1), sB = F.stilling(R, tA + R.vent + r.T + 1), sTil = F.stilling(R, tA + R.vent + r.T / 2), sFra = F.stilling(R, tA + 2 * R.vent + r.T + r.T / 2);
sjekk(nær(s0.x, A.x, .01) && nær(s0.y, A.y, .01) && nær(sB.x, B.x, .01), 'ved kai står ferja på liggeplassen');
sjekk(s0.hx > .99 && sB.hx > .9, 'skroget peker ut fra A ved kai og samme vei ved B (dobbeltendet)');
sjekk(sTil.hx * sFra.hx + sTil.hy * sFra.hy > .9, 'samme retning på skroget begge veier (snur ikke)');
// styrbord: på veg mot B ligger ferja til høyre for linja, på veg tilbake på den andre siden – to ferjer går forbi hverandre
const mid = F.punkt(R, sTil.s), kryss = (p, q) => (p.x - mid.x) * mid.dy - (p.y - mid.y) * mid.dx;
const s2 = F.stilling(R, tA + R.vent + r.T / 2, .5);
sjekk(kryss(sTil, mid) > 15 && Math.abs(F.avvik(R, 0, 1)) < 1e-9 && Math.abs(F.avvik(R, R.L, -1)) < 1e-9, `styrbord midt i sambandet (${kryss(sTil, mid).toFixed(1)} m), ingen avvik ved kai`);
sjekk(s2.retning === -1 || s2.ved, 'to ferjer på samme rute (forskjøvet en halv runde) går hver sin vei');
let minAvst = Infinity; for (let t = 0; t < 2 * (R.vent + r.T); t += 2) { const a = F.stilling(R, t), b = F.stilling(R, t, .5); minAvst = Math.min(minAvst, Math.hypot(a.x - b.x, a.y - b.y)); }
sjekk(minAvst > 30, `to ferjer på samme rute kolliderer ikke (nærmest ${minAvst.toFixed(0)} m)`);
// uten kaier: ruta går mellom linjas ender
const R2 = F.lagRute(P, null, null, { id: 7 });
sjekk(nær(R2.P[0][0], 0, 1e-9) && nær(R2.P[R2.P.length - 1][0], 2500, 1e-9), 'uten ferjekai går ruta mellom linjas ender');

// ---------- båter som kjører rundt ----------
// sjø i en sirkel med radius 600 m, minst 30 m fra land = innenfor 570 m
const fri = (x, y) => Math.hypot(x, y) < 570;
let frø = 1; const rnd = () => (frø = (frø * 16807) % 2147483647) / 2147483647;
const båt = { x: 0, y: 0, a: 0, v: 0, vmål: 4 };
let påLand = 0, strekning = 0, maksB = 0;
for (let i = 0; i < 6000; i++) { const x0 = båt.x, y0 = båt.y; F.kjør(båt, .1, fri, rnd, false); strekning += Math.hypot(båt.x - x0, båt.y - y0); maksB = Math.max(maksB, båt.v); if (!fri(båt.x, båt.y)) påLand++; }
sjekk(påLand === 0, 'båten holder seg på sjøen minst 30 m fra land (10 min)');
sjekk(strekning > 1200 && maksB <= 4.01, `båten kjører rundt (${strekning.toFixed(0)} m på 10 min, maks ${maksB.toFixed(1)} m/s)`);
for (let i = 0; i < 200; i++) F.kjør(båt, .1, fri, rnd, true);
sjekk(båt.v < .01, 'i storm stopper båten');
// gynging: stille nesten ingenting, storm kraftig, ved kai mindre enn ute
const g0 = F.gynging(0, true), g8 = F.gynging(8, true), g20 = F.gynging(20, true), gk = F.gynging(20, false);
sjekk(g0.amp < .1 && g20.amp > 2 && g8.amp > g0.amp && g20.amp > g8.amp, `gyngingen øker med vinden (${g0.amp.toFixed(2)} / ${g8.amp.toFixed(2)} / ${g20.amp.toFixed(2)})`);
sjekk(gk.amp < g20.amp * .5 && g20.takt > g0.takt, 'ved kai gynger båtene mindre, og takten øker med vinden');
// antall som kjører: 2–6, mobil høyst 3, ingen i storm
const n = [...Array(50)].map((_, i) => F.antallKjører(5, 40, false, i));
sjekk(Math.min(...n) >= 2 && Math.max(...n) <= 6 && F.antallKjører(5, 40, true, 3) <= 3 && F.antallKjører(15, 40, false, 3) === 0 && F.antallKjører(5, 1, false, 3) <= 1,
  `2–6 båter kjører (mobil høyst 3, ingen i storm)`);
process.exit(feil ? 1 : 0);
