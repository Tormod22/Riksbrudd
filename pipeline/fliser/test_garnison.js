// S7: garnisoner og tettsteder. Kjør fra repo-roten: node pipeline/fliser/test_garnison.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const G = require('../../site/dovre-fliser/spill/garnison'), R = G.REGLER;
// et kvadratisk tettsted (2 × 2 km) med et hull i midten (partall/oddetall), 3000 innbyggere
const by = { e: { id: 1, navn: 'Testby', folk: 3000 }, bb: [0, 0, 2000, 2000],
  deler: [new Float64Array([0, 0, 2000, 0, 2000, 2000, 0, 2000]), new Float64Array([900, 900, 1100, 900, 1100, 1100, 900, 1100])] };
const lag = (navn, x, y, side) => ({ navn, x, y, side, menn: Array.from({ length: 12 }, (_, i) => ({ navn: 'M' + i, rolle: i ? 'rifle' : 'lagfører', hp: 1 })) });
assert(G.inni(by, 500, 500) && !G.inni(by, 1000, 1000) && !G.inni(by, 2500, 500), 'omriss med hull');
{ const S = G.ny(), a = lag('A', 500, 500, 'blå'), f = lag('F', 1500, 1500, 'rød');
  let h = G.steg(S, [by], [a], 600); assert.equal(h[0].hva, 'inntar'); assert.equal(G.tilstand(S, 1).eier, null);
  h = G.steg(S, [by], [a], R.innta); assert(h.some(x => x.hva === 'inntatt' && x.side === 'blå')); assert.equal(G.tilstand(S, 1).eier, 'blå');
  // fienden kommer: strid, ingen tar det; blå går ut: fienden tar det etter innta-tiden
  h = G.steg(S, [by], [a, f], 600); assert.equal(G.tilstand(S, 1).eier, 'blå'); assert.equal(G.tilstand(S, 1).inntar, null);
  a.x = 5000; G.steg(S, [by], [a, f], R.innta - 1); assert.equal(G.tilstand(S, 1).eier, 'blå', 'ikke før tiden');
  h = G.steg(S, [by], [a, f], 1); assert.equal(G.tilstand(S, 1).eier, 'rød'); assert.equal(h.find(x => x.hva === 'inntatt').fra, 'blå');
  // et slått ut lag holder ikke tettstedet
  const ut = lag('U', 500, 500, 'blå'); ut.menn.slice(0, 6).forEach(m => { m.hp = 0; }); f.x = 5000;
  G.steg(S, [by], [ut], R.innta * 2); assert.equal(G.tilstand(S, 1).eier, 'rød', 'slått ut lag tar ikke'); }
// forsterkning: sårede først, så falne; raten etter folketall og strøm
{ const a = lag('A', 500, 500, 'blå'); a.menn[3].hp = .5; a.menn[5].hp = 0; a.menn[7].hp = 0;
  const rate = G.rate(3000, R.forsterkning, true); assert.equal(rate, 3);
  let r = G.forsterk(a, 3000, 1200, true, rolle => ({ navn: 'Ny', rolle, hp: 1 })); assert.equal(r.length, 1); assert.equal(r[0][0], 'frisk'); assert.equal(a.menn[3].hp, 1);
  r = G.forsterk(a, 3000, 2400, true, rolle => ({ navn: 'Ny', rolle, hp: 1 })); assert.deepEqual(r.map(x => x[0]), ['ny', 'ny']); assert(a.menn.every(m => m.hp === 1));
  assert.equal(a.menn[5].navn, 'Ny'); assert.equal(a.menn[5].rolle, 'rifle');
  assert(Math.abs(G.rate(3000, R.forsterkning, false) - 3 * R.strøm.uten) < 1e-9, 'uten strøm');
  assert.equal(G.rate(100, R.forsterkning, true), R.forsterkning.min); assert.equal(G.rate(1e6, R.forsterkning, true), R.forsterkning.maks); }
// produksjon og strøm
{ assert(Math.abs(G.produksjon(3000, 3600, true) - 3) < 1e-9); assert(Math.abs(G.produksjon(3000, 3600, false) - 3 * R.strøm.uten) < 1e-9);
  assert(G.harStrøm(by, [{ x: 30000, y: 0, hel: true }])); assert(!G.harStrøm(by, [{ x: 30000, y: 0, hel: false }]), 'sabotert'); assert(!G.harStrøm(by, [{ x: 60000, y: 0, hel: true }]), 'for langt'); }
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/garnison.js'), 'utf8'), k); assert.equal(typeof k.Garnison.steg, 'function'); }
console.log('ok – inntak (30 min alene), strid, fienden tar over, slått ut lag holder ikke, forsterkning (sårede først), produksjon og strøm');
