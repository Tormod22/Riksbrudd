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
// myke overganger: værskiftet går over 25–45 spillminutter (runde 6; før 45–90), ingen hopp større enn 6,5 % per minutt
{ const S = V.ny('sommer'); let f = 7; const rnd = () => (f = (f * 16807) % 2147483647) / 2147483647; let maks = 0, forrige = V.tilstand(S, 12, 0), skifter = 0;
  for (let t = 1; t < 60 * 24 * 20; t++) { if (V.steg(S, t, rnd)) skifter++; const T = V.tilstand(S, 12, t);
    for (const k of ['sikt', 'dis', 'sky', 'regn', 'snø']) maks = Math.max(maks, Math.abs(T[k] - forrige[k])); forrige = T; }
  ok(skifter > 20 && maks < .065, `værovergang: ${skifter} skifter på 20 døgn, største endring per minutt ${maks.toFixed(3)}`); }
{ const S = V.ny('sommer'); V.låsVær(S, 'regn'); for (let t = 0; t <= 40; t++) V.steg(S, t); const våt = S.våt; V.låsVær(S, 'klart'); for (let t = 41; t <= 100; t++) V.steg(S, t);
  ok(våt > .5 && S.våt < våt && S.våt > .1, `våt bakke: ${våt.toFixed(2)} etter 40 min regn, ${S.våt.toFixed(2)} en time etter`); }
{ let n = 0; for (let d = 0; d < 200; d++) if (V.nordlys('vinter', d, 23, -40, .1) > 0) n++;
  ok(n > 40 && n < 120 && V.nordlys('sommer', 3, 23, -5, 0) === 0 && V.nordlys('vinter', 0, 13, 5, 0) === 0, `nordlys: ${n} av 200 klare vinternetter, aldri om sommeren eller dagen`); }
ok(V.vinduAndel(20) > V.vinduAndel(3) && V.vinduAndel(3) > 0, 'lyse vinduer: flere kl. 20 enn kl. 03');
ok(V.mørke(30) === 0 && V.mørke(-10) === 1, 'mørke: 0 midt på dagen, 1 dypt på natta');
// storm (12. nov): kuling med regn, snøstorm om vinteren, i årstidenes sannsynligheter som summerer til 1
{ const S2 = V.ny('høst'); V.låsVær(S2, 'storm'); const T2 = V.tilstand(S2, 12, 0); ok(T2.regn === 1 && T2.vind.fart > 9, 'storm: regn og vind ' + T2.vind.fart.toFixed(1) + ' m/s');
  const S3 = V.ny('vinter'); V.låsVær(S3, 'storm'); const T3 = V.tilstand(S3, 12, 0); ok(T3.snø === 1 && T3.regn === 0, 'storm om vinteren er snøstorm');
  for (const [å, o] of Object.entries(V.ÅRSTIDER)) ok(Math.abs(Object.values(o.vær).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'værsannsynlighetene summerer til 1: ' + å);
  ok(V.VÆRREKKE.includes('storm'), 'storm kan velges i menyen'); }
// (runde 6, 19. nov) statuslinja sier «Klart → regn» i første halvdel av overgangen og «Regn» etterpå
{ const S = V.ny('sommer'); S.til = 10; V.steg(S, 10, () => .7); const nytt = S.vær, T0 = V.tilstand(S, 12, 11), T1 = V.tilstand(S, 12, 10 + S.varighet * .6);
  ok(nytt !== 'klart' && T0.navnNå === 'Klart → ' + V.VÆR[nytt].navn.toLowerCase() && T1.navnNå === V.VÆR[nytt].navn && T0.overgang < .1 && T1.overgang > .5,
    `overgangen i statuslinja: «${T0.navnNå}» -> «${T1.navnNå}» (${Math.round(S.varighet)} min)`);
  V.låsVær(S, 'tåke'); ok(V.tilstand(S, 12, 12).navnNå === 'Tåke', 'låst vær kommer straks i statuslinja'); }
// (runde 8, 20. nov) disen i 3D ovenfra: bakken midt i bildet synes i regn og tåke, nede ved bakken som før
{ const D = 3000, near = D * .9 + 2000, far = D + 4800, klar = V.dis3d(near, far, 1, D);
  ok(klar.near === near && klar.far === far, 'klart vær: disen urørt');
  const r = V.dis3d(near, far, V.VÆR.regn.dis, D), t = V.dis3d(near, far, V.VÆR.tåke.dis, D), andel = o => (D - o.near) / (o.far - o.near);
  ok(r.near < D && r.far > D && andel(r) < .35, `regn ovenfra: bakken midt i bildet ${Math.round(andel(r) * 100)} % inn i disen (før: helt grå)`);
  ok(t.far > D && andel(t) < .55 && andel(t) > andel(r), `tåke ovenfra: ${Math.round(andel(t) * 100)} % – tettere enn regn, men bakken synes`);
  const lav = V.dis3d(120, 3800, .4, 0); ok(lav.far === Math.max(140, 3800 * .4) && lav.near === Math.min(120 * .4, lav.far * .25), 'nede ved bakken (går): som før');
  const m = V.dis3d(near, far, .4, 700); ok(m.near < m.far && m.far > 0, 'mellom lavt og høyt: gyldig dis'); }
// FØRSTE SNØ (R19-1): en lett snøbyge om høsten legger et tynt lag langt ned i dalen, som smelter igjen etter noen timer
{ const S = V.ny('høst'); V.låsVær(S, 'snøpudder'); let t = 0; V.steg(S, t);
  const T0 = V.tilstand(S, 12, t); ok(T0.nedbør === 'snø' && T0.snø > .2 && T0.snø < .6, 'lett snø om høsten: snøfall ' + T0.snø + ' (lettere enn vanlig snø)');
  ok(T0.snøgrense > 1000, 'lett snø flytter ikke den faste snøgrensen (' + T0.snøgrense + ' moh.)');
  for (t = 0; t <= 180; t += 10) V.steg(S, t);
  const T1 = V.tilstand(S, 12, t); ok(Math.abs(T1.pudder - V.VÆR.snøpudder.mengde) < 1e-9, 'etter tre timer ligger et tynt lag: ' + T1.pudder.toFixed(2));
  ok(T1.pudderGrense < 600, 'førstesnøen ligger ned til ' + Math.round(T1.pudderGrense) + ' moh. (Dombås ca. 650)');
  V.låsVær(S, 'klart'); for (; t <= 180 + 60 * 3; t += 10) V.steg(S, t);
  const T2 = V.tilstand(S, 12, t); ok(T2.pudder > .1 && T2.pudder < T1.pudder, 'tre timer med opphold: laget smelter sakte (' + T2.pudder.toFixed(2) + ')');
  V.låsVær(S, 'regn'); for (; t <= 180 + 60 * 24; t += 10) V.steg(S, t);
  ok(V.tilstand(S, 12, t).pudder === 0 && S.pg == null, 'regn og ett døgn: førstesnøen er borte');
  const Sm = V.ny('sommer'); V.låsVær(Sm, 'snøpudder'); const Tm = V.tilstand(Sm, 12, 0); ok(Tm.nedbør === 'regn' && Tm.snø === 0, 'lett snø om sommeren: faller som regn i dalen');
  ok(V.VÆRREKKE.includes('snøpudder') && V.ÅRSTIDER.høst.vær.snøpudder > 0, 'lett snø kan velges i menyen og kommer av seg selv om høsten');
  for (const [n, å] of Object.entries(V.ÅRSTIDER)) { const sum = Object.values(å.vær).reduce((a, b) => a + b, 0); ok(Math.abs(sum - 1) < 1e-9, n + ': sannsynlighetene for været er til sammen 1'); } }
process.exit(feil ? 1 : 0);
