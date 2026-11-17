// Test av reglene for kaiene (spill/kaier.js). Kjør: node pipeline/fliser/test_kaier.js
const assert = require('assert'), K = require('../../site/dovre-fliser/spill/kaier.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };
// samme koding som pipeline/fliser/kaier.py (kode): sortert på x, forskjeller
const steder = [[-30000, 6700000, 3, 0, ''], [250000, 6590000, 2, 0, 'Kaia'], [250000, 6600000, 1, 55, 'Kaia'], [250400, 6600100, 1, 8, ''], [900000, 7900000, 4, 120, 'Ærøy ferjekai']];
const navn = ['Kaia', 'Ærøy ferjekai'], d = []; let fx = 0, fy = 0; for (const [x, y, t, l, nv] of steder) { d.push(x - fx, y - fy, t, l, nv ? navn.indexOf(nv) + 1 : 0); fx = x; fy = y; }
const S = K.les({ n: 5, navn, d });
ok(S.n === 5 && S.x[0] === -30000 && S.x[4] === 900000 && S.y[4] === 7900000, 'lest'); ok(K.navn(S, 2) === 'Kaia' && K.navn(S, 0) === '', 'navn');
ok(K.fra(S, 250000) === 1 && K.fra(S, 250001) === 3 && K.fra(S, 1e9) === 5 && K.fra(S, -1e9) === 0, 'binærsøk');
ok(String(K.iBoks(S, 249000, 251000, 6599000, 6601000)) === '2,3', 'boks'); ok(K.iBoks(S, 0, 100, 0, 100).length === 0, 'tom boks');
const f = K.nær(S, 250300, 6600100, 500); ok(f && f.i === 3 && Math.round(f.d) === 100, 'nærmeste'); ok(K.nær(S, 250300, 6600100, 500, i => S.l[i] >= 50).i === 2, 'med filter'); ok(K.nær(S, 0, 0, 500) === null, 'ingen nær');
ok(K.vises(4, 0, 150) && !K.vises(4, 0, 200), 'ferjeterminal langt ute'); ok(K.vises(2, 0, 60) && !K.vises(2, 0, 80), 'småbåthavn');
ok(K.vises(1, 200, 60) && !K.vises(1, 60, 60) && K.vises(1, 60, 20) && !K.vises(1, 10, 20) && K.vises(1, 10, 8), 'kaier etter lengde');
ok(K.tekst(S, 2) === 'Kaia (kai), 55 m kai' && K.tekst(S, 0) === 'Havn' && /ferjeterminal\), 120 m kai/.test(K.tekst(S, 4)), 'tekst');
ok(K.størrelse(1, 20) === 'liten' && K.størrelse(1, 60) === 'middels' && K.størrelse(2, 0) === 'middels' && K.størrelse(1, 200) === 'stor' && K.størrelse(4, 0) === 'stor', 'størrelse');
ok(K.les(null).n === 0 && K.les({}).n === 0, 'tåler tom fil');
console.log(`ok   kaier: ${n} sjekker`);
