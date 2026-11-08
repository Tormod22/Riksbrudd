// Kjør fra repo-roten: node pipeline/fliser/test_vegnett.js [ekte-vegnett.bin]
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process'), { performance } = require('perf_hooks');
const { les, last } = require('../../site/dovre-fliser/spill/vegnett');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-vegtest-'));
let data;
try {
  const fil = path.join(dir, 'fixture.bin');
  execFileSync('python3', [path.join(__dirname, 'test_vegnett.py'), '--fixture', fil]);
  data = fs.readFileSync(fil);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
const g = les(data), a = [0, 0], c = [2000, 0];
let r = g.rute(a, c);
assert.deepEqual(r.lenker, [0, 1]);
assert.equal(g.lenke(0).fartsgrense, 60);
assert.equal(g.lenke(1).fartsgrense, null);
assert.deepEqual(g.infraLenker(60, 12345), [1]);
assert.deepEqual(g.infraLenker(67, 23456), [3]);
assert.deepEqual(g.infraLenker(770, 34567), [5, 6]);
assert.deepEqual(g.linje(0), [[0, 0], [500, 20], [1000, 0]]);
const normalTid = r.sekunder;
g.sperr(1); r = g.rute(a, c);
assert.deepEqual(r.lenker, [2, 3]); assert(r.sekunder > normalTid);
assert.equal(g.rute(c, a), null, 'Enveiskjøring gjelder også ved sperring');
g.sperr(3); assert.equal(g.rute(a, c), null);
g.åpne(1); assert.deepEqual(g.rute(a, c).lenker, [0, 1]);
g.åpne(3);
assert.equal(g.rute(a, [1000, -1000]), null, 'Planskilt kryss kobles ikke sammen');
assert.equal(g.rute(a, [1e7, 1e7]), null, 'Ikke teleporter til en fjern veg');
assert.deepEqual(g.rute(a, a).lenker, []);
assert.equal(g.rute(a, a).sekunder, 0);
const ferje = g.rute([2000, 0], [4000, 0]);
assert(Math.abs(ferje.sekunder - (1000 / (80 / 3.6) + 1000 / (25 / 3.6) + 900)) < .001, 'Bare én ventetid over to ferjesegmenter');
assert.equal(g.rute([4000, 0], [2000, 0]).sekunder, ferje.sekunder);
g.sperr(6); assert.equal(g.rute([2000, 0], [4000, 0]), null); g.åpne(6);
assert.equal(g.rute(a, c, { tillat: e => e.sekvens !== 2 }).lenker[0], 2);
for (const e of [-1, .5, 900]) assert.throws(() => g.sperr(e), RangeError);
assert.throws(() => g.rute(a, c, { ferjeVentetid: -1 }), RangeError);
assert.throws(() => g.rute([NaN, 1], c), TypeError);
assert.throws(() => les(data.subarray(0, data.length - 1)));
const korrupt = Buffer.from(data); korrupt.writeUInt32LE(0xffffffff, 8); assert.throws(() => les(korrupt));
const offset = Buffer.concat([Buffer.alloc(7), data]).subarray(7); assert.deepEqual(les(offset).rute(a, c).lenker, [0, 1]);
// Samme nettleserfil uten Node, DOM, fetch, document eller window ved innlasting.
const vm = require('vm'), kontekst = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/vegnett.js'), 'utf8'), kontekst);
assert.equal(typeof kontekst.Vegnett.les, 'function');
console.log('ok – ruter, omkjøring, ingen veg, gjenåpning, enveiskjøring, planskilt kryss, ferje, binærformat og DOM-fri modul');

// Uavhengig referanse: Dijkstra på fixture, inkludert tilfeldige sperringer.
function referanse(graf, start, slutt) {
  const land = new Set();   // noder med vanlig veg: der venter man på ferja (nodenumrene avhenger av filformatet)
  for (let e = 0; e < 9; e++) { const l = graf.lenke(e); if (!l.ferje) { land.add(l.fra); land.add(l.til); } }
  const dist = Array(graf.antallNoder).fill(Infinity), ferdig = new Set(); dist[start] = 0;
  while (ferdig.size < dist.length) {
    let n = -1;
    for (let i = 0; i < dist.length; i++) if (!ferdig.has(i) && (n < 0 || dist[i] < dist[n])) n = i;
    if (n < 0 || !Number.isFinite(dist[n])) return null;
    if (n === slutt) return dist[n];
    ferdig.add(n);
    for (let e = 0; e < 9; e++) {
      const l = graf.lenke(e);
      if (l.sperret || (e === 3 && l.fra !== n)) continue;
      const v = l.fra === n ? l.til : l.til === n ? l.fra : -1;
      if (v < 0) continue;
      const pris = l.lengde / ((l.ferje ? 25 : l.fartsgrense || 80) / 3.6) + (l.ferje && land.has(n) ? 900 : 0);
      dist[v] = Math.min(dist[v], dist[n] + pris);
    }
  }
  return null;
}
for (let mask = 0; mask < 16; mask++) {
  for (let e = 0; e < 4; e++) mask & (1 << e) ? g.sperr(e) : g.åpne(e);
  for (let start = 0; start < 10; start++) for (let slutt = 0; slutt < 10; slutt++) {
    const fasit = referanse(g, start, slutt), r = g.rute(start, slutt);
    if (fasit === null) assert.equal(r, null);
    else assert(Math.abs(r.sekunder - fasit) < 1e-7, `A* og Dijkstra er uenige: ${mask}/${start}/${slutt}`);
  }
}
for (let e = 0; e < 4; e++) g.åpne(e);
console.log('ok – 1600 rutesøk samsvarer med uavhengig Dijkstra-referanse');


async function sjekk() {
  await assert.rejects(last('test', async () => ({ ok: false, status: 404 })), /404/);
  const lastet = await last('test', async () => ({ ok: true, arrayBuffer: async () => data }));
  assert.deepEqual(lastet.rute(a, c).lenker, [0, 1]);
  if (!process.argv[2]) return;
  const ekte = les(fs.readFileSync(process.argv[2]));
  // Faktiske noder på E6 i Oslo (sekvens 625213) og sør for Trondheim (3112188).
  // Bruk hovedvegen: et rent EV6-utvalg mangler lokalvegene rundt avkjøringsramper.
  const oslo = [266140, 6650261], trondheim = [266980, 7030419];
  const t = performance.now();
  const r = ekte.rute(oslo, trondheim, { maksAvstand: 30, tillat: e => e.vegkategori === 'E' && e.vegnummer === 6 });
  const ms = performance.now() - t;
  assert(r, 'Sammenhengende Oslo–Trondheim langs E6');
  assert(r.meter > 400000 && r.meter < 650000, 'Rimelig reiselengde');
  assert(ms < 1000, 'Rutesøk under 1 sekund');
  const bruer = new Map();
  for (const e of r.lenker) for (const [type, id] of ekte.infraPåLenke(e)) if (type === 60) bruer.set(e, id);
  const bru = r.lenker.find(e => bruer.has(e));
  assert.notEqual(bru, undefined, 'Ruten må krysse en ekte NVDB-bru');
  const brulenker = ekte.infraLenker(60, bruer.get(bru));
  brulenker.forEach(e => ekte.sperr(e));
  const om = ekte.rute(oslo, trondheim, { maksAvstand: 30, tillat: e => e.vegkategori === 'E' && e.vegnummer === 6 });
  assert(!om || !om.lenker.some(e => brulenker.includes(e)));
  brulenker.forEach(e => ekte.åpne(e)); assert(ekte.rute(oslo, trondheim, { maksAvstand: 30 }));
  console.log(`ok – ekte E6 Oslo–Trondheim: ${(r.meter / 1000).toFixed(1)} km, ${ms.toFixed(1)} ms, ${r.lenker.length} lenker; sperret bru: ${om ? 'omkjøring' : 'ingen veg'}`);
}
sjekk().catch(e => { console.error(e); process.exitCode = 1; });
