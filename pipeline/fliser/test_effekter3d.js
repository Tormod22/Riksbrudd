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
assert.strictEqual(E.områder([{ x: 0, y: 0, r: 1e6 }])[0].r, 400, 'tak på radien');
// brentVed: 1 i midten, 0 utenfor
const om = E.områder([{ x: 0, y: 0, r: 50 }]); assert.strictEqual(E.brentVed(om, 0, 0), 1); assert.strictEqual(E.brentVed(om, 60, 0), 0); assert.ok(E.brentVed(om, 45, 0) > 0 && E.brentVed(om, 45, 0) < 1);
// sporStyrke: fullt først, tones bort, borte etter sporTid
assert.strictEqual(E.sporStyrke(0), 1); assert.strictEqual(E.sporStyrke(E.REGLER.sporTid), 0); const m = E.sporStyrke(E.REGLER.sporTid - E.REGLER.sporTone / 2); assert.ok(Math.abs(m - .5) < 1e-9);
console.log('effekter3d: alle tester bestått');
