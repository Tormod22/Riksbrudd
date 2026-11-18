// Lommelykta: batteriet, lysstyrken og hva mørket betyr (site/dovre-fliser/spill/lykt.js)
const L = require('../../site/dovre-fliser/spill/lykt.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const R = L.REGLER;
ok(Math.abs(L.tøm(1, R.timer * 60) - 0) < 1e-9 && Math.abs(L.tøm(1, R.timer * 30) - .5) < 1e-9, `et sett batterier varer ${R.timer} spilltimer`);
ok(L.tøm(.01, 1000) === 0 && L.tøm(1, -5) === 1, 'batteriet går ikke under 0 eller over 1');
ok(L.styrke(1) === 1 && L.styrke(R.lav) === 1 && L.styrke(R.lav / 2) < 1 && L.styrke(R.lav / 2) > .45 && L.styrke(0) === 0, 'lyset blir svakere den siste biten, og er borte når batteriet er tomt');
ok(L.sikt(0, 1) === 1 && L.røper(0, 1) === 1, 'om dagen gjør lykta ingenting');
ok(Math.abs(L.sikt(1, 1) - (1 + R.sikt)) < 1e-9 && Math.abs(L.røper(1, 1) - (1 + R.røper)) < 1e-9, 'om natta: du ser lenger, og fiendene ser deg lenger unna');
ok(L.røper(1, 1) > L.sikt(1, 1), 'lykta røper deg mer enn den hjelper deg (et valg)');
ok(L.sikt(.5, .5) < L.sikt(1, 1) && L.sikt(2, 1) === L.sikt(1, 1), 'mørket og lysstyrken teller, mørket høyst 1');
ok(L.igjen(.5) === R.timer / 2, 'timer igjen');
console.log(feil ? `\n${feil} FEIL` : '\nAlt ok'); process.exit(feil ? 1 : 0);
