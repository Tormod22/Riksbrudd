// Test av spillkartets grense (spill/omraade.js) med den ekte Rogaland-fila. Kjør: node pipeline/fliser/test_omraade.js
const assert = require('assert'), fs = require('fs'), path = require('path'), O = require('../../site/dovre-fliser/spill/omraade.js');
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };
const R = O.les(JSON.parse(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/data/rogaland.json'), 'utf8')));
ok(R.navn === 'Rogaland' && R.P.length > 200 && R.P[0].join() === R.P[R.P.length - 1].join(), 'lest og lukket');
ok(R.bb[2] - R.bb[0] > 100000 && R.bb[3] - R.bb[1] > 150000, 'størrelsen');
// kjente steder (EPSG:25833)
const inne = { Stavanger: [-33500, 6573500], Sandnes: [-31500, 6560000], Haugesund: [-50500, 6628500], Egersund: [-27000, 6515500], Sauda: [20000, 6639000], 'Leiren i Ryfylke': [15607, 6622779] };
const ute = { Bergen: [-32000, 6735000], Oslo: [262000, 6650000], Kristiansand: [88000, 6466000], Odda: [28500, 6681000], Dombås: [198600, 6897400], 'langt til havs': [-200000, 6570000] };
for (const [navn, [x, y]] of Object.entries(inne)) ok(O.inni(R, x, y), navn + ' ligger i Rogaland');
for (const [navn, [x, y]] of Object.entries(ute)) ok(!O.inni(R, x, y), navn + ' ligger utenfor');
ok(O.tilGrensa(R, -33500, 6573500) > 5000, 'Stavanger er et stykke fra grensa'); ok(O.tilGrensa(R, R.P[10][0], R.P[10][1]) < 1, 'et grensepunkt ligger på grensa');
// en enkel firkant
const F = O.les({ navn: 'F', bb: [0, 0, 10, 10], ring: [0, 0, 10, 0, 0, 10, -10, 0, 0, -10] }); ok(O.inni(F, 5, 5) && !O.inni(F, 11, 5) && !O.inni(F, -1, 5) && Math.abs(O.tilGrensa(F, 5, 5) - 5) < 1e-9, 'firkant');
console.log(`ok   spillkartets grense: ${n} sjekker`);
