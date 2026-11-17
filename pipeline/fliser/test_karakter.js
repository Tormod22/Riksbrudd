// Regeltest for spill/karakter.js: node pipeline/fliser/test_karakter.js
const K = require('../../site/dovre-fliser/spill/karakter'), assert = require('assert');
const B = K.ny(); assert.deepStrictEqual(B, { tørst: 100, sult: 100, søvn: 100 });
K.steg(B, 12); assert.strictEqual(B.tørst, 50, 'tørsten er tom etter ett døgn'); assert.strictEqual(B.sult, 75, 'sulten etter to døgn'); assert.ok(Math.abs(B.søvn - 100 * (1 - 12 / 36)) < 1e-9);
const L = K.ny(); K.steg(L, 12, { løper: true }); assert.ok(L.tørst < B.tørst && L.sult === B.sult, 'løping gir bare mer tørst');
K.steg(B, 100); assert.deepStrictEqual(B, { tørst: 0, sult: 0, søvn: 0 }, 'aldri under null');
let V = K.virkning(B); assert.strictEqual(V.treff, K.R.minTreff); assert.strictEqual(V.løp, K.R.minLøp); assert.strictEqual(V.skade, 3 * K.R.skade, 'tre behov på null tærer på helsa');
assert.strictEqual(K.fyll(B, 'sult', K.R.rasjon), 50); assert.strictEqual(K.fyll(B, 'tørst', 500), 100, 'aldri over 100'); assert.strictEqual(K.fyll(B, 'ukjent', 5), 0);
V = K.virkning({ tørst: 100, sult: 100, søvn: 100 }); assert.ok(V.treff === 1 && V.løp === 1 && V.skade === 0);
V = K.virkning({ tørst: 100, sult: 10, søvn: 100 }); assert.ok(V.treff < 1 && V.treff > K.R.minTreff && V.løp === 1, 'sult går ut over treff, ikke løping');
assert.strictEqual(K.ord('tørst', 0), 'uttørket'); assert.strictEqual(K.ord('sult', 90), 'mett'); assert.strictEqual(K.ord('søvn', 40), 'trøtt');
assert.strictEqual(K.tilstand(0), 'tomt'); assert.strictEqual(K.tilstand(10), 'lite'); assert.strictEqual(K.tilstand(40), 'greit'); assert.strictEqual(K.tilstand(80), '');
// utseendet fra portrettet
let U = K.utseende({ skin: '#ff0000', hairColor: '#0000ff', hair: 'ponytail', facialHair: 'bart', headwear: 'ingen', outfitColor: '#00ff00', glasses: 'runde' });
assert.deepStrictEqual(U.hud, [1, 0, 0]); assert.deepStrictEqual(U.hår, [0, 0, 1]); assert.deepStrictEqual(U.jakke, [0, 1, 0]); assert.ok(U.stil === 'langt' && U.hale && U.skjegg && U.briller && !U.hodeplagg);
U = K.utseende({ hair: 'bald' }); assert.ok(U.skallet && U.stil === 'snau' && !U.skjegg); U = K.utseende({ hair: 'afro' }); assert.strictEqual(U.stil, 'krøll');
U = K.utseende(null); assert.ok(U.hud.length === 3 && U.stil === 'kort', 'uten portrett: et vanlig utseende');
console.log('ok   karakter: behov, virkning, ord og utseende fra portrettet');
