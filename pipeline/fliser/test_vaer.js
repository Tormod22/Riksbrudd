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
process.exit(feil ? 1 : 0);
