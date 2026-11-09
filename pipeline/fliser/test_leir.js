// Test for spill/leir.js (K2): node pipeline/fliser/test_leir.js
const L0 = require('../../site/dovre-fliser/spill/leir.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
let penger = 100e6; const betal = p => (p <= penger ? (penger -= p, true) : false);
const L = L0.ny(), kart = { klasse: (x, y) => (x < -500 ? 3 : 2), iHus: (x, y) => x > 900 && x < 920 };
// bygge, betale, overlapp, vann, hus
let r = L0.bygg(L, { type: 'kontrollrom', x: 0, y: 0, ret: 0 }, betal, {}, kart);
ok(r.bygg && penger === 85e6 && r.bygg.igjen === 360, 'kontrollrom: 15 mill. kr og 6 spilltimer (' + L0.kroner(penger) + ' igjen)');
ok(/nær kontrollrom/.test(L0.bygg(L, { type: 'brakke', x: 3, y: 2, ret: .3 }, betal, {}, kart).feil), 'brakke oppå kontrollrommet avvises');
ok(/vann/.test(L0.bygg(L, { type: 'brakke', x: -800, y: 0 }, betal, {}, kart).feil), 'ikke i vann');
ok(/hus/.test(L0.bygg(L, { type: 'lagertelt', x: 910, y: 0 }, betal, {}, kart).feil), 'ikke oppå et hus som står der fra før');
ok(L0.bygg(L, { type: 'brakke', x: 20, y: 0, ret: 1.57 }, betal, {}, kart).bygg && penger === 81e6, 'brakke ved siden av: 4 mill. kr');
// gjerdet etter lengden, ingeniør bygger raskere
const g = L0.bygg(L, { type: 'gjerde', punkter: [[-30, -30], [70, -30]] }, betal, { bygg: 1.2 }, kart).bygg;
ok(g && g.pris === 5e6 && Math.abs(g.totalt - 100 * .02 * 60 / 1.2) < 1e-9, 'gjerde 100 m: 5 mill. kr, ' + g.totalt.toFixed(0) + ' spillminutter med ingeniør');
ok(/penger/.test(L0.bygg(L, { type: 'helikopterplass', x: 300, y: 300 }, p => false, {}, kart).feil), 'for lite penger avvises');
// byggetid
for (let i = 0; i < 60 * 5.9; i++) L0.steg(L, 1); ok(!L0.ferdig(L.bygg[0]) && L0.framdrift(L.bygg[0]) > .95, 'etter 5,9 t er kontrollrommet nesten ferdig');
const s1 = L0.steg(L, 10); ok(L0.ferdig(L.bygg[0]) && s1.nyFerdig.some(b => b.type === 'kontrollrom'), 'etter 6 t er det ferdig');
// strøm: uten produksjon mangler alle; aggregat uten drivstoff gir ingenting; med drivstoff dekker det behovet
let s = L0.steg(L, 1); ok(s.behov === 9 && s.mangler.size === 2, 'kontrollrom + brakke trenger 9 kW, uten strøm: begge mangler');
const a = L0.bygg(L, { type: 'aggregat', x: 0, y: 30 }, betal, {}, kart).bygg; L0.steg(L, 60);
s = L0.steg(L, 1); ok(s.mangler.size === 2 && s.prod === 0, 'aggregat uten drivstoff gir ingen strøm');
ok(/ingen plass/i.test(L0.kjøpDrivstoff(L, 1000, betal).feil) === false && L.drivstoff === 200, 'aggregatets egen tank tar 200 l');
const før = L.drivstoff; s = L0.steg(L, 60);
ok(s.mangler.size === 0 && Math.abs(før - L.drivstoff - 9 * .3) < 1e-6, `9 kW i en time bruker ${(før - L.drivstoff).toFixed(1)} l drivstoff`);
// solceller om dagen sparer drivstoff; prioritet ved for lite strøm
L0.bygg(L, { type: 'solcelle', x: 40, y: 30 }, betal, {}, kart); L0.steg(L, 40); const d0 = L.drivstoff; s = L0.steg(L, 60, 1);
ok(Math.abs(d0 - L.drivstoff - 4 * .3) < 1e-6, 'solcellene gir 5 kW om dagen, aggregatet tar resten (4 kW)');
L.drivstoff = 0; s = L0.steg(L, 1, 1); ok(s.mangler.has(L.bygg[1].id) === false || s.mangler.size === 1, 'bare sol (5 kW): kontrollrommet (8 kW) mangler, brakka (1 kW) får');
ok(s.mangler.has(L.bygg[0].id) && !s.mangler.has(L.bygg[1].id), 'prioritet: brakka får strøm når kontrollrommet ikke kan');
// drivstofftank og lagring
L0.bygg(L, { type: 'drivstofftank', x: 80, y: 30 }, betal, {}, kart); L0.steg(L, 60); const k = L0.kjøpDrivstoff(L, 10000, betal);
ok(k.liter === 5200 && L0.kapasitet(L) === 5200, 'tank + aggregat rommer 5 200 l, kjøpt ' + k.liter + ' l for ' + L0.kroner(k.pris));
const J = L0.fraJSON(L0.tilJSON(L)); ok(J && J.bygg.length === L.bygg.length && J.drivstoff === L.drivstoff, 'lagret og lest inn igjen');
ok(L0.fraJSON('tull') === null, 'ødelagt lagring gir null');
ok(L0.overlapper([[0, 0], [2, 0], [2, 2], [0, 2]], [[1, 1], [3, 1], [3, 3], [1, 3]]) && !L0.overlapper([[0, 0], [1, 0], [1, 1], [0, 1]], [[2, 2], [3, 2], [3, 3], [2, 3]]), 'overlapp-testen');
process.exit(feil ? 1 : 0);
