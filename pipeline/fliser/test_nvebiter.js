// Test av bitene for hele Norge i visningen (site/dovre-fliser/spill/nvebiter.js): hvilke blokker et område trenger, at bitene
// hentes bare én gang, og reserven når releasen ikke svarer. Uten nett (fetch byttes ut). Bruk: node pipeline/fliser/test_nvebiter.js
// Med NVE_UT=<mappe fra nve.py> leses også de ekte bitene for Dombås og Bergen gjennom Bekker.les og kraft-koden.
const fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', '..', 'site', 'dovre-fliser', 'spill');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const man = { x0: -200000, y0: 9300000, span: 32768 };

(async () => {
  // NveBiter med en falsk fetch: manifestet og bitene fra minnet, teller forespørslene
  const lagNve = (tag, svar) => {
    const kall = []; globalThis.fetch = async url => { kall.push(url); const s = svar(url); return s == null ? { ok: false, status: 404 } : { ok: true, json: async () => JSON.parse(s), text: async () => s }; };
    delete require.cache[require.resolve(path.join(F, 'nvebiter.js'))];
    const src = fs.readFileSync(path.join(F, 'nvebiter.js'), 'utf8').replace(/const NVE_TAG = '[^']*';/, `const NVE_TAG = '${tag}';`);
    const m = { exports: {} }; new Function('module', 'globalThis', 'window', src)(m, globalThis, undefined); return { N: m.exports, kall };
  };
  const { N } = lagNve('kart-nve-ingen', () => null);
  // blokker
  const b = N.blokker(man, [193300, 6896300, 193400, 6896400]);
  ok(b.length === 1 && b[0] === '12,73', 'Dombås: én blokk 12,73 (' + b + ')');
  ok(N.blokker(man, [193300 - 4000, 6896300 - 4000, 193300 + 4000, 6896300 + 4000]).length === 2, '8 km rundt Dombås: to blokker (kanten ved x 193 216)');
  ok(N.blokker(man, [0, 6000000, 2e6, 8e6]).length === 0, 'urimelig stort område: ingen (hentes ikke)');

  // releasen: manifest + biter
  const bit = JSON.stringify({ x0: 193216, y0: 6875168, linjer: [[0, 2, -1, 10, 20, 5, 0]], navn: [] });
  const M = { versjon: 'kart-nve-abcdefabcdef', z: 7, ...man, bekker: { '12,73': [[0, 0], [0, 0], [0, bit.length]] } };
  const r = lagNve('kart-nve-abcdefabcdef', url => (url.includes('manifest') ? JSON.stringify(M) : url.includes('/bekker.json/0/' + bit.length) ? bit : null));
  let lastet = 0; const L = r.N.lag('bekker', '/reserve.json', d => d, () => lastet++);
  const a1 = await L.hent([193300, 6896300, 193400, 6896400], [0, 1, 2]), a2 = await L.hent([193300, 6896300, 193400, 6896400], [2]);
  ok(a1.length === 1 && a1[0].linjer.length === 1 && L.STAT.kilde === 'release', 'releasen: biten hentes (tomme nivåer hoppes over)');
  ok(a2[0] === a1[0] && r.kall.filter(u => u.includes('bekker.json')).length === 1, 'releasen: samme bit hentes bare én gang');
  ok(L.har([193300, 6896300, 193400, 6896400], [2]).length === 1 && lastet >= 1, 'har(): lastet bit finnes straks, påLastet kalt');
  ok(!r.kall.some(u => u.includes('reserve')), 'releasen: reserven hentes ikke');

  // releasen svarer ikke: reserven brukes
  const r2 = lagNve('kart-nve-abcdefabcdef', url => (url.includes('reserve') ? '{"linjer":[1,2,3]}' : null));
  const L2 = r2.N.lag('bekker', '/reserve.json', d => d);
  const a3 = await L2.hent([193300, 6896300, 193400, 6896400], [0]);
  ok(a3.length === 1 && a3[0].linjer.length === 3 && L2.STAT.kilde === 'reserve', 'uten release: reservefila');

  // ekte biter (valgfritt)
  const ut = process.env.NVE_UT;
  if (ut) {
    const Bekker = require(path.join(F, 'bekker.js')), K = require(path.join(F, 'kraft.js'));
    const mf = JSON.parse(fs.readFileSync(path.join(ut, 'manifest.json'))), data = { bekker: fs.readFileSync(path.join(ut, 'bekker.json')), kraft: fs.readFileSync(path.join(ut, 'kraft.json')) };
    const r3 = lagNve(mf.versjon, url => { if (url.includes('manifest')) return JSON.stringify(mf); const m = url.match(/\/(bekker|kraft)\.json\/(\d+)\/(\d+)$/); return m ? data[m[1]].subarray(+m[2], +m[2] + +m[3]).toString() : null; });
    for (const [navn, x, y] of [['Dombås', 193300, 6896300], ['Voss', 31332, 6752026], ['Sogndal', 76525, 6813945], ['Trondheim (Byåsen)', 267847, 7038587], ['Oslo (Grorud)', 270018, 6654119]]) {
      const bb = [x - 4000, y - 4000, x + 4000, y + 4000];
      const B = await r3.N.lag('bekker', '/x', d => Bekker.les(d)).hent(bb, [0, 1, 2]), l = B.flatMap(b => Bekker.i(b, bb));
      const kraftLes = d => ({ linjer: d.linjer.map(l => { const m = l.m.slice(); m[0] += d.x0; m[1] += d.y0; for (let i = 2; i < m.length; i++) m[i] += m[i - 2]; return { ...l, m }; }) });
      const KB = await r3.N.lag('kraft', '/x', kraftLes).hent(bb, [0, 1]), u = K.utsnitt(KB.flatMap(b => b.linjer), x, y, 4000, () => 0);
      ok(l.length > 5 && u.master.length > 5, `${navn}: ${l.length} bekker/elver og ${u.master.length} master (${u.spenn.length} spenn) innen 4 km`);
    }
  }
  console.log(feil ? feil + ' feil' : 'alle bitetester ok'); process.exit(feil ? 1 : 0);
})();
