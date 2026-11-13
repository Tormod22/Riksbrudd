// Test for spill/kontrollrom.js (K3): node pipeline/fliser/test_kontrollrom.js
const K = require('../../site/dovre-fliser/spill/kontrollrom.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(K.rekkevidde('hånd', false) === 3000 && K.rekkevidde('felt', false) === 8000 && K.rekkevidde('felt', true) === 15000, 'rekkevidde: håndradio 3 km, feltradio 8 km uten mast og 15 km med mast (nivå 1)');
const flatt = Array(21).fill(600), rygg = flatt.map((h, i) => (i === 10 ? 900 : h));
ok(!K.blokkert(flatt, 602, 624, 10000) && K.blokkert(rygg, 602, 624, 10000), 'fjellrygg på 900 m mellom to punkter på 600 m stenger');
ok(K.blokkert(Array(21).fill(0), 2, 2, 40000), 'jordkrumningen: to antenner 2 m over havet ser ikke hverandre på 40 km');
ok(K.kontakt(5000, 15000, true) && !K.kontakt(6000, 15000, true), 'bak en rygg: 35 % av rekkevidden (5,25 km)');
ok(K.modus(true, null) === 'kontrollrom' && K.modus(false, { har: true, batteri: 1 }) === 'nettbrett' && K.modus(false, { har: true, batteri: 0 }) === 'ute', 'kontrollrom, nettbrett, tomt nettbrett = ute');
const lag = { kontakt: true };
ok(JSON.stringify(K.innsyn('kontrollrom', lag)) === '{"live":true,"fiender":true}', 'kontrollrom: laget og fiendene det ser, nå');
ok(JSON.stringify(K.innsyn('nettbrett', lag)) === '{"live":true,"fiender":false}', 'nettbrett: laget nå, fiender bare meldt');
ok(JSON.stringify(K.innsyn('ute', lag)) === '{"live":false,"fiender":false}' && K.innsyn('ute', { nær: true }).live, 'ute: bare sist meldt, men lag nær deg ser du');
ok(!K.innsyn('kontrollrom', { kontakt: false }).live && K.innsyn(null, {}).live, 'uten radiokontakt: ikke nå; uten spill (før K1): alt som før');
const nb = { har: true, batteri: 8 }; K.batteri(nb, 120, false, false); ok(nb.batteri === 6, 'nettbrettet: 2 t ute bruker 2 t batteri');
K.batteri(nb, 30, true, true); ok(nb.batteri === 8, 'lades fullt i leiren med strøm (2 t for fullt, 30 min for 2 t)');
ok(K.retning({ x: 0, y: 0 }, { x: 560, y: 560 }) === 'ca. 800 m nordøst' && K.retning({ x: 0, y: 0 }, { x: 0, y: -3200 }) === 'ca. 3 km sør', 'retning og avstand i meldingene');
const sm = {}; let m = K.meldinger({ x: 0, y: 0 }, { marsj: true, ute: 0 }, { marsj: false, ute: 2, underIld: true, fiender: [{ id: 7, navn: 'patrulje', x: 0, y: 900 }] }, sm, 100);
ok(m.length === 4 && /Framme/.test(m[0]) && /2 menn/.test(m[1]) && /Under ild/.test(m[2]) && /900 m nord/.test(m[3]), 'meldinger: framme, tap, under ild, fiende sett');
m = K.meldinger({ x: 0, y: 0 }, { ute: 2 }, { ute: 2, underIld: true, fiender: [{ id: 7, navn: 'patrulje', x: 0, y: 900 }] }, sm, 103);
ok(m.length === 0, 'samme fiende og «under ild» meldes ikke på nytt med en gang');
m = K.meldinger({ x: 0, y: 0 }, { ute: 2 }, { ute: 2, fiender: [] }, sm, 120); ok(m.length === 1 && /Posisjon/.test(m[0]), 'posisjon meldes hvert kvarter når alt er rolig');
// feiljakt 12. nov: rutinemeldingen er merket (K.RUTINE), så visningen kan holde den ute av loggen på kartet
ok(m[0] === K.RUTINE && !K.meldinger({ x: 0, y: 0 }, { marsj: true, ute: 0 }, { marsj: false, ute: 1, fiender: [] }, {}, 200).includes(K.RUTINE), 'rutinemeldingen er K.RUTINE, og viktige meldinger er ikke det');
// BRUKERENS VALG 12. nov: radiomastens nivå forlenger lagenes radiorekkevidde – 15, 25 og 40 km på nivå 1, 2 og 3 (før: ingen virkning)
{ const Leir = require('../../site/dovre-fliser/spill/leir.js'), N = Leir.BYGG.radiomast.nivå.rekkevidde;
  ok(N.join() === '15000,25000,40000' && K.LEIR.nivå.join() === N.join() && K.LEIR.mast === N[0], 'radiomasten i leir.js og radioreglene har samme tall: 15, 25 og 40 km');
  ok(K.rekkevidde('felt', N[0]) === 15000 && K.rekkevidde('felt', N[1]) === 25000 && K.rekkevidde('felt', N[2]) === 40000, 'feltradio med radiomast nivå 1, 2 og 3: 15, 25 og 40 km');
  ok(K.rekkevidde('felt', N[1]) > K.rekkevidde('felt', N[0]) && K.rekkevidde('felt', N[2]) > K.rekkevidde('felt', N[1]), 'hvert nivå når lenger enn det forrige (nivå 2 og 3 har virkning)');
  ok(K.rekkevidde('felt', 0) === 8000 && K.rekkevidde('felt', null) === 8000, 'feltradio uten mast (eller mast uten strøm): 8 km');
  ok([0, N[0], N[1], N[2]].every(m => K.rekkevidde('hånd', m) === 3000), 'håndradioen når 3 km uansett mast');
  ok(K.rekkevidde('felt', 7500) === 8000 && K.rekkevidde('felt', 20000) === 20000, 'hardt skadet mast (halv rekkevidde): aldri dårligere enn uten mast');
  ok(K.kontakt(24000, K.rekkevidde('felt', N[1]), false) && !K.kontakt(24000, K.rekkevidde('felt', N[0]), false) && K.kontakt(39000, K.rekkevidde('felt', N[2]), false) && !K.kontakt(39000, K.rekkevidde('felt', N[1]), false),
    'et lag 24 km unna får kontakt med nivå 2 (ikke nivå 1), og 39 km unna med nivå 3 (ikke nivå 2)');
  const f = K.forklaring(); ok(/Håndradio når 3 km/.test(f) && /8 km uten radiomast/.test(f) && /15, 25 og 40 km/.test(f) && /strøm/.test(f) && /35 %/.test(f), 'forklaringen: «' + f + '»');
  ok(/6 km fra leiren – håndradioen når 3 km \(kjøp feltradio\)/.test(K.utenKontakt('hånd', 0, 6000)), 'uten kontakt, håndradio: «' + K.utenKontakt('hånd', 0, 6000) + '»');
  ok(/feltradioen når 8 km \(bygg radiomast\)/.test(K.utenKontakt('felt', 0, 12000)) && /oppgrader radiomasten til nivå 2/.test(K.utenKontakt('felt', N[0], 20000)) && /nivå 3/.test(K.utenKontakt('felt', N[1], 38000))
    && /for langt/.test(K.utenKontakt('felt', N[2], 50000)), 'uten kontakt, feltradio: rådet er å bygge masten eller oppgradere den («' + K.utenKontakt('felt', N[0], 20000) + '»)');
  ok(/terrenget står i veien/.test(K.utenKontakt('felt', N[0], 9000)), 'innen rekkevidde, men uten kontakt: terrenget («' + K.utenKontakt('felt', N[0], 9000) + '»)'); }
process.exit(feil ? 1 : 0);
