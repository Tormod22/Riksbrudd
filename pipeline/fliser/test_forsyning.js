// S4: forsyning (ammunisjon og drivstoff). Kjør fra repo-roten: node pipeline/fliser/test_forsyning.js
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { les } = require('../../site/dovre-fliser/spill/vegnett');
const K = require('../../site/dovre-fliser/spill/kjoretoy'), Ø = require('../../site/dovre-fliser/spill/okonomi'), F = require('../../site/dovre-fliser/spill/forsyning');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-fstest-'));
let data; try { const fil = path.join(dir, 'f.bin'); execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]); data = fs.readFileSync(fil); }
finally { fs.rmSync(dir, { recursive: true, force: true }); }
const g = les(data), R = F.REGLER;
{ // ammunisjon: full treffkraft til 25 %, så svakere, null ved tomt; 4 % per runde
  const lag = { navn: 'Lag', side: 'blå', x: 0, y: 0 };
  assert.equal(F.skyt(lag), 1); assert(Math.abs(lag.ammo - .98) < 1e-9);
  let n = 1; while (F.ammo(lag) > 0 && n < 100) { F.skyt(lag); n++; } assert.equal(n, 50, '50 ildrunder på full last');
  assert.equal(F.skyt(lag), 0, 'Tomt: skyter ikke');
  lag.ammo = .125; assert(Math.abs(F.skyt(lag) - .5) < 1e-9, 'Halv treffkraft ved 12,5 %');
}
{ // drivstoff: 900 km for lastebil, tom tank meldes én gang
  const k = K.ny({ navn: 'L', type: 'lastebil', antall: 2, x: 0, y: 0 });
  assert.equal(F.kjør(k, 450000), false); assert(Math.abs(k.drivstoff - .5) < 1e-9);
  assert.equal(F.kjør(k, 500000), true); assert.equal(k.drivstoff, 0); assert.equal(F.kjør(k, 1000), false);
  assert(Math.abs(F.behovKj(k) - 2 * R.drivstoff.lastebil.tank) < 1e-9, 'To biler: to tanker');
}
{ // levering: bare egne innen 500 m, så langt tonnene rekker
  const a = { side: 'blå', x: 100, y: 0, ammo: 0 }, b = { side: 'blå', x: 2000, y: 0, ammo: 0 }, c = { side: 'rød', x: 0, y: 0, ammo: 0 };
  const k = K.ny({ navn: 'S', type: 'speiderbil', x: 0, y: 300 }); k.drivstoff = 0;
  const r = F.lever(0, 0, 10, [a, b, c], [k]);
  assert.equal(a.ammo, 1); assert.equal(b.ammo, 0); assert.equal(c.ammo, 0); assert.equal(k.drivstoff, 1);
  assert(Math.abs(r.brukt - (R.ammo.vekt + R.drivstoff.speiderbil.tank)) < 1e-9);
  const d = { side: 'blå', x: 0, y: 0, ammo: 0 }, r2 = F.lever(0, 0, .25, [d], []); assert(Math.abs(d.ammo - .5) < 1e-9 && r2.brukt === .25, 'Halv last: halvfull');
}
{ // forsyningsoppdrag: basen ved A (0,0), laget ved C (2000,0); lastebilen står ved basen
  const base = Ø.base({ navn: 'Base', x: 0, y: 0, beholdning: 50 }), lag = { navn: 'Lag', side: 'blå', x: 2000, y: 0, ammo: .1 };
  const k = K.ny({ navn: 'Kolonne', type: 'lastebil', antall: 4, x: 0, y: 0 });
  F.forsyn(k, g, base, lag, K); assert.equal(k.oppdrag.fase, 'laster');
  let t = 0, framme = null; while (k.oppdrag && t < 6 * 3600) { for (const h of F.steg(k, g, 6, K)) if (h.hva === 'framme') framme = h; t += 6; }
  assert(framme, 'Kom fram'); assert.equal(base.beholdning, 40, 'Tok 10 t fra basen'); assert.equal(k.forsyning, 10);
  const r = F.lever(framme.x, framme.y, k.forsyning, [lag], []); k.forsyning -= r.brukt;
  assert.equal(lag.ammo, 1); assert(Math.abs(k.forsyning - (10 - .9 * R.ammo.vekt)) < 1e-9);
  // med last igjen kjører den rett til neste mål uten å hente på basen
  F.forsyn(k, g, base, { x: 0, y: 0 }, K); assert.equal(k.oppdrag.fase, 'til mål');
  assert(F.forsyn(K.ny({ navn: 'S', type: 'speiderbil', x: 0, y: 0 }), g, base, lag, K).feil);
}
{ // økonomien rører ikke forsyningsoppdrag
  const k = K.ny({ navn: 'K', type: 'lastebil', x: 0, y: 0 }); k.oppdrag = { type: 'forsyning', fase: 'laster', igjen: 100 };
  assert.deepEqual(Ø.steg(k, g, 50, K), []); assert.equal(k.oppdrag.igjen, 100); assert.equal(Ø.tekst(k), null);
}
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/forsyning.js'), 'utf8'), k); assert.equal(typeof k.Forsyning.lever, 'function'); }
console.log('ok – ammunisjon og treffkraft, drivstoff og tom tank, levering innen 500 m, forsyningsoppdrag fra basen, last igjen');
