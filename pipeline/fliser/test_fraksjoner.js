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
console.log('ok – AI: ta tettsteder (store foran), garnison og videre, stell/forsyninger, angrip/trekk unna, slått ut trekker seg tilbake');
