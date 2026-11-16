// Leting i hus (site/dovre-fliser/spill/leting.js)
const L = require('../../site/dovre-fliser/spill/leting.js'), I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(Object.keys(I.KLASSE).every(k => L.KLASSER[k]), 'alle byggklassene i interiøret har funn');
ok(JSON.stringify(L.funn('butikk', 400, 77)) === JSON.stringify(L.funn('butikk', 400, 77)), 'samme bygg gir samme funn');
const snitt = (kl, A, slag) => { let s = 0, tomme = 0; for (let i = 0; i < 2000; i++) { const f = L.funn(kl, A, i * 7 + 3); s += f[slag]; if (f.tomt) tomme++; } return { s: s / 2000, tomme: tomme / 2000 }; };
const but = snitt('butikk', 400, 'mat'), hus = snitt('hus', 120, 'mat'), ind = snitt('industri', 800, 'stål'), kir = snitt('kirke', 300, 'mat');
ok(but.s > 40 && but.s < 120 && hus.s > 1 && hus.s < 8 && but.s > hus.s * 6, `butikker har mye mer mat enn boliger (${but.s.toFixed(0)} mot ${hus.s.toFixed(1)} rasjoner i snitt)`);
ok(ind.s > .8 && ind.s < 6 && kir.s === 0, `verksteder har stål (${ind.s.toFixed(1)} t i snitt), kirker har ikke mat`);
ok(hus.tomme > .25 && hus.tomme < .45 && snitt('kirke', 300, 'mat').tomme > .6, `en del hus er tomme (${Math.round(hus.tomme * 100)} % av boligene)`);
ok(L.funn('lager', 100000, 5).tre <= 6 * 6 + .1 && L.funn('hus', 1, 9).mat <= 9, 'store bygg gir høyst seks ganger et vanlig, små gir lite');
ok(L.tid(40) === 5 && L.tid(5000) === 15 && L.tid(0) === 4, 'letetiden er 4–15 sekunder etter størrelsen');
ok(L.tekst({ tomt: true }) === 'Huset var tomt – noen har vært her før.' && L.tekst({ mat: 12, tre: 1.5, betong: 0, stål: 0, diesel: 0, penger: 25000 }) === 'Du fant 12 rasjoner, 1,5 m³ tre og 25 000 kr.' && L.tekst({ mat: 1 }) === 'Du fant 1 rasjon.', 'teksten: ' + L.tekst({ mat: 12, tre: 1.5, penger: 25000 }));
ok(L.funn('ukjent', 100, 4) && typeof L.funn('ukjent', 100, 4).mat === 'number', 'ukjent klasse regnes som bolig');
console.log(feil ? feil + ' FEIL' : 'alle letetestene ok'); process.exit(feil ? 1 : 0);
