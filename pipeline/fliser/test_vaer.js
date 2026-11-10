// Test for spill/vaer.js: node pipeline/fliser/test_vaer.js
const V = require('../../site/dovre-fliser/spill/vaer.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
// solhøyden på Dombås (62,1° N)
const midt = (d) => Math.max(...Array.from({ length: 240 }, (_, i) => V.solHøyde(d, i / 10)));
ok(Math.abs(midt(172) - 51.3) < 1.5, 'sommersolverv: sola ' + midt(172).toFixed(1) + '° høyest (ca. 51°)');
ok(Math.abs(midt(355) - 4.5) < 1.5, 'vintersolverv: sola ' + midt(355).toFixed(1) + '° høyest (ca. 4,5°)');
ok(V.solHøyde(172, 1) > -6, 'lys sommernatt: sola ' + V.solHøyde(172, 1).toFixed(1) + '° kl. 01 (borgerlig skumring)');
ok(V.solHøyde(31, 8) < 0 && V.solHøyde(31, 12.6) > 0, 'vinter: mørkt kl. 08, sol midt på dagen');
// været skifter etter årstiden, og låst vær holder seg
const S = V.ny('sommer'); let f = 1; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647, sett = new Set();
for (let t = 0; t < 60 * 24 * 60; t += 30) { V.steg(S, t, rnd); sett.add(S.vær); }
ok(!sett.has('snø') && sett.has('regn') && sett.has('klart'), 'sommer på 60 døgn: ' + [...sett].join(', ') + ' (ingen snø)');
V.settÅrstid(S, 'vinter', 0); const v2 = new Set(); for (let t = 0; t < 60 * 24 * 60; t += 30) { V.steg(S, t, rnd); v2.add(S.vær); }
ok(v2.has('snø') && !v2.has('regn'), 'vinter på 60 døgn: ' + [...v2].join(', ') + ' (ingen regn)');
V.låsVær(S, 'tåke'); for (let t = 0; t < 10000; t += 30) V.steg(S, t, rnd); ok(S.vær === 'tåke', 'låst vær holder seg');
const T = V.tilstand(S, 12); ok(T.sikt < .5 && T.dis < .2, 'tåke: sikt ×' + T.sikt + ', dis ×' + T.dis);
V.settÅrstid(S, 'sommer', 0); V.låsVær(S, 'snø'); const T2 = V.tilstand(S, 12);
ok(T2.nedbør === 'regn' && T2.snøgrense > 1500, 'snøvær om sommeren: regn i dalen, snø over ' + T2.snøgrense + ' moh.');
V.settÅrstid(S, 'vinter', 0); const T3 = V.tilstand(S, 14); ok(T3.snøgrense < 0 && T3.temp < 0, 'vinter: snø helt ned, ' + T3.temp + ' °C');
// månen: fullmåne 1. aug. 2023 (dag 213), nymåne 16. aug. 2023 (dag 228), halvmåne (første kvarter) 24. aug. 2023 (dag 236)
const fFull = V.måneFase(213, 20), fNy = V.måneFase(228, 11), fKv = V.måneFase(236, 11);
ok(Math.abs(fFull - .5) < .02, 'fullmåne 1. aug. 2023: fase ' + fFull.toFixed(3));
ok(Math.min(fNy, 1 - fNy) < .02, 'nymåne 16. aug. 2023: fase ' + fNy.toFixed(3));
ok(Math.abs(fKv - .25) < .03 && Math.abs(V.måne(236, 11).lys - .5) < .1, 'første kvarter 24. aug. 2023: fase ' + fKv.toFixed(3));
const M = V.måne(213, 23.5); ok(M.lys > .97 && M.høyde > -20 && M.høyde < 25, 'fullmåne en sommernatt står lavt i sør: ' + M.høyde.toFixed(1) + '°');
// myke overganger: værskiftet går over 45–90 spillminutter, ingen hopp større enn 6 % per minutt
{ const S = V.ny('sommer'); let f = 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647; let maks = 0, forrige = V.tilstand(S, 12, 0), skifter = 0;
  for (let t = 1; t < 60 * 24 * 20; t++) { if (V.steg(S, t, rnd)) skifter++; const T = V.tilstand(S, 12, t);
    for (const k of ['sikt', 'dis', 'sky', 'regn', 'snø']) maks = Math.max(maks, Math.abs(T[k] - forrige[k])); forrige = T; }
  ok(skifter > 20 && maks < .06, `værovergang: ${skifter} skifter på 20 døgn, største endring per minutt ${maks.toFixed(3)}`); }
{ const S = V.ny('sommer'); V.låsVær(S, 'regn'); for (let t = 0; t <= 40; t++) V.steg(S, t); const våt = S.våt; V.låsVær(S, 'klart'); for (let t = 41; t <= 100; t++) V.steg(S, t);
  ok(våt > .5 && S.våt < våt && S.våt > .1, `våt bakke: ${våt.toFixed(2)} etter 40 min regn, ${S.våt.toFixed(2)} en time etter`); }
{ let n = 0; for (let d = 0; d < 200; d++) if (V.nordlys('vinter', d, 23, -40, .1) > 0) n++;
  ok(n > 40 && n < 120 && V.nordlys('sommer', 3, 23, -5, 0) === 0 && V.nordlys('vinter', 0, 13, 5, 0) === 0, `nordlys: ${n} av 200 klare vinternetter, aldri om sommeren eller dagen`); }
ok(V.vinduAndel(20) > V.vinduAndel(3) && V.vinduAndel(3) > 0, 'lyse vinduer: flere kl. 20 enn kl. 03');
ok(V.mørke(30) === 0 && V.mørke(-10) === 1, 'mørke: 0 midt på dagen, 1 dypt på natta');
process.exit(feil ? 1 : 0);
