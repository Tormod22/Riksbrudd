// S5 del 2: skyttergraver og miner. Kjør fra repo-roten: node pipeline/fliser/test_feltarbeid.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const FA = require('../../site/dovre-fliser/spill/feltarbeid'), R = FA.REGLER;
let frø = 3; const rng = () => (frø = (frø * 1664525 + 1013904223) >>> 0) / 4294967296;
const lag = (x, y, side, sti = null) => ({ x, y, side, sti, menn: Array.from({ length: 12 }, () => ({ hp: 1 })) });
{ const s = lag(0, 0, 'blå'); assert.equal(FA.grav(s, 60), null, 'ikke i gang'); assert(FA.startGrav(s).ok);
  assert.equal(FA.grav(s, R.grav - 60), 'graver'); assert.equal(FA.vern(s), 1); assert.equal(FA.grav(s, 60), 'nedgravd'); assert.equal(FA.vern(s), R.vern);
  assert(FA.startGrav(s).feil, 'allerede nedgravd'); s.sti = [[0, 0]]; assert.equal(FA.grav(s, 60), 'flyttet'); assert.equal(FA.vern(s), 1, 'forlatt');
  assert(FA.startGrav(s).feil, 'må stå i ro');
  const i = lag(0, 0, 'blå'); FA.startGrav(i); assert.equal(FA.grav(i, R.gravIngeniør, true), 'nedgravd', 'ingeniører graver fortere'); }
{ const f = FA.nyttMinefelt({ x: 0, y: 0, side: 'blå', navn: 'M' });
  const egne = lag(10, 0, 'blå', [[0, 0]]), iRo = lag(10, 0, 'rød'), utenfor = lag(500, 0, 'rød', [[0, 0]]), fi = lag(50, 0, 'rød', [[0, 0]]), bil = { x: 30, y: 0, side: 'rød', sti: {}, antall: 1 };
  let lagT = 0, bilT = 0, n = 0;
  while (f.ladninger > 0 && n < 500) { for (const [e, t] of FA.mineSteg(f, [egne, iRo, utenfor, fi, bil], rng)) { assert(e === fi || e === bil, 'bare fiender i bevegelse i feltet'); if (e === fi) lagT += t; else bilT += t; } n++; }
  assert.equal(f.ladninger, 0); assert(lagT >= 1 && bilT >= R.mine.skade, `lag ${lagT}, kjøretøy ${bilT}`); assert.deepEqual(FA.mineSteg(f, [fi], rng), [], 'tomt felt'); }
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/feltarbeid.js'), 'utf8'), k); assert.equal(typeof k.Feltarbeid.mineSteg, 'function'); }
console.log('ok – nedgraving (tid, vern, forlatt ved flytting, ingeniører raskere), minefelt (bare fiender i bevegelse, ladningene brukes opp)');
