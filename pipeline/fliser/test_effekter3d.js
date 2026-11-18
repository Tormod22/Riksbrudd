// Test av reglene i spill/effekter3d.js: node pipeline/fliser/test_effekter3d.js
const assert = require('assert'), E = require('../../site/dovre-fliser/spill/effekter3d.js');
// underlag: støv bare på tørr grus/terreng, aldri på asfalt eller snø
assert.strictEqual(E.underlag('asfalt', false, 0).støv, 0); assert.strictEqual(E.underlag('asfalt', false, 0).spor, 0);
assert.strictEqual(E.underlag('grus', false, 0).støv, 1); assert.ok(E.underlag(null, false, 0).støv > 0 && E.underlag(null, false, 0).støv < 1);
assert.strictEqual(E.underlag('grus', false, 1).støv, 0, 'våt grus støver ikke'); assert.ok(E.underlag('grus', false, 1).spor > 0, 'men gir spor');
const snø = E.underlag('asfalt', true, 0); assert.ok(snø.snø && snø.støv === 0 && snø.spor > 0, 'snø gir spor også på asfalt');
// områder: tolerant lesing
assert.deepStrictEqual(E.områder(undefined), []); assert.deepStrictEqual(E.områder(null), []); assert.deepStrictEqual(E.områder(5), []);
assert.strictEqual(E.områder([{ x: 1, y: 2, r: 3 }, { x: 'a', y: 2 }, null, { X: 4, Y: 5 }, [7, 8, 9], { x: 1, y: 1, radius: 20, styrke: .5 }]).length, 4);
assert.strictEqual(E.områder([{ x: 1, y: 2 }])[0].r, 12, 'uten r: 12 m'); assert.strictEqual(E.områder([[7, 8, 9]])[0].r, 9);
assert.strictEqual(E.områder(new Map([['a', { x: 1, y: 2, r: 3 }]])).length, 1, 'Map leses'); assert.strictEqual(E.områder({ a: { x: 1, y: 2, r: 3 } }).length, 1, 'objekt leses');
assert.strictEqual(E.områder(Array.from({ length: 30 }, (_, i) => ({ x: i, y: 0, r: 5 })), 14).length, 14);
// formen fra pakka «verden»: { x, y, r, t } og { x, y, r, fra, til }
assert.strictEqual(E.områder([{ x: 196000, y: 6899000, r: 32, t: 500 }, { x: 196064, y: 6899000, r: 32, fra: 1, til: 9 }]).length, 2);
assert.strictEqual(E.områder([{ x: 0, y: 0, r: 1e6 }])[0].r, 400, 'tak på radien');
// brentVed: 1 i midten, 0 utenfor
const om = E.områder([{ x: 0, y: 0, r: 50 }]); assert.strictEqual(E.brentVed(om, 0, 0), 1); assert.strictEqual(E.brentVed(om, 60, 0), 0); assert.ok(E.brentVed(om, 45, 0) > 0 && E.brentVed(om, 45, 0) < 1);
// sporStyrke: fullt først, tones bort, borte etter sporTid
assert.strictEqual(E.sporStyrke(0), 1); assert.strictEqual(E.sporStyrke(E.REGLER.sporTid), 0); const m = E.sporStyrke(E.REGLER.sporTid - E.REGLER.sporTone / 2); assert.ok(Math.abs(m - .5) < 1e-9);
// runde 4: lagring per leir (kratere og spor tilbake etter ny innlasting, med tak på antallet)
{ const R = E.REGLER, kr = Array.from({ length: R.lagreKratere + 10 }, (_, i) => ({ x: 1000 + i, y: 2000, r: 4, v: 1 }));
  const sp = [{ x: 5, y: 6, cx: 196000, cy: 6899000, l: 1.6, v: .5, h: .01, b: .34, k: .4, født: 90 }, { x: 0, y: 0, cx: 0, cy: 0, l: 1, v: 0, h: 0, b: .34, k: .4, født: 100 - R.sporTid - 1 }];
  const d = E.tilLagring(kr, sp, 100); assert.strictEqual(d.kratere.length, R.lagreKratere, 'tak på kratere'); assert.strictEqual(d.spor.length, 1, 'gamle spor lagres ikke');
  assert.deepStrictEqual(d.spor[0].slice(0, 2), [196005, 6899006], 'sporene lagres i kartets meter'); assert.strictEqual(d.spor[0][7], 10);
  const t = E.fraLagring(JSON.parse(JSON.stringify(d)), 500); assert.strictEqual(t.kratere.length, R.lagreKratere); assert.strictEqual(t.spor.length, 1);
  assert.strictEqual(t.spor[0].født, 490, 'alderen følger med'); assert.ok(t.spor[0].x === 196005 && t.spor[0].cx === 0 && t.spor[0].dz === null);
  assert.deepStrictEqual(E.fraLagring(null, 0), { kratere: [], spor: [] }); assert.deepStrictEqual(E.fraLagring({ kratere: [[1, 'a', 3]], spor: 'x' }, 0), { kratere: [], spor: [] }, 'tåler skadde data');
  const sk = E.salveKratere(100, 200, 150, 77); assert.strictEqual(sk.length, R.salve.nedslag); assert.ok(sk.every(k => Math.hypot(k.x - 100, k.y - 200) <= 150 * R.salve.spredt + 1e-9 && k.r >= R.salve.r[0] && k.r <= R.salve.r[1]));
  assert.deepStrictEqual(E.salveKratere(100, 200, 150, 77), sk, 'samme salve gir samme kratere'); }
console.log('effekter3d: alle tester bestått');
