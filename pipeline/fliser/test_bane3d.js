// Test av reglene for jernbanen i 3D (site/dovre-fliser/spill/bane3d.js): punkt langs sporet, profil (tunnel/bru/vann), biter, elektrisk
const assert = require('assert'), R = require('../../site/dovre-fliser/spill/bane3d.js');
const P = R.tett([[0, 0], [400, 0]]);
assert.strictEqual(P.length, 101, 'punkt hver 4. m');
// slakt stigende terreng med en ås (tunnel) i midten og en dal (bru) lenger bort
const g = P.map(([x]) => x * .02 + (x > 150 && x < 200 ? 30 : 0) + (x > 300 && x < 330 ? -25 : 0));
const { z, ok } = R.profil(g);
assert(ok[10] && ok[90], 'vanlig terreng tegnes');
assert(!ok[43] && !ok[78], 'tunnel og bru tegnes ikke');
assert(z.every((h, i) => h >= g[i] - .05), 'sporet ligger aldri under terrenget');
const { ok: ok2 } = R.profil(P.map(() => 0), i => i > 20 && i < 30);
assert(!ok2[25] && ok2[10], 'ikke i vann');
assert.deepStrictEqual(R.biter([1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1].map(Boolean)), [[0, 4], [9, 12]]);
assert(R.elektrisk(0, 193300, 6896300), 'Dovrebanen er elektrisk');
assert(!R.elektrisk(0, 400000, 7250000), 'Nordlandsbanen er ikke elektrisk');
assert(R.elektrisk(0, 600000, 7600000), 'Ofotbanen er elektrisk');
assert(!R.elektrisk(1, 193300, 6896300), 'smalspor er ikke elektrisk');
console.log('test_bane3d: alle tester OK');
