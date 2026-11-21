// Test: spill/anleggfri.js – baner og anlegg holdes fri for trær, steiner og busker (runde 15).
const A = require('../../site/dovre-fliser/spill/anleggfri.js');
let feil = 0; const ok = (b, t) => { if (!b) { feil++; console.log('FEIL', t); } else console.log('ok  ', t); };
// en fotballbane 100 × 60 m med midten i (200, 50), og en skrå lekeplass
const bane = [[150, 20], [250, 20], [250, 80], [150, 80]], lek = [[-40, -40], [-20, -50], [-10, -30], [-30, -20]];
const R = A.lag([bane, lek]);
ok(R.n === 2, 'to omriss');
ok(A.inni(R, 200, 50), 'midt på banen');
ok(A.inni(R, 151, 21), 'i hjørnet');
ok(A.inni(R, 148.5, 50), '1,5 m utenfor kanten regnes med (kant 2 m)');
ok(!A.inni(R, 148.5, 50, 0), 'uten kant: utenfor');
ok(!A.inni(R, 145, 50), '5 m utenfor: fri');
ok(A.inni(R, -25, -35), 'inne på lekeplassen');
ok(!A.inni(R, 0, 0), 'langt unna');
ok(!A.inni(null, 200, 50) && !A.inni(A.lag([]), 200, 50), 'uten anlegg: aldri');
// over grensen mellom to ruter i oppslaget (rute 50 m): banen ligger i flere ruter
ok(A.inni(R, 249, 79) && A.inni(R, 199.9, 49.9) && A.inni(R, 200.1, 50.1), 'på tvers av rutene');
// rens: trær (5 tall per tre) på banen tas bort, de andre står; samme type tilbake
const trær = new Float32Array([200, 50, 0, 10, .5, 100, 100, 0, 10, .5, -25, -35, 0, 8, .2, 300, 0, 0, 9, .1]);
const igjen = A.rens(R, trær, 5);
ok(igjen instanceof Float32Array && igjen.length === 10, 'to av fire trær står igjen');
ok(igjen[0] === 100 && igjen[5] === 300, 'de riktige trærne står igjen');
const liste = [200, 50, 1, 2, 3, 0, 0, 1, 2, 3];
ok(Array.isArray(A.rens(R, liste, 5)) && A.rens(R, liste, 5).length === 5, 'liste inn, liste ut');
const fri = new Float32Array([0, 0, 0, 1, 1]); ok(A.rens(R, fri, 5) === fri, 'ingenting på banen: samme rekke tilbake');
// ytelse: 40 000 trær mot 200 baner
const mange = []; for (let i = 0; i < 200; i++) { const x = (i % 20) * 200, y = Math.floor(i / 20) * 200; mange.push([[x, y], [x + 100, y], [x + 100, y + 60], [x, y + 60]]); }
const RM = A.lag(mange), T = new Float32Array(200000); for (let i = 0; i < T.length; i += 5) { T[i] = Math.random() * 4000; T[i + 1] = Math.random() * 2000; }
const t0 = Date.now(), r = A.rens(RM, T, 5), ms = Date.now() - t0;
ok(ms < 400, `40 000 trær mot 200 baner på ${ms} ms`);
ok(r.length < T.length && r.length > T.length * .7, 'en del av trærne ble tatt bort (' + (T.length - r.length) / 5 + ')');
console.log(feil ? feil + ' FEIL' : 'alt ok'); process.exit(feil ? 1 : 0);
