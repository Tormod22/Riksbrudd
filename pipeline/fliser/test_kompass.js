// Test av kompassreglene (site/dovre-fliser/spill/kompass.js): kurs fra kameraets yaw, peiling, navn og minikartets rotasjon.
// Bruk: node pipeline/fliser/test_kompass.js
const K = require('../../site/dovre-fliser/spill/kompass.js');
let feil = 0; const nær = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const sjekk = (ok, t) => { if (!ok) feil++; console.log((ok ? 'ok   ' : 'FEIL ') + t); };
// kameraet ser mot (−sin yaw, cos yaw): yaw 0 = nord, yaw −π/2 = øst, yaw π/2 = vest
sjekk(K.kurs(0) === 0 && K.navn(K.kurs(0)) === 'N', 'yaw 0 ser mot nord');
sjekk(nær(K.kurs(-Math.PI / 2), 90) && K.navn(K.kurs(-Math.PI / 2)) === 'Ø', 'yaw −π/2 ser mot øst');
sjekk(nær(K.kurs(Math.PI / 2), 270) && K.navn(K.kurs(Math.PI / 2)) === 'V', 'yaw π/2 ser mot vest');
sjekk(nær(K.kurs(Math.PI), 180) && K.navn(180) === 'S', 'yaw π ser mot sør');
sjekk(nær(K.kurs(-5 * Math.PI / 2), 90), 'yaw −5π/2 = øst (normaliseres)');
// samsvar med kameraets retningsvektor
for (const yaw of [0, .3, -1.2, 2.5, -3]) { const dx = -Math.sin(yaw), dy = Math.cos(yaw); sjekk(nær(K.peiling(dx, dy), K.kurs(yaw), 1e-9), `peiling langs synsretningen = kursen (yaw ${yaw})`); }
sjekk(K.peiling(1, 0) === 90 && K.peiling(0, -1) === 180 && K.peiling(-1, 0) === 270 && nær(K.peiling(1, 1), 45), 'peiling: øst 90, sør 180, vest 270, nordøst 45');
sjekk(K.forskjell(350, 10) === 20 && K.forskjell(10, 350) === -20 && Math.abs(K.forskjell(0, 180)) === 180, 'forskjell over nord');
sjekk(K.etikett(0) === 'N' && K.etikett(45) === 'NØ' && K.etikett(30) === '030' && K.etikett(315) === 'NV' && K.etikett(10) === null && K.etikett(360) === 'N', 'etiketter på båndet');
sjekk(K.navn(359) === 'N' && K.navn(22) === 'N' && K.navn(23) === 'NØ', 'nærmeste retning');
// minikartet: nord opp → nord er opp (−y på skjermen), øst til høyre
let [x, y] = K.tilSkjerm(0, 100, 0, false); sjekk(nær(x, 0) && nær(y, -100), 'nord-opp: nord er opp');
[x, y] = K.tilSkjerm(100, 0, 123, false); sjekk(nær(x, 100) && nær(y, 0), 'nord-opp: øst til høyre uansett kurs');
// roterende: det du ser mot er opp
[x, y] = K.tilSkjerm(100, 0, 90, true); sjekk(nær(x, 0) && nær(y, -100), 'roterer: ser du mot øst, er øst opp');
[x, y] = K.tilSkjerm(0, 100, 90, true); sjekk(nær(x, -100) && nær(y, 0), 'roterer: ser du mot øst, er nord til venstre');
for (const [dx, dy, k, r] of [[30, -70, 37, true], [-12, 5, 250, true], [8, 9, 0, false]]) { const [px, py] = K.tilSkjerm(dx, dy, k, r), [ux, uy] = K.fraSkjerm(px, py, k, r); sjekk(nær(ux, dx) && nær(uy, dy), `fraSkjerm er omvendt av tilSkjerm (${dx}, ${dy}, ${k}°)`); }
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
