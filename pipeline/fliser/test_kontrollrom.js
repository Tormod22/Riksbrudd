// Test for spill/kontrollrom.js (K3): node pipeline/fliser/test_kontrollrom.js
const K = require('../../site/dovre-fliser/spill/kontrollrom.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
ok(K.rekkevidde('hånd', false) === 3000 && K.rekkevidde('felt', false) === 8000 && K.rekkevidde('felt', true) === 15000, 'rekkevidde: håndradio 3 km, feltradio 8 km uten mast og 15 km med mast');
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
process.exit(feil ? 1 : 0);
