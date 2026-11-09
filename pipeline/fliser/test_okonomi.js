// S3: oljeøkonomien. Kjør fra repo-roten: node pipeline/fliser/test_okonomi.js [ekte-vegnett.bin]
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { les } = require('../../site/dovre-fliser/spill/vegnett');
const K = require('../../site/dovre-fliser/spill/kjoretoy'), Ø = require('../../site/dovre-fliser/spill/okonomi');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-oktest-'));
let data;
try { const fil = path.join(dir, 'fixture.bin'); execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]); data = fs.readFileSync(fil); }
finally { fs.rmSync(dir, { recursive: true, force: true }); }
const g = les(data), R = Ø.REGLER;

{ // en runde: basen er tom, ingenting kan bygges før oljen er kjørt fra terminalen
  const b = Ø.base({ navn: 'Base', x: 0, y: 0 }), t = Ø.terminal({ id: 1, navn: 'Terminal', x: 2000, y: 0, beholdning: 500 });
  const kj = K.ny({ navn: 'Kolonne', type: 'lastebil', antall: 4, x: 0, y: 0 });
  assert(Ø.bygg(b, 'lastebil').feil, 'Tom base: kan ikke bygge');
  assert.equal(Ø.kapasitet(kj), 100);
  const r = Ø.hentOlje(kj, g, t, b, K); assert(!r.feil);
  const tur = r.sekunder; let tid = 0, levert = 0, hend = [];
  while (levert === 0 && tid < 10 * 3600) { const h = Ø.steg(kj, g, 6, K); Ø.tikk([t], [b], 6); tid += 6; hend.push(...h); for (const e of h) if (e.hva === 'levert') levert = e.tonn; }
  assert.equal(levert, 100, 'Leverte en full last');
  const ventet = tur + R.lastetid + tur + R.lossetid;   // samme veg tilbake
  assert(Math.abs(tid - ventet) <= 12, `Tid for én runde ${tid} s (ventet ca. ${ventet.toFixed(0)})`);
  assert.deepEqual(hend.map(e => e.hva), ['lastet', 'levert']);
  assert.equal(b.beholdning, 100);
  assert(kj.oppdrag && kj.oppdrag.fase === 'til terminal', 'Skytteltrafikk: tilbake til terminalen');
  // nå kan basen bygge: oljen trekkes, enheten blir ferdig etter byggetiden
  assert(Ø.bygg(b, 'lastebil').ok); assert.equal(b.beholdning, 60);
  assert.deepEqual(Ø.tikk([t], [b], R.byggetid.lastebil - 1), []);
  const ferdig = Ø.tikk([t], [b], 1); assert.equal(ferdig.length, 1); assert.equal(ferdig[0].type, 'lastebil');
  Ø.avbryt(kj, K); assert.equal(kj.oppdrag, null);
}
{ // terminalen produserer, men har en grense; en tom terminal gir halv last
  const t = Ø.terminal({ id: 2, navn: 'T', x: 0, y: 0, beholdning: 0 });
  Ø.tikk([t], [], 3600); assert(Math.abs(t.beholdning - 150) < 1e-6, '150 t per time');
  Ø.tikk([t], [], 100 * 3600); assert.equal(t.beholdning, R.lagerTerminal);
  const b = Ø.base({ navn: 'B', x: 0, y: 0 }), t2 = Ø.terminal({ id: 3, navn: 'T2', x: 2000, y: 0, beholdning: 30 });
  const kj = K.ny({ navn: 'K', type: 'lastebil', antall: 4, x: 0, y: 0 }); Ø.hentOlje(kj, g, t2, b, K, false);
  let n = 0; while (kj.oppdrag && n < 5000) { Ø.steg(kj, g, 6, K); n++; }
  assert.equal(b.beholdning, 30, 'Tar det som er'); assert.equal(kj.oppdrag, null, 'Uten skyttel: ferdig etter én tur');
}
{ // speiderbil kan ikke frakte olje; ukjent enhet
  const kj = K.ny({ navn: 'S', type: 'speiderbil', x: 0, y: 0 });
  assert(Ø.hentOlje(kj, g, Ø.terminal({ id: 4, navn: 'T', x: 2000, y: 0 }), Ø.base({ navn: 'B', x: 0, y: 0 }), K).feil);
  assert.throws(() => Ø.bygg(Ø.base({ navn: 'B', x: 0, y: 0, beholdning: 1e6 }), 'slagskip'), RangeError);
}
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/okonomi.js'), 'utf8'), k);
  assert.equal(typeof k.Okonomi.hentOlje, 'function'); }
console.log('ok – tom base må hente olje før bygging, lasting/lossing, skytteltrafikk, produksjon og lagergrense, byggekø');

if (process.argv[2]) {   // ekte vegnett: Dombås – nærmeste terminal (Nyhamna på Aukra) og tilbake
  const ekte = les(fs.readFileSync(process.argv[2]));
  const b = Ø.base({ navn: 'Hovedbase Dombås', x: 192960, y: 6896180 }), t = Ø.terminal({ id: 0, navn: 'Nyhamna', x: 91011, y: 6994207, beholdning: 500 });
  const kj = K.ny({ navn: '1. lastebilkolonne', type: 'lastebil', antall: 4, x: b.x, y: b.y }), r = Ø.hentOlje(kj, ekte, t, b, K);
  assert(!r.feil, r.feil); let tid = 0; while (!b.beholdning && tid < 24 * 3600) { Ø.steg(kj, ekte, 6, K); tid += 6; }
  assert.equal(b.beholdning, 100);
  console.log(`ok – Dombås–Nyhamna ${(r.meter / 1000).toFixed(0)} km; første last på basen etter ${(tid / 3600).toFixed(1)} spilltimer`);
}
