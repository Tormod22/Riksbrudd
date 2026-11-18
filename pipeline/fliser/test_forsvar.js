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
// (runde 4) mot røverne i leiren: hvert lag mot nærmeste røver, 50 m fra den på sin egen side
{ const M = F.motHerjere([{ x: 1300, y: 1000 }, { x: 1000, y: 700 }], [{ x: 1100, y: 1000 }, { x: 1000, y: 950 }], leir);
  assert.strictEqual(M.length, 2); assert.ok(M[0].fi.x === 1100 && Math.abs(M[0].mål.x - 1150) < 1e-9 && Math.abs(M[0].mål.y - 1000) < 1e-9, 'laget øst for leiren går mot røveren i øst og stiller seg 50 m fra den');
  assert.ok(M[1].fi.y === 950 && Math.abs(M[1].mål.y - 900) < 1e-9, 'laget i sør tar den nærmeste'); assert.strictEqual(F.motHerjere([{ x: 1, y: 1 }], [], leir).length, 0, 'ingen røvere inne: ingen ordre');
  const Q = F.motHerjere([{ x: 1010, y: 1000 }], [{ x: 1000, y: 1000 }], leir); assert.ok(Math.hypot(Q[0].mål.x - 1000, Q[0].mål.y - 1000) <= 10 + 1e-9, 'et lag like ved går ikke lenger bort'); }
// (runde 4) reparasjon: de mest skadde først, bare så mange som det er ledige byggelag, og reserven blir igjen i kassa
{ const B = [{ id: 1, hp: .9, pris: 1e5 }, { id: 2, hp: .3, pris: 7e5 }, { id: 3, hp: .5, pris: 4e5, opptatt: true }, { id: 4, hp: .97, pris: 2e4 }, { id: 5, hp: 0, pris: 1e6 }];
  assert.deepStrictEqual(F.velgReparasjon(B, 2, 5e6), [2, 1]); assert.deepStrictEqual(F.velgReparasjon(B, 1, 5e6), [2]); assert.deepStrictEqual(F.velgReparasjon(B, 3, 6e5), [1], 'for dyrt: hopper over, tar det neste');
  assert.deepStrictEqual(F.velgReparasjon(B, 3, 3.5e5), [], 'reserven (300 000 kr) blir alltid igjen'); assert.deepStrictEqual(F.velgReparasjon(B, 0, 5e6), []);
  const s = F.skadet(B); assert.strictEqual(s.n, 4); assert.strictEqual(s.pris, 1e5 + 7e5 + 2e4); assert.strictEqual(s.tekst, '4 bygg er skadet'); assert.strictEqual(F.skadet([{ hp: .5, pris: 1 }]).tekst, 'Ett bygg er skadet'); }
console.log('ok   forsvar: mot røverne i leiren, reparasjon og skadevarsel');
