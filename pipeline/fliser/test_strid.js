// Regeltest for spill/strid.js: node pipeline/fliser/test_strid.js
const S = require('../../site/dovre-fliser/spill/strid'), T = require('../../site/dovre-fliser/terreng').Terreng, assert = require('assert');
Object.assign(T.VÅPEN, S.VÅPEN);
const ROLLER = ['lagfører', 'nestlagfører', 'skarpskytter', 'sanitet', 'radio', 'maskingevær', 'maskingevær', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle'], lag = () => ROLLER.map(rolle => ({ rolle, hp: 1 }));
// høyde
assert.strictEqual(S.høyde(0), 1); assert.strictEqual(S.høyde(9), 1); assert.ok(S.høyde(30) > 1 && S.høyde(30) < S.høyde(60)); assert.strictEqual(S.høyde(200), S.HØYDE.maks); assert.strictEqual(S.høyde(-200), S.HØYDE.ned); assert.ok(S.høyde(-30) < 1);
assert.ok(Math.abs(S.høydeRett(50) * 1.2 - S.høyde(50)) < 1e-12, 'Terrengs ×1,2 over 20 m tas ut');
// oppdagelse
assert.strictEqual(S.oppdagelse({ a: 100, b: null }, 120), S.OPPDAG.bakhold, 'fienden ser oss ikke: bakhold'); assert.strictEqual(S.oppdagelse({ a: 100, b: 110 }, 115), S.OPPDAG.først); assert.strictEqual(S.oppdagelse({ a: 110, b: 100 }, 115), S.OPPDAG.overrasket);
assert.strictEqual(S.oppdagelse({ a: 100, b: 110 }, 140), 1, 'overtaket varer en kvart time'); assert.strictEqual(S.oppdagelse({ a: 100, b: 101 }, 105), 1, 'samtidig: ingen fordel'); assert.strictEqual(S.oppdagelse({ a: null, b: 5 }, 9), 1);
// bevæpning og ildkraft
const f = {}, st = lag(), nær = S.bevæpn(lag(), 'nærstrid'), av = S.bevæpn(lag(), 'avstand'), tung = S.bevæpn(lag(), 'tung');
const k = (m, d) => S.kraft(m, d, f, 1, T.treffsjanse);
assert.ok(k(nær, 80) > k(st, 80) * 1.5, 'nærstrid er klart best helt nært'); assert.ok(k(nær, 500) < k(st, 500) * .5, 'og svak på avstand'); assert.ok(k(av, 700) > k(st, 700), 'avstand er best langt ute'); assert.ok(k(av, 80) < k(nær, 80));
assert.ok(k(tung, 300) > k(st, 300) && k(tung, 800) > k(st, 800), 'tung har mest ildkraft'); assert.strictEqual(S.bevæpn(nær, 'standard').filter(m => m.våpen).length, 0, 'standard tar våpnene tilbake til rollene');
st[0].hp = 0; st[1].hp = .5; assert.ok(k(st, 200) < k(lag(), 200), 'falne og sårede skyter ikke');
assert.strictEqual(S.forhold(2, 1), 2); assert.strictEqual(S.forhold(1, 0), Infinity); assert.strictEqual(S.forholdTekst(.4), 'klart underlegne'); assert.strictEqual(S.forholdTekst(1), 'jevnt');
// stridsreglene
const bal = S.standard(); assert.strictEqual(S.holdningFor(bal), 'balansert'); assert.strictEqual(S.ren({ ild: 'tull', tap: '3', bev: 'x' }).ild, 'fri'); assert.strictEqual(S.ren({ tap: '3' }).tap, 3);
assert.ok(S.ildLov({ ild: 'fri' }, { avstand: 800 })); assert.ok(!S.ildLov({ ild: 'besvar' }, { avstand: 100 })); assert.ok(S.ildLov({ ild: 'besvar' }, { avstand: 800, beskutt: true })); assert.ok(!S.ildLov({ ild: 'nær' }, { avstand: 400 })); assert.ok(S.ildLov({ ild: 'nær' }, { avstand: 150 }));
assert.strictEqual(S.reaksjon(bal, { forhold: .4, ute: 0, avstand: 300, beskutt: true }).hva, 'trekk', 'balansert trekker seg som underlegen under ild'); assert.strictEqual(S.reaksjon(bal, { forhold: .4, ute: 0, avstand: 300, beskutt: false }), null, 'men ikke før det smeller');
assert.strictEqual(S.reaksjon(S.HOLDNING.aggressiv.regel, { forhold: .2, ute: 9, avstand: 300, beskutt: true }), null, 'aggressiv kjemper uansett'); assert.strictEqual(S.reaksjon(S.HOLDNING.aggressiv.regel, { forhold: 2, ute: 0, avstand: 700, rekkevidde: 900 }).hva, 'fram');
assert.strictEqual(S.reaksjon(S.HOLDNING.forsiktig.regel, { forhold: .5, ute: 0, avstand: 1000, beskutt: false }).hva, 'unngå'); assert.strictEqual(S.reaksjon(bal, { forhold: 3, ute: 5, avstand: 300 }).hva, 'trekk', 'fem ute: retrett selv med overtak');
assert.strictEqual(S.reaksjon(bal, { forhold: 1, ute: 0 }), null, 'ingen fiende i sikte: ingenting');
console.log('ok   strid: høyde, oppdagelse, bevæpning, styrkeforhold og stridsregler');
