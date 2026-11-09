// S2: kjøretøyreglene. Kjør fra repo-roten: node pipeline/fliser/test_kjoretoy.js [ekte-vegnett.bin]
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { les } = require('../../site/dovre-fliser/spill/vegnett');
const K = require('../../site/dovre-fliser/spill/kjoretoy');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-kjtest-'));
let data;
try { const fil = path.join(dir, 'fixture.bin'); execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]); data = fs.readFileSync(fil); }
finally { fs.rmSync(dir, { recursive: true, force: true }); }
const g = les(data);
const kjør = (kj, sek, steg = 5) => { let t = 0; while (kj.sti && t < sek) { K.steg(kj, steg); t += steg; } return t; };

// Testgrafen (test_vegnett.py): A(0,0)–B(1000,0) 60 km/t, B–C(2000,0) ukjent fart (E: 80), C–kai1–ferje–kai2–E(4000,0).
{ const kj = K.ny({ navn: 'Test', type: 'lastebil', antall: 3, x: 0, y: 0 });
  const p = K.planlegg(kj, g, [2000, 0]);
  const ventet = g.lenke(0).lengde / (60 / 3.6) + g.lenke(1).lengde / (80 / 3.6);
  assert(Math.abs(p.sekunder - ventet) < 1e-6, 'Reisetid = lengde / fart for hver lenke');
  assert.equal(K.status(kj).tilstand, 'kjører');
  const halv = K.posisjon(kj, 0), først = g.lenke(0).lengde / (60 / 3.6) / 2; K.steg(kj, først);
  const m = K.posisjon(kj, 0); assert(Math.abs(m.x - 500) < 2, 'Halvveis på første lenke etter halve tiden: ' + m.x);
  const bak = K.posisjon(kj, 60); assert(Math.abs(Math.hypot(m.x - bak.x, m.y - bak.y) - 60) < 2, 'Neste bil 60 m bak');
  assert.deepEqual([halv.x, halv.y], [0, 0]);
  let t = først; while (kj.sti) { K.steg(kj, 1); t++; }
  assert(Math.abs(t - ventet) <= 1.01, `Framme etter ${t} s (ventet ${ventet.toFixed(1)})`);
  assert.deepEqual([Math.round(kj.x), Math.round(kj.y)], [2000, 0]); assert(kj.framme); assert.equal(K.status(kj).tilstand, 'framme');
}
{ // ferja: 15 min venting én gang før den går fra land, 25 km/t over, samme reisetid som rutesøket
  const kj = K.ny({ navn: 'Ferje', type: 'lastebil', x: 2000, y: 0 }), p = K.planlegg(kj, g, [4000, 0]);
  assert.equal(p.ferjer, 1, 'Én venting selv om ferjestrekningen er to lenker');
  assert(Math.abs(p.sekunder - (1000 / (80 / 3.6) + 1000 / (25 / 3.6) + 900)) < 1e-6);
  K.steg(kj, 500 / (80 / 3.6) + 60); const s = K.status(kj);
  assert.equal(s.tilstand, 'venter på ferja'); assert(Math.abs(s.ventIgjen - 840) < 1e-6);
  assert(Math.abs(kj.x - 2500) < 1e-6, 'Venter på kaia');
  const total = 60 + 500 / (80 / 3.6) + kjør(kj, 1e5, 1); assert(Math.abs(total - p.sekunder) <= 1.01);
}
{ // speiderbil: toppfart 100, men aldri over fartsgrensen; stopp; kolonne uten sti står bakover
  const kj = K.ny({ navn: 'Speider', type: 'speiderbil', x: 0, y: 0 }); K.planlegg(kj, g, [2000, 0]);
  K.steg(kj, 10); assert(Math.abs(kj.x - 10 * 60 / 3.6 * (g.lenke(0).lengde > 0 ? 1 : 1)) < 2, 'Fartsgrensen 60 gjelder også speiderbilen');
  K.stopp(kj); const x = kj.x; K.steg(kj, 100); assert.equal(kj.x, x, 'Stoppet kolonne står');
  assert.equal(K.status(kj).tilstand, 'står');
  const b = K.posisjon(kj, 40); assert(b.x < kj.x, 'Bilene bak står bak tetbilen');
}
{ // ingen veg: sperret lenke, mål langt fra veg, ukjent type
  const kj = K.ny({ navn: 'X', x: 0, y: 0 });
  assert(K.planlegg(kj, g, [1e7, 1e7]).feil);
  g.sperr(1); g.sperr(3); assert(K.planlegg(kj, g, [2000, 0]).feil, 'Sperret bru: ingen veg'); g.åpne(1); g.åpne(3);
  assert.throws(() => K.ny({ navn: 'X', type: 'ubåt', x: 0, y: 0 }), RangeError);
  assert.throws(() => K.ny({ navn: 'X', x: NaN, y: 0 }), TypeError);
}
{ // samme fil i nettleseren: ingen DOM ved innlasting
  const vm = require('vm'), k = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/kjoretoy.js'), 'utf8'), k);
  assert.equal(typeof k.Kjoretoy.planlegg, 'function');
}
console.log('ok – reisetid, fart, ferjeventing, kolonne, stopp, ingen veg og DOM-fri modul');

if (process.argv[2]) {   // ekte vegnett: kravene i docs/plan-funksjoner.md (S2)
  const ekte = les(fs.readFileSync(process.argv[2]));
  const dombås = [193233, 6896398], otta = [212021, 6860888], molde = [100043, 6980665], vestnes = [94787, 6968602];
  const kj = K.ny({ navn: '1. lastebilkolonne', type: 'lastebil', antall: 4, x: dombås[0], y: dombås[1] });
  const p = K.planlegg(kj, ekte, otta);
  let e6 = 0; for (const e of K.lenkerIgjen(kj)) { const l = ekte.lenke(e); if (l.vegkategori === 'E' && l.vegnummer === 6) e6 += l.lengde; }
  assert(p.meter > 40000 && p.meter < 55000, 'Dombås–Otta ca. 46 km');
  assert(e6 / p.meter > .9, `Langs E6 (${(100 * e6 / p.meter).toFixed(0)} %)`);
  assert(p.sekunder > 30 * 60 && p.sekunder < 45 * 60, 'Rundt 37 minutter for en lastebil');
  const t = kjør(kj, 2 * 3600, 6);   // 6 spillsekunder = ett simuleringssteg i visningen
  assert(kj.framme && Math.hypot(kj.x - otta[0], kj.y - otta[1]) < 300 && Math.abs(t - p.sekunder) < 7, 'Framme i Otta i riktig tid');
  const f = K.ny({ navn: 'Ferje', x: molde[0], y: molde[1] }), q = K.planlegg(f, ekte, vestnes);
  assert(q.ferjer === 1 && q.sekunder > 900, 'Molde–Vestnes med ferje og venting');
  console.log(`ok – Dombås–Otta ${(p.meter / 1000).toFixed(1)} km, ${(p.sekunder / 60).toFixed(0)} min, ${(100 * e6 / p.meter).toFixed(0)} % på E6; Molde–Vestnes ${(q.meter / 1000).toFixed(1)} km, ${(q.sekunder / 60).toFixed(0)} min med ferje`);
}
