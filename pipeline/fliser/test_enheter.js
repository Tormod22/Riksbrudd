// S6: flere enheter. Kjør fra repo-roten: node pipeline/fliser/test_enheter.js [ekte-vegnett.bin]
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { les } = require('../../site/dovre-fliser/spill/vegnett');
const K = require('../../site/dovre-fliser/spill/kjoretoy'), E = require('../../site/dovre-fliser/spill/enheter'), T = require('../../site/dovre-fliser/terreng.js');
const R = E.REGLER, rng = T.Terreng ? T.Terreng.frø(7) : (() => { let s = 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
const lag = (x, y, k) => ({ x, y, her: { k }, menn: Array.from({ length: 12 }, () => ({ hp: 1 })) });
// stridsvogn: treff avtar med avstanden, skog gir dekning, utenfor rekkevidden ingen
{ const snitt = (d, f) => { let t = 0; for (let i = 0; i < 4000; i++) t += E.kanonrunde(d, f, rng); return t / 4000; };
  const nær = snitt(300, {}), langt = snitt(1500, {}), skog = snitt(300, { målISkog: true }), marsj = snitt(300, { skytterPåMarsj: true });
  assert(nær > langt && langt > 0, `nær ${nær} > langt ${langt} > 0`); assert(Math.abs(skog - nær / 2) < .15 && Math.abs(marsj - nær / 2) < .15);
  assert.equal(E.kanonrunde(R.stridsvogn.rekkevidde + 1, {}, rng), 0); assert(nær > .6 && nær < 2, 'ca. 1 treff per runde på 300 m (et lag: ca. 0,4): ' + nær); }
// artilleri: i ro, rekkevidde, ladetid, spredning, nedslag treffer begge sider innen radien
{ const a = { navn: 'A', x: 0, y: 0, sti: null };
  assert(E.avfyr({ ...a, sti: {} }, [10000, 0], true, rng).feil, 'må stå i ro');
  assert(E.avfyr(a, [40000, 0], true, rng).feil, 'for langt'); assert(E.avfyr(a, [500, 0], true, rng).feil, 'for nær');
  const { salve } = E.avfyr(a, [10000, 0], true, rng); assert(salve && a.lader === R.artilleri.ladetid); assert(E.avfyr(a, [10000, 0], true, rng).feil, 'lader');
  E.lad(a, R.artilleri.ladetid); assert.equal(a.lader, 0);
  let obs = 0, blind = 0; for (let i = 0; i < 2000; i++) { a.lader = 0; obs += Math.hypot(E.avfyr(a, [10000, 0], true, rng).salve.x - 10000, 0) / 2000; a.lader = 0;
    const s = E.avfyr(a, [10000, 0], false, rng).salve; blind += Math.hypot(s.x - 10000, s.y) / 2000; }
  assert(blind > 2.5 * obs, `blind spredning ${blind.toFixed(0)} m > observert ${obs.toFixed(0)} m`);
  const fi = lag(10000, 0, 2), venn = lag(10100, 0, 2), langt = lag(10400, 0, 2), iskog = lag(10000, 0, 1);
  let tf = 0, tv = 0, ts = 0;
  for (let i = 0; i < 400; i++) for (const [s, t] of E.nedslag({ x: 10000, y: 0 }, [fi, venn, langt, iskog].map(s => ({ ...s, menn: s.menn.map(m => ({ ...m })) })), rng)) {
    assert(s.x !== 10400, 'utenfor radien: ingen treff'); if (s.x === 10000 && s.her.k === 2) tf += t / 400; if (s.x === 10100) tv += t / 400; if (s.her.k === 1) ts += t / 400; }
  assert(tf > 4 && tv > 0 && tv < tf && ts < tf, `midt i: ${tf.toFixed(1)}, 100 m unna (egne!): ${tv.toFixed(1)}, i skog: ${ts.toFixed(1)}`); }
// radar: ser bare bevegelse på åpen mark, etter oppstart, innen rekkevidden
{ const r = { x: 0, y: 0, sti: null }; E.radarSteg(r, 300); const mål = { x: 8000, y: 0, sti: [1], her: { k: 2 } };
  assert(!E.radarSer(r, mål), 'ikke før oppstart'); E.radarSteg(r, 400); assert(E.radarSer(r, mål));
  assert(!E.radarSer(r, { ...mål, sti: null }), 'står i ro'); assert(!E.radarSer(r, { ...mål, her: { k: 1 } }), 'i skog');
  assert(!E.radarSer(r, { ...mål, x: 20000 }), 'for langt'); r.sti = {}; E.radarSteg(r, 10); assert(!E.radarSer(r, mål), 'radaren kjører'); }
// drone: flyr med 120 km/t, sirkler over målet, går tom
{ const d = E.nyDrone({ navn: 'D', x: 0, y: 0, mål: [10000, 0] });
  assert.equal(E.droneSteg(d, 60), 'flyr'); assert(Math.abs(d.x - 2000) < 1); assert(E.droneSer(d, 4000, 1000) && !E.droneSer(d, 5000, 0));
  let h; for (let i = 0; i < 10; i++) h = E.droneSteg(d, 60); assert.equal(d.x, 10000); assert(h === 'framme' || h === 'over målet');
  assert.equal(E.droneSteg(d, R.drone.levetid), 'tom'); assert(!E.droneSer(d, 10000, 0)); }
// skade på kjøretøy: lastebiler går i stykker av håndvåpen, stridsvogner nesten ikke; en kolonne mister ett kjøretøy om gangen
{ const lb = { type: 'lastebil', antall: 1 }; let r = E.skad(lb, 5); assert(!r.ødelagt && lb.skade > .5); r = E.skad(lb, 5); assert.equal(r.ødelagt, 1); assert(r.borte);
  const kol = { type: 'lastebil', antall: 4 }; r = E.skad(kol, 17); assert.equal(r.ødelagt, 1); assert.equal(kol.antall, 3); assert(!r.borte);
  const sv = { type: 'stridsvogn', antall: 1 }; E.skad(sv, 50); assert.equal(sv.antall, 1, 'stridsvogna tåler håndvåpen'); assert.equal(E.skad({ type: 'stridsvogn', antall: 1, skade: .9 }, 1, true).ødelagt, 0);
  assert.equal(E.skad({ type: 'lastebil', antall: 1 }, 2, true).ødelagt, 1, 'artilleri');
  let t = 0; for (let i = 0; i < 300; i++) for (const [, n] of E.nedslagKj({ x: 0, y: 0 }, [{ x: 50, y: 0, antall: 2 }, { x: 400, y: 0, antall: 1 }], rng)) t += n; assert(t > 100, 'kjøretøy i nedslaget får treff'); }
// nye kjøretøytyper på vegnettet (testgrafen fra test_vegnett.py)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-entest-'));
let data; try { const fil = path.join(dir, 'f.bin'); execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]); data = fs.readFileSync(fil); }
finally { fs.rmSync(dir, { recursive: true, force: true }); }
Object.assign(K.TYPER, E.KJORETOY); const g = les(data);
for (const type of Object.keys(E.KJORETOY)) { const kj = K.ny({ navn: type, type, x: 0, y: 0 }), r = K.planlegg(kj, g, [2000, 0]); assert(!r.feil && r.sekunder > 0, type); }
{ const vm = require('vm'), k = vm.createContext({}); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/enheter.js'), 'utf8'), k); assert.equal(typeof k.Enheter.avfyr, 'function'); }
console.log('ok – stridsvogn (avstand, skog, marsj), artilleri (i ro, rekkevidde, ladetid, spredning, egne i nærheten), radar, drone, nye kjøretøy på vegnettet');
if (process.argv[2]) {   // ekte vegnett: stridsvogna kjører Dombås–Otta saktere enn lastebilen
  const ekte = les(fs.readFileSync(process.argv[2]));
  const tid = type => K.planlegg(K.ny({ navn: type, type, x: 193233, y: 6896398 }), ekte, [212021, 6860888]).sekunder;
  const sv = tid('stridsvogn'), lb = tid('lastebil'); assert(sv > lb, 'stridsvogna er saktere');
  console.log(`ok – Dombås–Otta: stridsvogn ${Math.round(sv / 60)} min, lastebil ${Math.round(lb / 60)} min`);
}
