'use strict';
// Test av spill/gagate.js: gågaten kjennes igjen på husrekkene, flaten går til veggene, møblene står i gata.
const assert = require('assert'), G = require('../../site/dovre-fliser/spill/gagate.js');
const rekt = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// en gate langs x fra 0 til 200 m; hus på begge sider med 12 m mellom veggene (y = ±6), i tett sentrum (mange hus bak)
function by(halv, hull = false) { const o = [];
  for (let x = -40; x < 240; x += 16) for (const s of [1, -1]) { if (hull && s > 0 && x > 40 && x < 160) continue; o.push(s > 0 ? rekt(x, halv, x + 14, halv + 12) : rekt(x, -halv - 12, x + 14, -halv)); }
  for (let x = -40; x < 240; x += 18) for (const y of [40, 60, -40, -60]) o.push(rekt(x, y, x + 12, y + 10));
  return o; }
const gate = { k: 'K', by: true, P: Array.from({ length: 41 }, (_, i) => [i * 5, 0, 10]) };
{ const R = G.husRute(by(6)), m = G.mål(gate.P, R), tett = G.tetthet(R, 100, 0);
  assert.ok(tett >= G.REGLER.TETT, 'tett sentrum ' + tett);
  assert.ok(Math.abs(m[10].v - 6) < 1e-6 && Math.abs(m[10].h - 6) < 1e-6, 'veggene 6 m unna');
  assert.ok(G.erGågate(gate, m, tett), 'smal gate med hus på begge sider er gågate');
  assert.ok(!G.erGågate({ ...gate, k: 'F' }, m, tett), 'fylkesveg er ikke gågate');
  assert.ok(!G.erGågate({ ...gate, by: false }, m, tett), 'utenfor tettsted: nei');
  assert.ok(!G.erGågate(gate, m, 10), 'spredt bebyggelse: nei');
  assert.ok(G.erGågate({ k: 'F', g: 2, P: gate.P }, m, 0), 'g = 2 fra dataene er alltid gågate');
  const b = G.bredder(m, 3); assert.ok(b.vl.every(x => x > 5.5 && x <= 6), 'flaten går til veggen');
  const M = G.møbler(m, b, () => true, true);
  assert.ok(M.benk.length >= 5 && M.kasse.length >= 5 && M.lykt.length >= 8, 'benker, kasser og lykter');
  for (const sl of Object.keys(M)) for (const [x, y] of M[sl]) assert.ok(Math.abs(y) < 6 - .3, sl + ' står i gata, ikke i veggen: ' + y);
  const vinter = G.møbler(m, b, () => true, false); assert.strictEqual(vinter.bord.length, 0, 'ingen uteservering om vinteren'); }
// bred gate (30 m mellom veggene) er ikke gågate etter regelen (bilgate med fortau)
{ const R = G.husRute(by(15)), m = G.mål(gate.P, R); assert.ok(!G.erGågate(gate, m, G.tetthet(R, 100, 0)), 'bred gate: nei'); }
// åpen på den ene siden det meste av lengden: ikke gågate
{ const R = G.husRute(by(6, true)), m = G.mål(gate.P, R); assert.ok(!G.erGågate(gate, m, G.tetthet(R, 100, 0)), 'åpen side: nei');
  // hullet fylles med nabobredden, ikke MAKS
  const b = G.bredder(m, 3); assert.ok(Math.max(...b.vl) <= 6, 'hullet fylles jevnt'); }
console.log('test_gagate: alt i orden');
