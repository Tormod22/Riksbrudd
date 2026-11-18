// Test av reglene i spill/fjernby3d.js: node pipeline/fliser/test_fjernby3d.js
const assert = require('assert'), F = require('../../site/dovre-fliser/spill/fjernby3d.js');
// hash: fast og mellom 0 og 1
for (let i = -50; i < 50; i += 7) for (let j = -50; j < 50; j += 11) { const h = F.hash(i, j, 3); assert.ok(h >= 0 && h < 1); assert.strictEqual(h, F.hash(i, j, 3)); }
// inneAndel: ingen holt når skogen ikke er tynnet, flere jo mer som er tynnet bort
assert.strictEqual(F.inneAndel(1), 0); assert.strictEqual(F.inneAndel(.9), 0); assert.strictEqual(F.inneAndel(undefined), 0);
assert.ok(F.inneAndel(.5) > F.inneAndel(.8) && F.inneAndel(.8) > 0); assert.strictEqual(F.inneAndel(0), 1);
// nettHøyde: et skrått plan z = 2x + 3y gjengis nøyaktig, utenfor nettet og i hull gir NaN
const n = 5, R = 100, c = 2 * R / (n - 1), zz = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) zz.push(2 * (-R + i * c) + 3 * (R - j * c));
const z = k => zz[k], ok = () => true;
for (const [x, y] of [[0, 0], [-99, 99], [37.5, -62.1], [99, -99], [12, 13]]) assert.ok(Math.abs(F.nettHøyde(z, ok, n, R, x, y) - (2 * x + 3 * y)) < 1e-9, 'plan ved ' + x + ',' + y);
assert.ok(Number.isNaN(F.nettHøyde(z, ok, n, R, 150, 0))); assert.ok(Number.isNaN(F.nettHøyde(z, k => k !== 0, n, R, -99, 99)));
// holtFarge: snø gjør holtet lysere, høst gjør løvholt rødere enn grønne
const V0 = { snøgrense: 1e9, høst: 0 }, sum = k => k[0] + k[1] + k[2];
assert.ok(sum(F.holtFarge(.3, 1500, { snøgrense: 1000, høst: 0 })) > sum(F.holtFarge(.3, 1500, V0)) * 2);
assert.deepStrictEqual(F.holtFarge(.3, 500, { snøgrense: 1000, høst: 0 }), F.holtFarge(.3, 500, V0));
const h = F.holtFarge(.9, 500, { snøgrense: 1e9, høst: 1 }); assert.ok(h[0] > h[1], 'løvholt om høsten');
const b = F.holtFarge(.3, 500, { snøgrense: 1e9, høst: 1 }); assert.deepStrictEqual(b, F.holtFarge(.3, 500, V0), 'barskog skifter ikke farge');
console.log('fjernby3d: alle tester bestått');
