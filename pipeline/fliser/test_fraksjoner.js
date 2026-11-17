// S8: fraksjoner og AI. Kjør fra repo-roten: node pipeline/fliser/test_fraksjoner.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const F = require('../../site/dovre-fliser/spill/fraksjoner'), R = F.REGLER;
const lag = (navn, x, y, ute = 0) => ({ navn, x, y, menn: Array.from({ length: 12 }, (_, i) => ({ hp: i < ute ? 0 : 1 })) });
const by = (id, navn, x, y, folk, eier) => ({ id, navn, x, y, folk, eier, inni: (X, Y) => Math.hypot(X - x, Y - y) < 500 });
const verden = (o = {}) => ({ side: 'rød', byer: [by(1, 'Nær', 3000, 0, 500, null), by(2, 'Stor', 6000, 0, 20000, null), by(3, 'Vår', -4000, 0, 800, 'rød')], fiender: [], venner: [], hjem: [-9000, 0], ammo: 1, ...o });
assert.equal(Object.keys(F.FRAKSJONER).join(), 'blå,rød,grønn'); assert.equal(F.FRAKSJONER.rød.navn, 'Kystalliansen');
{ const s = lag('A', 0, 0), v = F.velg(s, verden()); assert.equal(v.hva, 'ta'); assert.equal(v.x, 6000, 'større tettsted teller som nærmere'); }
{ const s = lag('A', 0, 0), v = F.velg(s, verden({ byer: [by(1, 'Nær', 3000, 0, 500, null), by(3, 'Vår', -4000, 0, 800, 'rød')] })); assert.equal(v.x, 3000); }
{ const v = F.velg(lag('A', 0, 0, 6), verden()); assert.equal(v.hva, 'trekk'); assert.equal(v.x, -4000, 'slått ut: til eget tettsted'); }
{ const v = F.velg(lag('A', 0, 0, 6), verden({ byer: [] })); assert.deepEqual([v.hva, v.x], ['trekk', -9000], 'uten tettsted: hjem'); }
{ const v = F.velg(lag('A', 0, 0, 3), verden()); assert.equal(v.hva, 'forsyn'); assert.equal(v.x, -4000); }
{ const v = F.velg(lag('A', 0, 0), verden({ ammo: .1 })); assert.equal(v.hva, 'forsyn', 'lite ammunisjon'); }
{ const v = F.velg(lag('A', -4000, 0, 3), verden()); assert.equal(v.hva, 'hold', 'stell i eget tettsted'); }
{ const fi = { x: 800, y: 0, navn: 'Blå', styrke: 12 };
  assert.equal(F.velg(lag('A', 0, 0), verden({ fiender: [fi] })).hva, 'angrip');
  const t = F.velg(lag('A', 0, 0, 5), verden({ fiender: [fi], byer: [] })); assert.equal(t.hva, 'trekk'); assert(t.x < 0, 'trekker seg unna');
  assert.equal(F.velg(lag('A', 0, 0), verden({ fiender: [{ ...fi, x: 1600 }] })).hva, 'ta', 'utenfor angrepsavstand'); }
{ const a = lag('A', -4000, 0), b = lag('B', -4100, 0), w = verden({ venner: [a, b] });
  assert.equal(F.velg(a, w).hva, 'hold', 'garnison'); assert.equal(F.velg(b, w).hva, 'ta', 'det andre laget går videre'); }
{ const v = F.velg(lag('A', 3000, 0), verden()); assert.equal(v.hva, 'hold'); assert.match(v.tekst, /tar Nær/); }
assert(F.styrke(lag('A', 0, 0)) === 12 && F.styrke(lag('A', 0, 0), 0) < 3);
assert(F.sympati('rød', F.FRAKSJONER.rød.akse) === 1 && F.sympati('rød', F.FRAKSJONER.grønn.akse) < .8);
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/fraksjoner.js'), 'utf8'), k); assert.equal(typeof k.Fraksjoner.velg, 'function'); }
// startstedene rundt leiren (feilretting 12. nov: på /norge sto motstanderne bare på Dovre)
{ const leir = { x: 0, y: 0 }, by = (navn, x, y) => ({ navn, x, y });
  const st = F.startsteder(leir, [by('For nær', 2000, 0), by('Nord', 0, 9000), by('Nordnabo', 3000, 12000), by('Sør', 0, -20000), by('Langt', 80000, 0)]);
  assert.equal(st.rød.navn, 'Nord', 'rød: nærmeste tettsted minst 6 km unna'); assert.equal(st.grønn.navn, 'Sør', 'grønn: i en annen retning enn rød');
  const to = F.startsteder(leir, [by('Nord', 0, 9000), by('Nordøst', 9000, 15000)]); assert.equal(to.grønn.navn, 'Nordøst', 'grønn: ellers nærmeste som ligger 8 km fra rød');
  const en = F.startsteder(leir, [by('Nord', 0, 9000)]); assert(en.rød.by && !en.grønn.by && Math.hypot(en.grønn.x, en.grønn.y) > 6000, 'ett tettsted: grønn får et punkt i terrenget');
  const ingen = F.startsteder(leir, []); assert(!ingen.rød.by && !ingen.grønn.by && ingen.rød.x === -9000 && Math.hypot(ingen.rød.x - ingen.grønn.x, ingen.rød.y - ingen.grønn.y) > 8000, 'ingen tettsteder: to punkter i hver sin retning'); }
console.log('ok – startsteder: nærmeste tettsteder i hver sin retning, ellers punkter i terrenget');
// BEDRE AI (17. nov): samarbeid, hjelp, jakt, bakhold, tapte tettsteder, leiren, forsterkningstak og angrepspunkt
{ const s = lag('A', 0, 0), venn = lag('B', 400, 0), fi = [{ x: 900, y: 0, navn: 'Blå', styrke: 20 }];
  assert.equal(F.velg(s, verden({ fiender: fi })).hva, 'trekk', 'alene mot en sterk fiende: trekk unna');
  const v = F.velg(s, verden({ fiender: fi, venner: [s, venn] })); assert.equal(v.hva, 'angrip', 'to lag sammen er sterke nok'); assert(/sammen med B/.test(v.tekst));
  const langt = lag('C', -3000, 0), w = F.velg(s, verden({ fiender: fi, venner: [s, langt] })); assert.deepEqual([w.hva, w.x], ['samle', -3000], 'underlegen: gå mot en venn og samle styrkene'); }
{ const s = lag('A', 0, 0), b = lag('B', 3000, 0), v = F.velg(s, verden({ venner: [s, b], hjelp: [{ x: 3000, y: 0, navn: 'B', lag: b }] })); assert.deepEqual([v.hva, v.x], ['støtt', 3000], 'kommer en venn under ild til hjelp');
  const g = lag('G', -4000, 0), u = F.velg(g, verden({ venner: [g, b], hjelp: [{ x: 3000, y: 0, navn: 'B', lag: b }] })); assert.equal(u.hva, 'hold', 'den eneste garnisonen blir stående'); }
{ const s = lag('A', 0, 0), minne = { x: 2000, y: 2000, navn: 'Blå', styrke: 8, alder: 30 };
  assert.equal(F.velg(s, verden({ minne })).hva, 'jakt', 'leter der fienden sist ble sett'); assert.equal(F.velg(s, verden({ minne: { ...minne, alder: 500 } })).hva, 'ta', 'gammelt minne glemmes');
  assert.equal(F.velg(s, verden({ minne: { ...minne, styrke: 40 } })).hva, 'ta', 'for sterk fiende jaktes ikke'); }
{ const s = lag('A', 0, 0), fi = [{ x: 800, y: 0, navn: 'Blå', styrke: 10 }];
  assert.equal(F.velg(s, verden({ side: 'grønn', fiender: fi, iSkog: true })).hva, 'hold', 'de forsiktige ligger i bakhold i skog'); assert.equal(F.velg(s, verden({ side: 'grønn', fiender: fi, iSkog: true, beskutt: true })).hva, 'angrip', 'men svarer når de blir beskutt');
  assert.equal(F.velg(s, verden({ side: 'rød', fiender: [{ x: 800, y: 0, navn: 'Blå', styrke: 16 }] })).hva, 'angrip', 'Kystalliansen tar sjanser (0,7)'); assert.equal(F.velg(s, verden({ side: 'grønn', fiender: [{ x: 800, y: 0, navn: 'Blå', styrke: 16 }] })).hva, 'trekk', 'Folkefronten gjør det ikke'); }
{ const s = lag('A', 0, 0), b = lag('B', 100, 0), byer = [by(1, 'Nær', 3000, 0, 500, null), by(2, 'Lenger', 0, 5000, 500, null)];
  const opptatt = new Map([[1, b]]); assert.equal(F.velg(s, verden({ byer, opptatt })).x, 0, 'tar ikke det samme tettstedet som en venn'); assert.equal(F.velg(s, verden({ byer: [byer[0]], opptatt })).x, 3000, 'men følger med når det ikke finnes noe annet');
  const tapt = [by(1, 'Nær', 3000, 0, 500, null), Object.assign(by(2, 'Tapt', 0, 6000, 500, 'blå'), { tapt: true })]; const v = F.velg(s, verden({ byer: tapt })); assert(v.y === 6000 && /tilbake/.test(v.tekst), 'vil ta tilbake det den har mistet'); }
{ const s = lag('A', 0, 0), v = F.velg(s, verden({ byer: [], leir: { x: 5000, y: 0, navn: 'leiren din' } })); assert.deepEqual([v.hva, v.x, v.mål], ['leir', 5000, 'leir'], 'rykker mot leiren når den er kjent'); }
assert.deepEqual([F.lagTak(0), F.lagTak(2), F.lagTak(5), F.lagTak(40)], [3, 4, 5, 6], 'flere tettsteder gir flere lag, høyst 6');
{ const h = (x, y) => (x > 1000 ? 100 : 0) + (y > 200 ? 50 : 0), p = F.angrepspunkt({ x: 0, y: 0 }, { x: 1000, y: 0 }, h); assert(p.x > 1000 && p.vinn >= 100, 'går rundt til det høye terrenget: ' + JSON.stringify(p));
  const flat = F.angrepspunkt({ x: 0, y: 0 }, { x: 1000, y: 0 }, () => 10); assert(Math.abs(flat.x - 720) < 1 && Math.abs(flat.y) < 1, 'flatt: korteste veg'); assert(F.angrepspunkt({ x: 900, y: 0 }, { x: 1000, y: 0 }, () => 0).x === 900, 'alt nær nok: bli stående');
  assert(isFinite(F.angrepspunkt({ x: 0, y: 0 }, { x: 1000, y: 0 }, () => NaN).x), 'ukjent høyde gir likevel et punkt'); }
console.log('ok – bedre AI: samlet angrep, samling, hjelp, jakt, bakhold, opptatte og tapte tettsteder, leiren, lagtak og angrepspunkt');
console.log('ok – AI: ta tettsteder (store foran), garnison og videre, stell/forsyninger, angrip/trekk unna, slått ut trekker seg tilbake');
