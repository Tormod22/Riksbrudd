'use strict';
// Test av spill/parkering.js: rader, plasser, kjørefelt, innkjøring, handlevognskur og biler.
const assert = require('assert'), P = require('../../site/dovre-fliser/spill/parkering.js');
const rekt = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// 1) en plass på 60 × 34 m: to dobbeltrader (16 + 16 = 32 m) med plasser langs den lengste siden
{ const pl = P.plan(rekt(0, 0, 60, 34), { fyll: 0 });
  assert.ok(pl.plasser.length >= 50, 'mange plasser: ' + pl.plasser.length);
  // ingen plass utenfor omrisset og ingen to plasser oppå hverandre
  for (const p of pl.plasser) assert.ok(p.x > 0 && p.x < 60 && p.y > 0 && p.y < 34);
  for (let i = 0; i < pl.plasser.length; i++) for (let j = i + 1; j < pl.plasser.length; j++) {
    const a = pl.plasser[i], b = pl.plasser[j]; assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 2.49, 'plasser oppå hverandre'); }
  // radene går langs x (lengste side): bilene står langs y
  assert.ok(Math.abs(Math.abs(Math.sin(pl.plasser[0].ret)) - 1) < 1e-6, 'bilene står på tvers av lengderetningen');
  assert.strictEqual(pl.felt.length, 2, 'to kjørefelt');
  for (const [a, b] of pl.felt) assert.ok(Math.abs(b - a - 6) < 1e-9, 'feltet er 6 m');
  assert.strictEqual(pl.biler.length, 0, 'fyll 0 gir ingen biler');
  assert.ok(pl.linjer.length > pl.plasser.length, 'striper mellom plassene'); }
// 2) lang plass (90 m) får øy med trær og lykter; endefelt i begge ender
{ const pl = P.plan(rekt(0, 0, 90, 40), { fyll: 1 });
  assert.ok(pl.øyer.length >= 1 && pl.trær.length >= 3, 'øy med trær'); assert.ok(pl.lykter.length >= 2, 'lykter');
  assert.strictEqual(pl.biler.length, pl.plasser.length, 'fyll 1 gir bil på alle');
  const minX = Math.min(...pl.plasser.map(p => p.x)); assert.ok(minX > 6, 'endefelt holdes fritt: ' + minX); }
// 3) for liten plass: ingenting
{ const pl = P.plan(rekt(0, 0, 6, 4), {}); assert.strictEqual(pl.plasser.length, 0); }
// 4) skrå plass: plassene følger den lengste siden (45°)
{ const c = Math.SQRT1_2, R = ([x, y]) => [x * c - y * c, x * c + y * c], pl = P.plan(rekt(0, 0, 50, 20).map(R), { fyll: 0 });
  assert.ok(pl.plasser.length > 20); const a = ((pl.plasser[0].ret % Math.PI) + Math.PI) % Math.PI;
  assert.ok(Math.abs(a - 3 * Math.PI / 4) < 1e-6 || Math.abs(a - Math.PI / 4) < 1e-6, 'retning ' + a); }
// 5) innkjøring mot nærmeste veg, og vegen inne på plassen teller ikke
{ const veg = { P: [[-30, -20], [-30, 60]], w: 3 }, pl = P.plan(rekt(0, 0, 60, 34), { veger: [veg] });
  assert.ok(pl.inn && Math.abs(pl.inn.x) < 1e-6 && Math.abs(pl.inn.tx + 30) < 1e-6, 'innkjøring fra venstre kant'); 
  const pl2 = P.plan(rekt(0, 0, 60, 34), { veger: [{ P: [[30, -5], [30, 40]], w: 3 }] }); assert.ok(pl2.inn === null || !P.inni(rekt(0, 0, 60, 34), pl2.inn.tx, pl2.inn.ty)); }
// 6) handlevognskur nær butikken tar to plasser
{ const uten = P.plan(rekt(0, 0, 60, 34), {}), med = P.plan(rekt(0, 0, 60, 34), { butikk: { x: 30, y: 45 } });
  assert.strictEqual(med.kur.length, 1); assert.strictEqual(uten.plasser.length - med.plasser.length, 2);
  assert.ok(med.kur[0].y > 18, 'skuret står nær butikken'); }
// 7) fyllingsgraden etter tid og butikk; samme sted gir samme biler
{ assert.ok(P.fyll(12, true) > P.fyll(12, false) && P.fyll(3, true) < P.fyll(12, true) && P.fyll(8, true) > P.fyll(3, true));
  const a = P.plan(rekt(0, 0, 60, 34), { fyll: .5 }), b = P.plan(rekt(0, 0, 60, 34), { fyll: .5 });
  assert.deepStrictEqual(a.biler, b.biler); assert.ok(a.biler.length > 10 && a.biler.length < a.plasser.length - 10);
  const l = P.ledig(a, 0, 0); assert.ok(l && !l.bil, 'ledig plass'); }
console.log('test_parkering: alt i orden');
