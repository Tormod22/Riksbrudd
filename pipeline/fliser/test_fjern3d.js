// Test av fargereglene for fjernterrenget i 3D (site/dovre-fliser/spill/fjern3d.js): fjellene i horisonten skal følge årstiden og
// snøgrensen slik bakken i utsnittet gjør (12. nov: de var sommergrønne midt på vinteren, og grønne rett bak snøfjellene i Jotunheimen).
// Bruk: node pipeline/fliser/test_fjern3d.js
const F = require('../../site/dovre-fliser/spill/fjern3d.js');
let feil = 0; const sjekk = (ok, t) => { if (!ok) feil++; console.log((ok ? 'ok   ' : 'FEIL ') + t); };
const lys = f => (f[0] + f[1] + f[2]) / 3, grønn = f => f[1] - Math.max(f[0], f[2]);
const SOMMER = { snøgrense: 1900, høst: 0 }, HØST = { snøgrense: 1350, høst: 1 }, VINTER = { snøgrense: -1000, høst: 0 }, TG = 1100;
// sommer: som før under tregrensen
for (const K of [0, 1, 2, 3, 4, 5, 6, 7]) sjekk(F.farge(K, 600, 1, TG, SOMMER, false).every((v, i) => Math.abs(v - F.FARGE[K][i]) < 1e-9), `sommer, 600 moh.: klasse ${K} har sin egen farge`);
// vinter: alt land er hvitt (skogen litt mørkere), bratte vegger er bare, havet fryser ikke
for (const K of [0, 2, 5, 6, 7]) sjekk(lys(F.farge(K, 700, 1, TG, VINTER, false)) > .85, `vinter: klasse ${K} er hvit`);
const skogV = F.farge(1, 700, 1, TG, VINTER, false);
sjekk(lys(skogV) > .7 && lys(skogV) < .85 && grønn(skogV) < .04, 'vinter: skogen er lys grå, ikke grønn');
sjekk(lys(F.farge(3, 700, 1, TG, VINTER, false)) > .8, 'vinter: innsjøene er islagt og snødekt');
sjekk(F.farge(3, 0, 1, TG, VINTER, true).every((v, i) => v === F.FARGE[3][i]), 'vinter: havet er fortsatt hav');
sjekk(lys(F.farge(0, 1500, .2, TG, VINTER, false)) < .55, 'vinter: bratte fjellvegger er bare');
// snøgrensen: snø over, bart under
sjekk(lys(F.farge(0, 2100, 1, TG, SOMMER, false)) > .85 && lys(F.farge(0, 1700, 1, TG, SOMMER, false)) < .55, 'sommer: snø over 1900 moh., bart under');
sjekk(lys(F.farge(2, 1500, 1, TG, HØST, false)) > .8 && lys(F.farge(2, 1100, 1, TG, HØST, false)) < .6, 'høst: snøgrensen har falt til 1350 moh.');
// over tregrensen: ikke grønt (Jotunheimen var grønn rett bak snøfjellene)
for (const K of [1, 2, 5, 6]) sjekk(grønn(F.farge(K, TG + 550, 1, TG, SOMMER, false)) < .025, `over tregrensen: klasse ${K} er grått snaufjell`);
sjekk(grønn(F.farge(1, TG, 1, TG, SOMMER, false)) > .08, 'ved tregrensen: skogen er fortsatt grønn');
// høstfarger: det grønne blir gulere (mer rødt, mindre blått), grått berg endres ikke
const engS = F.farge(5, 600, 1, TG, SOMMER, false), engH = F.farge(5, 600, 1, TG, HØST, false);
sjekk(engH[0] > engS[0] + .05 && engH[2] < engS[2] - .03 && engH[1] === engS[1], 'høst: dyrket mark blir gulere');
sjekk(F.farge(0, 600, 1, TG, HØST, false).every((v, i) => Math.abs(v - F.FARGE[0][i]) < .02), 'høst: snaufjellet endres ikke');
// ukjent klasse gir ikke feil
sjekk(F.farge(255, 500, 1, TG, SOMMER, false).length === 3, 'ukjent klasse får fargen til åpen mark');
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
