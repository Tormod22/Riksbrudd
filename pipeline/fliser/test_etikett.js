// Test for spill/etikett.js (navn som ikke ligger oppå hverandre): node pipeline/fliser/test_etikett.js
const E = require('../../site/dovre-fliser/spill/etikett.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const overlapp = (a, b, w) => Math.abs(a[0] - b[0]) < w && Math.abs(a[1] - b[1]) < E.LINJE - 1e-9;
// fem navn på samme sted (lagene rundt leiren sett langt ute): alle får hver sin linje oppover
E.nullstill(); const ys = []; for (let i = 0; i < 5; i++) ys.push(E.plass(200, 300, 90, -1));
ok(ys[0] === 300 && E.overlapp() === 0 && ys.every((y, i) => y === 300 - i * E.LINJE), 'fem navn på samme sted stables oppover: ' + ys.join(', '));
// navn under symbolet flyttes nedover
E.nullstill(); const a = E.plass(100, 100, 80, 1), b = E.plass(100, 104, 60, 1);
ok(a === 100 && b > a && b - a >= E.LINJE - 4 - 1e-9 && b === 104 + E.LINJE, 'navn under symbolet flyttes nedover: ' + a + ', ' + b);
// navn langt fra hverandre røres ikke; naboer som så vidt overlapper sideveis, flyttes
E.nullstill(); const p1 = E.plass(100, 100, 80), p2 = E.plass(400, 100, 80), p3 = E.plass(170, 100, 80);
ok(p1 === 100 && p2 === 100 && p3 === 100 - E.LINJE, 'bare navn som overlapper flyttes: ' + [p1, p2, p3].join(', '));
// kjøretøyene i 3D sto 45 m fra hverandre med lange navn: ingen to navn overlapper etterpå
E.nullstill(); const navn = [[1056, 560, 120], [1100, 560, 80], [1150, 560, 75], [1200, 560, 130]].map(([x, y, w]) => [x, E.plass(x, y, w), w]);
let par = 0; for (let i = 0; i < navn.length; i++) for (let j = i + 1; j < navn.length; j++) if (overlapp(navn[i], navn[j], (navn[i][2] + navn[j][2]) / 2)) par++;
ok(par === 0, 'fire kjøretøynavn tett i tett: ingen overlapper (' + navn.map(n => n[1]).join(', ') + ')');
// nullstill tømmer, og det er et tak på hvor langt et navn flyttes
E.nullstill(); ok(E.antall() === 0, 'nullstill tømmer lista');
for (let i = 0; i < 40; i++) E.plass(0, 0, 50); ok(E.plass(0, 0, 50) >= -E.MAKS * E.LINJE, 'et navn flyttes høyst ' + E.MAKS + ' linjer');
ok(E.overlapp() > 0, 'overlapp() teller navnene som ikke fikk plass (' + E.overlapp() + ' par)');
process.exit(feil ? 1 : 0);
