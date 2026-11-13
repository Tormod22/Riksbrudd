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
// avstandstekstene ved merkene: aldri oppå hverandre, ikke oppå tavla i midten, og ikke oppå et annet merke
{ const overlapp = (P, M) => { const I = P.map((p, i) => p && (p.side > 0 ? [p.x, p.x + M[i].w] : [p.x - M[i].w, p.x])).filter(Boolean); let n = 0;
    for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) if (I[i][0] < I[j][1] && I[j][0] < I[i][1]) n++; return n; };
  // leiren (27 km) og et lag (245 km) i nesten samme retning – feilen fra 12. nov
  let M = [{ x: 330, w: 28 }, { x: 334, w: 36 }], P = K.avstandsplass(M, [[196, 244]]);
  sjekk(P[0] && P[1] && overlapp(P, M) === 0, 'to merker i samme retning: begge avstandene står, ikke oppå hverandre');
  sjekk(P[0].side === 1 && P[1].side === -1, 'det nærmeste får plassen til høyre, det andre til venstre');
  M = [{ x: 330, w: 28 }, { x: 333, w: 36 }, { x: 336, w: 30 }]; P = K.avstandsplass(M, [[196, 244]]);
  sjekk(overlapp(P, M) === 0 && P[2] === null, 'tre i samme retning: den tredje teksten sløyfes');
  M = [{ x: 250, w: 30 }]; P = K.avstandsplass(M, [[196, 244]]); sjekk(P[0] && P[0].side === 1 && P[0].x >= 248, 'merke rett til høyre for tavla: teksten til høyre');
  M = [{ x: 225, w: 30 }]; P = K.avstandsplass(M, [[196, 244]]); sjekk(P[0] === null, 'merke bak tavla i midten: ingen tekst');
  M = [{ x: 100, w: 30 }, { x: 125, w: 30 }]; P = K.avstandsplass(M, []);
  sjekk(P[0].side === -1 && P[1] && overlapp(P, M) === 0 && !(P[0].x > 119), 'teksten legges ikke oppå et annet merke 25 px unna');
  let verst = 0; for (let n = 0; n < 400; n++) { const M2 = [0, 1, 2].map(i => ({ x: 40 + ((n * 37 + i * (n % 53)) % 360), w: 24 + (n + i * 7) % 16 })); verst = Math.max(verst, overlapp(K.avstandsplass(M2, [[196, 244]]), M2)); }
  sjekk(verst === 0, '400 tilfeldige oppsett: ingen tekster oppå hverandre'); }
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
