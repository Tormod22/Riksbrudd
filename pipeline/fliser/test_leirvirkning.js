// Test av spill/leirvirkning.js (R18-B): tabellen over hva leirbyggene gjør, og regnestykkene over den.
const assert = require('assert');
const path = require('path');
const LV = require(path.join(__dirname, '../../site/dovre-fliser/spill/leirvirkning.js'));
const LB = require(path.join(__dirname, '../../site/dovre-fliser/spill/leir.js'));
let n = 0; const ok = (b, t) => { assert.ok(b, t); n++; };

// en enkel leir med ferdige bygg (igjen 0, hp 1)
let id = 1; const bygg = (type, x = 0, y = 0, ekstra = {}) => ({ id: id++, type, x, y, ret: 0, igjen: 0, hp: 1, nivå: 1, ...ekstra });
const L = LB.ny();
const tomt = LV.leiren(L, LB, new Set());
ok(tomt.moral === 0 && tomt.mat === 1 && tomt.tempo === 1 && !tomt.vann && tomt.drone === 0, 'tom leir gir ingenting');

// alle de nye byggene i tabellen har tekst uten «kommer senere», og eldre bygg i Leir.BYGG har også tekst
for (const [k, v] of Object.entries(LV.VIRKNING)) ok(v.tekst && !/kommer senere/.test(v.tekst), 'tekst for ' + k);
for (const k of Object.keys(LB.BYGG)) ok(LV.VIRKNING[k], 'eldre bygg har linje i tabellen: ' + k);
ok(LV.tekst('ukjent', { tekst: 'X (virkningen kommer senere)' }) === LV.PYNT, 'ukjent bygg uten virkning = bare utseende');
ok(/byggesett/.test(LV.tekst('bs_vegg', { del: true })), 'byggesettets deler');
ok(/Nivå 2 av 3/.test(LV.panelTekst('brakke', LB.BYGG.brakke, 2)), 'nivå i panelteksten');

// moral, helse, mat, tempo – hvert slag én gang, med tak
L.bygg.push(bygg('messe'), bygg('messe'), bygg('bålplass'), bygg('toalett'), bygg('avfall'), bygg('kjølecontainer'), bygg('kontor'));
let u = LV.leiren(L, LB, new Set());
ok(u.moral === 4 + 3 + 2, 'moral: messe teller én gang (' + u.moral + ')');
ok(Math.abs(u.helse - .05) < 1e-9, 'helse toalett + avfall');
ok(Math.abs(u.mat - .93 * .88) < 1e-9, 'mat: messe og kjølecontainer');
ok(Math.abs(u.tempo - 1.04) < 1e-9, 'tempo: kontor');
// uten strøm: messe, kjølecontainer og kontor virker ikke
const uten = new Set(L.bygg.filter(b => ['messe', 'kjølecontainer', 'kontor'].includes(b.type)).map(b => b.id));
u = LV.leiren(L, LB, uten);
ok(u.moral === 5 && u.mat === 1 && u.tempo === 1, 'uten strøm virker de ikke');
// hardt skadet: halv virkning; ikke ferdig: ingenting
L.bygg.find(b => b.type === 'bålplass').hp = .3; u = LV.leiren(L, LB, uten); ok(u.moral === 2 + 1.5, 'halv virkning når hardt skadet');
L.bygg.find(b => b.type === 'toalett').igjen = 1; u = LV.leiren(L, LB, uten); ok(u.moral === 1.5 && Math.abs(u.helse - .03) < 1e-9, 'uferdig bygg virker ikke');
// moraltaket
const M = LB.ny(); for (const t of ['messe', 'bålplass', 'dusjbrakke', 'toalett', 'vaskeri', 'klima', 'flaggrekke', 'skilt', 'hundegård', 'offisersbrakke']) M.bygg.push(bygg(t));
ok(LV.leiren(M, LB, new Set()).moral === LV.REGLER.moralMaks, 'moraltaket');

// rundt bygget: vern, sinke, sikt (natt), erfaring, leging, reparasjon, fylling
const R = LB.ny(); R.bygg.push(bygg('betongbunker', 0, 0), bygg('skyttergrav', 5, 0), bygg('piggtråd', 100, 0), bygg('lysmast', 300, 0), bygg('skytebane', 600, 0), bygg('feltsykehus', 600, 0), bygg('tungverksted', 900, 0), bygg('fyllestasjon', 900, 0));
const mang = new Set();
ok(LV.ved(R, LB, mang, 2, 0).vern === .25, 'beste vern teller (bunker)');
ok(LV.ved(R, LB, mang, 50, 0).vern === 1, 'utenfor vernet');
ok(LV.ved(R, LB, mang, 103, 0).sinke === .35, 'piggtråd sinker');
ok(LV.ved(R, LB, mang, 300, 50, false).sikt === 1 && LV.ved(R, LB, mang, 300, 50, true).sikt === 1.3, 'lysmasten bare om natta');
const v6 = LV.ved(R, LB, mang, 610, 0); ok(v6.erf === 3 && v6.leging === .15, 'skytebane og feltsykehus');
mang.add(R.bygg.find(b => b.type === 'feltsykehus').id); ok(LV.ved(R, LB, mang, 610, 0).leging === 0, 'feltsykehuset trenger strøm');
const v9 = LV.ved(R, LB, new Set(), 905, 0); ok(v9.reparer === .25 && v9.fyll === .5, 'verkstedhall og fyllestasjon');
ok(LV.erNatt(23) && LV.erNatt(3) && !LV.erNatt(12), 'natt');

// trening: tak ved veteran
ok(LV.trening(0, 3, 60) === 3, 'tre min i timen'); ok(LV.trening(119, 3, 60) === 120, 'taket'); ok(LV.trening(200, 3, 60) === 200, 'aldri ned');
// fylling: begrenset av dieselen
let f = LV.fylling(.5, .5, 60, .35, 2, 1e6); ok(Math.abs(f.andel - .5) < 1e-9 && Math.abs(f.liter - .5 * .35 * 2 * 1200) < 1e-6, 'fyller halv tank');
f = LV.fylling(0, .5, 60, .35, 1, 42); ok(Math.abs(f.liter - 42) < 1e-9 && f.andel < .5, 'lite diesel: fyller det som finnes');
ok(LV.fylling(1, .5, 60, .35, 1, 1000).liter === 0, 'full tank');

// ser: radar bare mål i bevegelse utenfor skog
const S = LB.ny(); S.bygg.push(bygg('radartårn', 0, 0), bygg('op', 10000, 0));
ok(!LV.ser(S, LB, new Set(), { x: 3000, y: 0 }), 'radar: står stille');
ok(LV.ser(S, LB, new Set(), { x: 3000, y: 0, sti: [[1, 1]] }), 'radar: i bevegelse');
ok(!LV.ser(S, LB, new Set(), { x: 3000, y: 0, sti: [[1, 1]], her: { k: 1 } }), 'radar: i skog');
ok(LV.ser(S, LB, new Set(), { x: 10800, y: 0 }) && !LV.ser(S, LB, new Set(), { x: 11000, y: 0 }), 'observasjonspost 900 m');

// droner: rampen trenger hangar
const D = LB.ny(); D.bygg.push(bygg('dronerampe')); ok(LV.leiren(D, LB, new Set()).drone === 0, 'rampe uten hangar');
D.bygg.push(bygg('dronehangar')); ok(LV.leiren(D, LB, new Set()).drone === 2, 'hangar + rampe = 2 droner');
// radio, satellitt, nett, bytte, fanger, varsling, vann
const K = LB.ny(); for (const t of ['kommandosenter', 'satellitt', 'trafo', 'ammobunker', 'våpenlager', 'arrest', 'hundegård', 'sirenemast', 'vannrens', 'antennestativ']) K.bygg.push(bygg(t));
u = LV.leiren(K, LB, new Set());
ok(u.radio === 12000 && u.satellitt && u.nett === 2 && Math.abs(u.bytte - .6 * .85) < 1e-9 && u.fangevakt === 4 && Math.abs(u.varsling - 1.95) < 1e-9 && u.vann, 'leirverdier');

// brukPå: lager, senger og strøm inn i Leir.BYGG (en kopi her)
const BY = { generatorhus: { kw: 0 }, lagerhall: {}, småtelt: {}, bærbarsol: { kw: 0 }, brakke: { nivå: { plasser: [8, 14, 20] } } };
LV.brukPå(BY);
ok(BY.generatorhus.kw === 30 && BY.generatorhus.diesel && BY.lagerhall.lager === 250 && BY.småtelt.plasser === 2 && BY.bærbarsol.sol && !BY.brakke.plasser, 'brukPå');
ok(BY.lagerhall.virkning === LV.VIRKNING.lagerhall.tekst, 'virkningsteksten settes');
// og Leir.steg regner generatorhuset som et aggregat (diesel) og solpanelet som sol
const G = LB.ny(); const gamle = { g: LB.BYGG.generatorhus, s: LB.BYGG.bærbarsol };
LB.BYGG.generatorhus = { navn: 'Generatorhus', pris: 1, tid: 1, kw: 30, diesel: true, fot: [-1, 1, -1, 1], mat: {} };
LB.BYGG.bærbarsol = { navn: 'Sol', pris: 1, tid: 1, kw: 1, sol: true, fot: [-1, 1, -1, 1], mat: {} };
LB.BYGG.forbruker = { navn: 'Forbruker', pris: 1, tid: 1, kw: -20, fot: [-1, 1, -1, 1], mat: {} };
G.drivstoff = 1000; G.bygg.push(bygg('generatorhus'), bygg('bærbarsol', 10, 0), bygg('forbruker', 20, 0));
const st = LB.steg(G, 60, 1);
ok(st.aggAntall === 1 && Math.abs(st.agg - 19) < 1e-9 && st.sol === 1 && !st.mangler.size, 'generatorhuset gir strøm av diesel (' + st.agg + ')');
// transformatoren: nettFaktor gange nettet
LB.nettKW = () => 5; LB.nettFaktor = () => 2; G.bygg = [bygg('forbruker')]; G.drivstoff = 0; ok(LB.steg(G, 60, 0).nett === 10, 'nettFaktor');
delete LB.nettKW; delete LB.nettFaktor; delete LB.BYGG.forbruker; LB.BYGG.generatorhus = gamle.g; LB.BYGG.bærbarsol = gamle.s;
if (!gamle.g) delete LB.BYGG.generatorhus; if (!gamle.s) delete LB.BYGG.bærbarsol;
// alle nøklene i NØKLER brukes av minst ett bygg
for (const k of LV.NØKLER) ok(Object.values(LV.VIRKNING).some(v => v[k] !== undefined), 'nøkkelen brukes: ' + k);
console.log(`test_leirvirkning: ${n} ok`);
// korttekstene: alle bygg har en, og de er korte
for (const k of Object.keys(LV.VIRKNING)) { const t = LV.kort(k); assert.ok(t && t.length <= 40, 'kort for ' + k + ': ' + t); }
assert.strictEqual(LV.kort('messe'), 'moral +4 · mindre matsvinn'); assert.strictEqual(LV.kort('betongbunker'), 'vern 75 %'); assert.strictEqual(LV.kort('gassflasker'), 'bare utseende');
console.log('test_leirvirkning: korttekster ok');
