// Regeltest for spill/forsvar.js: node pipeline/fliser/test_forsvar.js
const F = require('../../site/dovre-fliser/spill/forsvar'), assert = require('assert');
let b = F.beredskap({ lag: 0, tårn: 0, sekker: 0, varsling: 0, vakter: 0, ammo: 1, bølge: 2 }); assert.strictEqual(b.sum, 10, 'bare ammunisjon gir poeng'); assert.strictEqual(b.ord, 'forsvarsløst'); assert.ok(/Ingen lag/.test(b.råd[0]), 'det viktigste rådet først');
b = F.beredskap({ lag: 2, tårn: 1, sekker: 2, varsling: 800, vakter: 4, ammo: 1, bølge: 2 }); assert.strictEqual(b.sum, 100); assert.strictEqual(b.ord, 'godt forberedt'); assert.strictEqual(b.råd.length, 0);
b = F.beredskap({ lag: 1, tårn: 1, sekker: 1, varsling: 300, vakter: 2, ammo: .25, bølge: 2 }); assert.ok(b.sum > 40 && b.sum < 70); assert.ok(b.punkter.find(p => p.id === 'lag').poeng === 18);
assert.strictEqual(F.retning(0), 'øst'); assert.strictEqual(F.retning(Math.PI / 2), 'nord'); assert.strictEqual(F.retning(-Math.PI / 2), 'sør');
// stillinger: uten voller en bue mot fienden
const leir = { x: 1000, y: 1000 }; let S = F.stillinger(leir, 0, 3);
assert.strictEqual(S.length, 3); for (const p of S) { assert.ok(Math.abs(Math.hypot(p.x - 1000, p.y - 1000) - F.R.radius) < 1e-9); assert.ok(p.x > 1000, 'på fiendens side'); assert.ok(!p.voll); }
assert.ok(Math.min(...S.map((p, i) => Math.min(...S.filter((q, j) => j !== i).map(q => Math.hypot(p.x - q.x, p.y - q.y))))) > 25, 'lagene står ikke oppå hverandre');
// med voller: vollen mot fienden tas først, den på baksiden ikke
S = F.stillinger(leir, 0, 2, [{ x: 1060, y: 1005 }, { x: 930, y: 1000 }]); assert.ok(S[0].voll && S[0].x > 1040 && S[0].x < 1060, 'bak vollen sett fra fienden'); assert.ok(!S[1].voll);
const lag = [{ x: 1050, y: 1004, navn: 'a' }, { x: 900, y: 1000, navn: 'b' }], Fo = F.fordel(lag, S); assert.strictEqual(Fo.length, 2); assert.ok(Fo[0].plass.voll && Fo[0].lag.navn === 'a', 'vollen går til laget som er nærmest den');
assert.strictEqual(F.fordel(lag, [S[0]]).length, 1, 'ikke flere lag enn plasser');
assert.ok(Math.abs(F.ankomst(1300 * 1.3) - 21.67) < .01); assert.strictEqual(F.vaktStørrelse(1), 0); assert.strictEqual(F.vaktStørrelse(5), 5); assert.strictEqual(F.vaktStørrelse(30), 12);
assert.strictEqual(F.rapport({ fiender: 2, fienderUte: 2, falne: 1, sårede: 2, bygg: 1 }), 'alle 2 røverlag er slått ut, vi har 1 falne og 2 sårede, 1 bygg ble skadet.'); assert.ok(/ingen tap/.test(F.rapport({ fiender: 1, fienderUte: 1, falne: 0, sårede: 0, bygg: 0 })));
console.log('ok   forsvar: beredskap, stillinger, fordeling, ankomst, leirvakt og rapport');
