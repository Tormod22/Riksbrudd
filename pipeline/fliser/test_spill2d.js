// Test for spill/spill2d.js (reglene for å spille i kartet): node pipeline/fliser/test_spill2d.js
const S = require('../../site/dovre-fliser/spill/spill2d.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(S.klasse(0, 120, 6) === 'hus' && S.klasse(0, 400, 6) === 'leil' && S.klasse(7, 300, 6) === 'butikk' && S.klasse(11, 60, 4) === 'hytte' && S.klasse(5, 40, 3) === 'uthus', 'byggklassen følger hus3d');
const P = [[0, 0], [10, 0], [10, 8], [0, 8]]; ok(S.areal(P) === 80 && S.midt(P)[0] === 5 && S.midt(P)[1] === 4, 'areal og midte');
ok(S.gått({ x: 0, y: 0 }, { x: 30, y: 40 }) === 50, 'gange: 50 m teller');
ok(S.gått({ x: 0, y: 0 }, { x: .2, y: 0 }) === 0 && S.gått({ x: 0, y: 0 }, { x: 9000, y: 0 }) === 0 && S.gått(null, { x: 1, y: 1 }) === 0, 'gange: stillstand og hopp (flytting) teller ikke');
ok(S.lesAv('1') && S.lesAv('true') && !S.lesAv('0') && !S.lesAv(null), '3D av/på leses');
console.log(feil ? `${feil} FEIL` : 'Alle testene for spill2d.js er ok'); process.exit(feil ? 1 : 0);
